import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { type SearchAgentStateType, deepMergeFilters } from "./state";
import {
  SearchFiltersSchema,
  loadValidNeighborhoods,
  validateNeighborhoods,
  validateAmenities,
  validateTags,
  findSimilarNeighborhoods,
} from "./schemas";
import { parseClaudeResultsToPrismaSQL, type ClaudeResponse } from "../claudeQueryParser";
import { tagCategories } from "../tagUtils";
import prisma from "../prisma";
import type { Property } from "../definitions";
import { propertyString } from "../definitions";

// Use Haiku 4.5 for faster, cheaper filter extraction
const MODEL_ID = "claude-haiku-4-5-20251001";

// Retry configuration for transient API errors
const LLM_MAX_RETRIES = 3;
const LLM_RETRY_BASE_DELAY_MS = 1000;


// Create the LLM instance
const llm = new ChatAnthropic({
  modelName: MODEL_ID,
  temperature: 0,
  maxTokens: 4096,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Call LLM with retry logic for transient errors (429, 529, network issues)
 */
async function invokeLLMWithRetry<T>(
  llmInstance: typeof llmWithTools,
  messages: Array<{ role: string; content: string }>,
  maxRetries: number = LLM_MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await llmInstance.invoke(messages) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a retryable error
      const isRetryable =
        (error as { status?: number })?.status === 529 || // Claude overloaded
        (error as { status?: number })?.status === 429 || // Rate limited
        (error as { code?: string })?.code === "ECONNRESET" ||
        (error as { code?: string })?.code === "ETIMEDOUT";

      if (isRetryable && attempt < maxRetries - 1) {
        const delay = LLM_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`[invokeLLMWithRetry] Attempt ${attempt + 1} failed with retryable error, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error or last attempt
      throw error;
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError || new Error("Unknown error in LLM retry");
}

// Generate tag list from categories
function getTagList(): Record<string, string[]> {
  return Object.entries(tagCategories).reduce((result, [category, tags]) => {
    result[category] = tags.map((tag) => tag.name);
    return result;
  }, {} as Record<string, string[]>);
}

// Tool definition for search filter extraction
const searchFiltersTool = tool(
  async (input) => {
    // The tool just returns the input - LangGraph handles the actual processing
    return JSON.stringify(input);
  },
  {
    name: "extract_search_filters",
    description: `Extract search filters from a natural language property search query.

The filters should match properties in an NYC real estate database. Only include filters that are explicitly mentioned or strongly implied by the query.

CRITICAL RULES:
1. For neighborhoods, only use neighborhoods from the provided NEIGHBORHOODS list
2. For tags, only use tags from the provided TAG_LIST
3. For range fields (price, bedrooms, bathrooms, sqft), use min/max objects
4. If a value isn't specified, omit the field entirely
5. Be conservative - don't add filters the user didn't ask for`,
    schema: z.object({
      price: z
        .object({
          min: z.number().nullable().optional().describe("Minimum price"),
          max: z.number().nullable().optional().describe("Maximum price"),
        })
        .optional()
        .describe("Price range filter"),
      bedrooms: z
        .object({
          min: z.number().nullable().optional().describe("Minimum bedrooms"),
          max: z.number().nullable().optional().describe("Maximum bedrooms"),
        })
        .optional()
        .describe("Bedroom count filter"),
      bathrooms: z
        .object({
          min: z.number().nullable().optional().describe("Minimum bathrooms"),
          max: z.number().nullable().optional().describe("Maximum bathrooms"),
        })
        .optional()
        .describe("Bathroom count filter"),
      property_type: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Property type: condo, rental, townhouse, house, coop, multi-family, condop"),
      neighborhood: z
        .array(z.string())
        .optional()
        .describe("Neighborhoods to search in"),
      borough: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Borough: manhattan, brooklyn, queens, bronx, staten island"),
      zipcode: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("ZIP codes to search"),
      tag_list: z
        .array(z.string())
        .optional()
        .describe("Property tags like 'luxury', 'pet-friendly', 'renovated'"),
      amenities: z
        .array(z.string())
        .optional()
        .describe("Amenities like 'gym', 'pool', 'doorman'"),
      no_fee: z.boolean().optional().describe("True for no broker fee properties"),
      sqft: z
        .object({
          min: z.number().nullable().optional(),
          max: z.number().nullable().optional(),
        })
        .optional()
        .describe("Square footage range"),
    }),
  }
);

// Bind the tool to the LLM
const llmWithTools = llm.bindTools([searchFiltersTool], {
  tool_choice: { type: "tool", name: "extract_search_filters" },
});

/**
 * Parse query node - extracts search filters from natural language
 */
export async function parseQueryNode(
  state: SearchAgentStateType
): Promise<Partial<SearchAgentStateType>> {
  // Load neighborhoods for context
  await loadValidNeighborhoods();
  const neighborhoods = await prisma.neighborhoods_enhanced_view.findMany({
    select: { name: true },
    where: { level: { in: [3, 4, 5] } },
  });

  const tagList = getTagList();

  // Build system prompt with dynamic context
  const systemPrompt = `You are a system that extracts search filters from natural language NYC apartment search queries.

DATABASE SCHEMA:
${propertyString}

AVAILABLE NEIGHBORHOODS:
${JSON.stringify(neighborhoods.map((n) => n.name), null, 2)}

AVAILABLE TAGS:
${JSON.stringify(tagList, null, 2)}

CRITICAL RULES:
1. Only use neighborhoods from the list above
2. Only use tags from the list above
3. For numeric ranges, use min/max objects (e.g., {"min": 2, "max": 2} for exactly 2)
4. Be conservative - don't add filters the user didn't explicitly request
5. If this is a modification request (e.g., "change the max price"), update only the mentioned field`;

  // Get the last user message
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  const userQuery = typeof lastMessage.content === "string" ? lastMessage.content : "";

  // If there was a validation error, include it for retry
  let queryPrompt = userQuery;
  if (state.validationError) {
    queryPrompt = `Previous attempt failed with error: ${state.validationError}

Please fix the issue and try again. Original query: ${userQuery}`;
  }

  // Include current filters in the context for modification requests
  const hasExistingFilters = Object.keys(state.searchFilters).length > 0;
  let contextMessage = "";
  if (hasExistingFilters) {
    contextMessage = `IMPORTANT: The user has an active search with these filters:
${JSON.stringify(state.searchFilters, null, 2)}

They are asking to MODIFY this search. You MUST:
1. Return ONLY the fields they want to change
2. DO NOT return unchanged fields - they will be preserved automatically by the system
3. For example, if they say "change max price to 5000", return only: {"price": {"max": 5000}}
4. If they ask for a completely new search (e.g., "search for studios in Brooklyn"), return the full new filter set`;
  }

  try {
    // Use retry wrapper for transient API errors (429, 529, network issues)
    const response = await invokeLLMWithRetry<Awaited<ReturnType<typeof llmWithTools.invoke>>>(
      llmWithTools,
      [
        { role: "system", content: systemPrompt },
        ...(contextMessage ? [{ role: "user", content: contextMessage }] : []),
        { role: "user", content: queryPrompt },
      ]
    );

    // Extract the tool call from the response
    const toolCalls = response.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return {
        validationError: "Failed to extract search filters from query",
        responseMessage: "I couldn't understand that search query. Could you try rephrasing it?",
      };
    }

    const filterArgs = toolCalls[0].args as ClaudeResponse;

    console.log(`[parseQueryNode] AI extracted filters:`, JSON.stringify(filterArgs, null, 2));

    // Manually merge AI output with existing filters (from client's existingFilters)
    // This is done here instead of in the reducer so that filter removals work correctly
    const mergedFilters = deepMergeFilters(state.searchFilters, filterArgs);

    console.log(`[parseQueryNode] Merged filters:`, JSON.stringify(mergedFilters, null, 2));

    return {
      searchFilters: mergedFilters,
      validationError: null,
    };
  } catch (error) {
    console.error("[parseQueryNode] Error:", error);
    return {
      validationError: `Error parsing query: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate filters node - checks filter values before DB query
 */
export async function validateFiltersNode(
  state: SearchAgentStateType
): Promise<Partial<SearchAgentStateType>> {
  const filters = state.searchFilters;

  console.log(`[validateFiltersNode] Input state.searchFilters:`, JSON.stringify(filters, null, 2));

  // Track if we need to update tag_list after stripping invalid tags
  let strippedTagList: string[] | null = null;

  // Helper to return validation error with incremented retry count
  const validationError = (message: string) => ({
    validationError: message,
    retryCount: state.retryCount + 1,
  });

  // 1. Zod schema validation
  const zodResult = SearchFiltersSchema.safeParse(filters);
  if (!zodResult.success) {
    const errorMessages = zodResult.error.issues.map((i) => i.message).join("; ");
    return validationError(`Invalid filter format: ${errorMessages}`);
  }

  // 2. Validate neighborhoods exist in DB
  if (filters.neighborhood && filters.neighborhood.length > 0) {
    const neighborhoodValidation = await validateNeighborhoods(filters.neighborhood as string[]);

    if (neighborhoodValidation.invalid.length > 0) {
      const invalid = neighborhoodValidation.invalid;
      const suggestions = findSimilarNeighborhoods(invalid);
      const suggestionText =
        suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}?` : "";

      return validationError(`Unknown neighborhoods: ${invalid.join(", ")}.${suggestionText}`);
    }
  }

  // 3. Validate amenities
  if (filters.amenities && filters.amenities.length > 0) {
    const amenityValidation = validateAmenities(filters.amenities as string[]);
    const invalid = amenityValidation.invalid;
    if (invalid.length > 0) {
      return validationError(`Unknown amenities: ${invalid.join(", ")}. Check available amenities in the database schema.`);
    }
  }

  // 4. Validate tags - strip invalid ones immediately (don't retry)
  if (filters.tag_list && filters.tag_list.length > 0) {
    const tagValidation = validateTags(filters.tag_list as string[]);
    if (tagValidation.invalid.length > 0) {
      console.log(`[validateFiltersNode] Stripping invalid tags: ${tagValidation.invalid.join(", ")}`);
      // Track the stripped tags but DON'T return early - let rest of validation run
      strippedTagList = tagValidation.valid;
    }
  }

  // 5. Sanity checks on ranges
  const price = filters.price as { min?: number | null; max?: number | null } | undefined;
  if (price?.min != null && price?.max != null && price.min > price.max) {
    return validationError(`Price min ($${price.min}) cannot exceed max ($${price.max})`);
  }

  const bedrooms = filters.bedrooms as { min?: number | null; max?: number | null } | undefined;
  if (bedrooms?.min != null && bedrooms?.max != null && bedrooms.min > bedrooms.max) {
    return validationError(`Bedrooms min (${bedrooms.min}) cannot exceed max (${bedrooms.max})`);
  }

  // Validation passed - reset retry count
  // Build the final searchFilters, applying any tag stripping
  const finalSearchFilters = strippedTagList !== null
    ? { ...filters, tag_list: strippedTagList }
    : filters;

  console.log(`[validateFiltersNode] Returning finalSearchFilters:`, JSON.stringify(finalSearchFilters, null, 2));

  return {
    validationError: null,
    retryCount: 0,
    searchFilters: finalSearchFilters,
  };
}

/**
 * Execute search node - runs Prisma query with accumulated filters
 */
export async function executeSearchNode(
  state: SearchAgentStateType
): Promise<Partial<SearchAgentStateType>> {
  const filters = state.searchFilters;

  try {
    // Use existing parseClaudeResultsToPrismaSQL function
    const [query] = await parseClaudeResultsToPrismaSQL(filters, undefined, 20, 0);

    // Execute the query
    type RawProperty = {
      price?: { toNumber: () => number };
      bathrooms?: { toNumber: () => number };
      latitude?: unknown;
      longitude?: unknown;
      listed_at?: { toDateString: () => string };
      closed_at?: { toDateString: () => string };
      available_from?: { toDateString: () => string };
      loaded_datetime?: { toDateString: () => string };
      date?: { toDateString: () => string };
      brokers_fee?: { toNumber: () => number };
      tag_list?: string[];
      additional_fees?: unknown;
    };

    const rawResults = await prisma.$queryRaw<RawProperty[]>(query);

    // Format the results
    const results = rawResults.map((property) => ({
      ...property,
      price: property.price ? property.price.toNumber() : 0,
      bathrooms: property.bathrooms ? property.bathrooms.toNumber() : null,
      latitude: property.latitude ? String(property.latitude) : "0",
      longitude: property.longitude ? String(property.longitude) : "0",
      listed_at: property.listed_at ? property.listed_at.toDateString() : "",
      closed_at: property.closed_at ? property.closed_at.toDateString() : "",
      available_from: property.available_from ? property.available_from.toDateString() : "",
      loaded_datetime: property.loaded_datetime ? property.loaded_datetime.toDateString() : "",
      date: property.date ? property.date.toDateString() : "",
      brokers_fee: property.brokers_fee ? property.brokers_fee.toNumber() : null,
      tag_list: property.tag_list ?? [],
      additional_fees: property.additional_fees ?? null,
    })) as Property[];

    return {
      results,
      resultCount: results.length,
    };
  } catch (error) {
    console.error("[executeSearchNode] Error:", error);
    return {
      results: [],
      resultCount: 0,
      responseMessage: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Format response node - generates natural language response
 */
export async function formatResponseNode(
  state: SearchAgentStateType
): Promise<Partial<SearchAgentStateType>> {
  const { resultCount, searchFilters } = state;

  // Build a human-readable description of the filters
  const filterParts: string[] = [];

  const price = searchFilters.price as { min?: number | null; max?: number | null } | undefined;
  if (price?.min || price?.max) {
    if (price.min && price.max) {
      filterParts.push(`$${price.min.toLocaleString()} - $${price.max.toLocaleString()}`);
    } else if (price.max) {
      filterParts.push(`under $${price.max.toLocaleString()}`);
    } else if (price.min) {
      filterParts.push(`over $${price.min.toLocaleString()}`);
    }
  }

  const bedrooms = searchFilters.bedrooms as { min?: number | null; max?: number | null } | undefined;
  if (bedrooms?.min || bedrooms?.max) {
    if (bedrooms.min === bedrooms.max && bedrooms.min) {
      filterParts.push(`${bedrooms.min} bedroom${bedrooms.min !== 1 ? "s" : ""}`);
    } else if (bedrooms.min && bedrooms.max) {
      filterParts.push(`${bedrooms.min}-${bedrooms.max} bedrooms`);
    } else if (bedrooms.min) {
      filterParts.push(`${bedrooms.min}+ bedrooms`);
    }
  }

  const neighborhoods = searchFilters.neighborhood as string[] | undefined;
  if (neighborhoods?.length) {
    if (neighborhoods.length <= 2) {
      filterParts.push(`in ${neighborhoods.join(" or ")}`);
    } else {
      filterParts.push(`in ${neighborhoods.length} neighborhoods`);
    }
  }

  if (searchFilters.no_fee) {
    filterParts.push("no broker fee");
  }

  const tags = searchFilters.tag_list as string[] | undefined;
  if (tags?.length) {
    filterParts.push(tags.slice(0, 2).join(", "));
  }

  // Generate the response
  let message: string;
  if (resultCount === 0) {
    message = "No apartments found matching your criteria. Try broadening your search.";
  } else if (resultCount === 1) {
    message = filterParts.length > 0
      ? `Found 1 apartment ${filterParts.join(", ")}.`
      : "Found 1 apartment matching your search.";
  } else {
    message = filterParts.length > 0
      ? `Found ${resultCount} apartments ${filterParts.join(", ")}.`
      : `Found ${resultCount} apartments matching your search.`;
  }

  return {
    responseMessage: message,
    messages: [new AIMessage(message)],
  };
}

/**
 * Routing function for conditional edges
 */
export function routeAfterValidation(
  state: SearchAgentStateType
): "retry" | "continue" {
  return state.validationError ? "retry" : "continue";
}
