import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { type SearchAgentStateType, deepMergeFilters } from "./state";
import {
  SearchFiltersSchema,
  loadValidNeighborhoods,
  validateNeighborhoods,
  validateBoroughs,
  findSimilarBoroughs,
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
5. Be conservative - don't add filters the user didn't ask for
6. To REMOVE a filter (e.g., "remove the price filter"), set it to null`,
    schema: z.object({
      price: z
        .object({
          min: z.number().nullable().optional().describe("Minimum price"),
          max: z.number().nullable().optional().describe("Maximum price"),
        })
        .nullable()
        .optional()
        .describe("Price range filter. Set to null to remove."),
      bedrooms: z
        .object({
          min: z.number().nullable().optional().describe("Minimum bedrooms (0 = studio)"),
          max: z.number().nullable().optional().describe("Maximum bedrooms (0 = studio)"),
        })
        .nullable()
        .optional()
        .describe("Bedroom count filter. Use min:0, max:0 for studios. Set to null to remove."),
      bathrooms: z
        .object({
          min: z.number().nullable().optional().describe("Minimum bathrooms"),
          max: z.number().nullable().optional().describe("Maximum bathrooms"),
        })
        .nullable()
        .optional()
        .describe("Bathroom count filter. Set to null to remove."),
      property_type: z
        .union([z.string(), z.array(z.string())])
        .nullable()
        .optional()
        .describe("Property type: condo, rental, townhouse, house, coop, multi-family, condop. Set to null to remove."),
      neighborhood: z
        .array(z.string())
        .nullable()
        .optional()
        .describe("Neighborhoods to search in. Set to null to remove."),
      borough: z
        .union([z.string(), z.array(z.string())])
        .nullable()
        .optional()
        .describe("Borough: manhattan, brooklyn, queens, bronx, staten island. Set to null to remove."),
      zipcode: z
        .union([z.string(), z.array(z.string())])
        .nullable()
        .optional()
        .describe("ZIP codes to search. Set to null to remove."),
      tag_list: z
        .array(z.string())
        .nullable()
        .optional()
        .describe("Property tags like 'luxury', 'pet-friendly', 'renovated'. Set to null to remove."),
      amenities: z
        .array(z.string())
        .nullable()
        .optional()
        .describe("Amenities like 'gym', 'pool', 'doorman'. Set to null to remove."),
      no_fee: z.boolean().nullable().optional().describe("True for no broker fee properties. Set to null to remove."),
      sqft: z
        .object({
          min: z.number().nullable().optional(),
          max: z.number().nullable().optional(),
        })
        .nullable()
        .optional()
        .describe("Square footage range. Set to null to remove."),
      days_on_market: z
        .object({
          min: z.number().nullable().optional().describe("Minimum days on market"),
          max: z.number().nullable().optional().describe("Maximum days on market"),
        })
        .nullable()
        .optional()
        .describe("How long the property has been listed. E.g., 'listed in the last 7 days' → max: 7. Set to null to remove."),
      built_in: z
        .object({
          min: z.number().nullable().optional().describe("Earliest year built"),
          max: z.number().nullable().optional().describe("Latest year built"),
        })
        .nullable()
        .optional()
        .describe("Year the building was constructed. E.g., 'before 1940' → max: 1940. Set to null to remove."),
      brokers_fee: z
        .object({
          min: z.number().nullable().optional().describe("Minimum broker fee percentage"),
          max: z.number().nullable().optional().describe("Maximum broker fee percentage"),
        })
        .nullable()
        .optional()
        .describe("Broker fee percentage range. Set to null to remove."),
    }),
  }
);

// Tool definition for conversational responses (non-search messages)
const conversationalTool = tool(
  async (input) => JSON.stringify(input),
  {
    name: "respond_conversationally",
    description:
      "Respond to the user conversationally when they are NOT searching for properties. " +
      "Use this for greetings, general questions, recommendations without specific criteria, " +
      "questions about the system, or anything unrelated to property searching.",
    schema: z.object({
      message: z.string().describe("Your response to the user"),
      suggested_queries: z
        .array(z.string())
        .optional()
        .describe("2-3 suggested search queries the user could try"),
    }),
  }
);

// Bind both tools to the LLM with auto tool choice for intent classification
const llmWithTools = llm.bindTools(
  [searchFiltersTool, conversationalTool],
  { tool_choice: "auto" }
);

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
  const systemPrompt = `You are an AI assistant for an NYC apartment search platform. You have two tools available and must pick the right one based on the user's intent.

TOOL SELECTION RULES:
- Use extract_search_filters when the user is:
  * Searching for properties ("2br in Chelsea", "studios under $3000")
  * Modifying an active search ("change max price to $5000", "add Brooklyn")
  * Using property-related filters (price, bedrooms, neighborhoods, tags, amenities)

- Use respond_conversationally when the user is:
  * Making conversation ("thanks!", "hello", "goodbye")
  * Asking general questions ("what's Chelsea like?", "what neighborhoods are good for families?")
  * Asking for recommendations without specific criteria ("what would you recommend?")
  * Asking about the system ("how does this work?", "what can you do?")
  * Saying something unrelated to property searching

When using respond_conversationally, if the user seems interested in finding properties but hasn't given specific criteria, include 2-3 suggested_queries they could try.

EXAMPLES:
- "2 beds in Chelsea under $4000" → extract_search_filters
- "change max price to $5000" → extract_search_filters
- "what would you recommend?" → respond_conversationally (include suggested_queries)
- "thanks!" → respond_conversationally

DATABASE SCHEMA:
${propertyString}

AVAILABLE NEIGHBORHOODS:
${JSON.stringify(neighborhoods.map((n) => n.name), null, 2)}

AVAILABLE TAGS:
${JSON.stringify(tagList, null, 2)}

FILTER EXTRACTION RULES (when using extract_search_filters):
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

They may be MODIFYING this search or starting a COMPLETELY NEW search. You MUST:
1. For MODIFICATIONS: Return ONLY the fields they want to change. Unchanged fields are preserved automatically.
   Example: "change max price to 5000" → {"price": {"max": 5000}}
2. To REMOVE a filter: Set it to null.
   Example: "remove the price filter" → {"price": null}
3. For a COMPLETELY NEW search (e.g., "search for studios in Brooklyn" or "something completely different"):
   Return ALL fields for the new search AND set removed filters to null.
   Example: If old filters have price and neighborhood, but new search is just "studios in Queens":
   → {"bedrooms": {"min": 0, "max": 0}, "borough": "queens", "price": null, "neighborhood": null}`;
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

    // Case 1: No tool calls — treat as conversational (fallback)
    if (!toolCalls || toolCalls.length === 0) {
      const textContent =
        typeof response.content === "string"
          ? response.content
          : "I'm here to help you find apartments in NYC. Try a search like '2br in Chelsea under $4000'.";
      console.log(`[parseQueryNode] No tool call, falling back to conversational`);
      return {
        intent: "conversational" as const,
        responseMessage: textContent,
        suggestedQueries: [],
      };
    }

    const toolCall = toolCalls[0];

    // Case 2: Conversational tool called
    if (toolCall.name === "respond_conversationally") {
      const args = toolCall.args as {
        message: string;
        suggested_queries?: string[];
      };
      console.log(`[parseQueryNode] Conversational response:`, args.message);
      return {
        intent: "conversational" as const,
        responseMessage: args.message,
        suggestedQueries: args.suggested_queries || [],
      };
    }

    // Case 3: Search filter tool called (existing behavior)
    const filterArgs = toolCall.args as ClaudeResponse;

    console.log(
      `[parseQueryNode] AI extracted filters:`,
      JSON.stringify(filterArgs, null, 2)
    );

    // Manually merge AI output with existing filters (from client's existingFilters)
    // This is done here instead of in the reducer so that filter removals work correctly
    const mergedFilters = deepMergeFilters(state.searchFilters, filterArgs);

    console.log(
      `[parseQueryNode] Merged filters:`,
      JSON.stringify(mergedFilters, null, 2)
    );

    return {
      intent: "search" as const,
      searchFilters: mergedFilters,
      suggestedQueries: [],
      validationError: null,
      retryCount: 0,
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

  // 2. Validate boroughs
  if (filters.borough) {
    const boroughList = Array.isArray(filters.borough)
      ? filters.borough as string[]
      : [filters.borough as string];
    const boroughValidation = validateBoroughs(boroughList);

    if (boroughValidation.invalid.length > 0) {
      const invalid = boroughValidation.invalid;
      const suggestions = findSimilarBoroughs(invalid);
      const suggestionText =
        suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}?` : "";
      return validationError(`Unknown boroughs: ${invalid.join(", ")}.${suggestionText} Valid boroughs are: manhattan, brooklyn, queens, bronx, staten island.`);
    }

    // Normalize borough values (apply alias resolution)
    if (boroughValidation.valid.length === 1 && !Array.isArray(filters.borough)) {
      filters.borough = boroughValidation.valid[0];
    } else {
      filters.borough = boroughValidation.valid;
    }
  }

  // 3. Validate neighborhoods exist in DB
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

  // 4. Validate amenities (with fuzzy matching)
  if (filters.amenities && filters.amenities.length > 0) {
    const amenityValidation = validateAmenities(filters.amenities as string[]);
    if (amenityValidation.invalid.length > 0) {
      return validationError(`Unknown amenities: ${amenityValidation.invalid.join(", ")}. Check available amenities in the database schema.`);
    }
    // Apply normalized amenity names (fuzzy matching may have corrected them)
    filters.amenities = amenityValidation.valid;
  }

  // 5. Validate tags - strip invalid ones immediately (don't retry)
  let allTagsStripped = false;
  if (filters.tag_list && filters.tag_list.length > 0) {
    const tagValidation = validateTags(filters.tag_list as string[]);
    if (tagValidation.invalid.length > 0) {
      console.log(`[validateFiltersNode] Stripping invalid tags: ${tagValidation.invalid.join(", ")}`);
      strippedTagList = tagValidation.valid;
      if (tagValidation.valid.length === 0) {
        allTagsStripped = true;
        console.log(`[validateFiltersNode] All tags were invalid and stripped`);
      }
    }
  }

  // 6. Sanity checks on ranges
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

  // Build validation warning if tags were stripped
  let validationWarning: string | null = null;
  if (allTagsStripped) {
    validationWarning = "None of the requested tags matched our database, so the tag filter was removed. Results are shown without tag filtering.";
  }

  console.log(`[validateFiltersNode] Returning finalSearchFilters:`, JSON.stringify(finalSearchFilters, null, 2));

  return {
    validationError: null,
    retryCount: 0,
    searchFilters: finalSearchFilters,
    validationWarning,
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
    // Also get total count (without LIMIT) for accurate reporting
    const [countQuery] = await parseClaudeResultsToPrismaSQL(filters, undefined, undefined, undefined);

    // Execute both queries in parallel
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

    const [rawResults, countResults] = await Promise.all([
      prisma.$queryRaw<RawProperty[]>(query),
      prisma.$queryRaw<RawProperty[]>(countQuery).then(r => r.length),
    ]);

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
      resultCount: countResults as number,
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
  const { resultCount, searchFilters, validationWarning } = state;

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
  if (bedrooms?.min != null || bedrooms?.max != null) {
    if (bedrooms!.min != null && bedrooms!.min === bedrooms!.max) {
      if (bedrooms!.min === 0) {
        filterParts.push("studios");
      } else {
        filterParts.push(`${bedrooms!.min} bedroom${bedrooms!.min !== 1 ? "s" : ""}`);
      }
    } else if (bedrooms!.min != null && bedrooms!.max != null) {
      filterParts.push(`${bedrooms!.min}-${bedrooms!.max} bedrooms`);
    } else if (bedrooms!.min != null) {
      filterParts.push(`${bedrooms!.min}+ bedrooms`);
    } else if (bedrooms!.max != null) {
      filterParts.push(`up to ${bedrooms!.max} bedrooms`);
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

  const borough = searchFilters.borough as string | string[] | undefined;
  if (borough) {
    const boroughList = Array.isArray(borough) ? borough : [borough];
    if (boroughList.length <= 2) {
      filterParts.push(`in ${boroughList.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(" or ")}`);
    } else {
      filterParts.push(`in ${boroughList.length} boroughs`);
    }
  }

  if (searchFilters.no_fee) {
    filterParts.push("no broker fee");
  }

  const amenities = searchFilters.amenities as string[] | undefined;
  if (amenities?.length) {
    const displayAmenities = amenities.slice(0, 2).map(a => a.replace(/_/g, " "));
    filterParts.push(`with ${displayAmenities.join(" and ")}`);
  }

  const tags = searchFilters.tag_list as string[] | undefined;
  if (tags?.length) {
    // Convert tag slugs to human-readable display names
    const tagDisplayMap = new Map<string, string>();
    for (const category of Object.values(tagCategories)) {
      for (const tag of category) {
        // Strip emoji from display name for response text
        tagDisplayMap.set(tag.name, tag.display.replace(/\s*[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/gu, "").trim());
      }
    }
    const displayTags = tags.slice(0, 3).map(t => tagDisplayMap.get(t) || t);
    filterParts.push(`tagged ${displayTags.join(", ")}`);
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

  // Append validation warning if present
  if (validationWarning) {
    message += ` Note: ${validationWarning}`;
  }

  return {
    responseMessage: message,
    messages: [new AIMessage(message)],
  };
}

/**
 * Routing function for conditional edges after validation
 */
export function routeAfterValidation(
  state: SearchAgentStateType
): "retry" | "continue" {
  return state.validationError ? "retry" : "continue";
}

/**
 * Routing function for conditional edges after parsing
 * Routes conversational messages to __end__, search messages to validation
 */
export function routeAfterParsing(
  state: SearchAgentStateType
): "search" | "conversational" {
  return state.intent === "conversational" ? "conversational" : "search";
}
