// Import your database client/ORM here, e.g. Prisma
import { Prisma } from '@prisma/client';
import prisma from './prisma'; // Import the serverless-friendly Prisma client
import { Property, CombinedPropertyDetails, propertyString, Neighborhood, PropertyAnalyticsDetails, PropertyNearestStations, PropertyNearestPois, NeighborhoodContext } from './definitions';
import { tagCategories } from './tagUtils';
import { type RawProperty, formatRawProperty } from './searchUtils';
import { prompts } from './promptConfig';
import Anthropic from "@anthropic-ai/sdk";
// Import the parser properly using ES module syntax
import { parseClaudeResultsToPrismaSQL } from './claudeQueryParser';
import { ChatHistory } from './definitions';

export async function fetchPropertiesRDS(params: {
  text: string;
  neighborhood?: string;
  minPrice?: string;
  maxPrice?: string;
  brokerFee?: string;
  sort?: string;
  tags?: string;
  chatHistory?: ChatHistory;
}): Promise<[Property[], Record<string, unknown>, ChatHistory]>
{
  const limit = 10;
  const page = 1;
  const skip = (page - 1) * limit;

  // Extract sort from params (other params are for future use)
  const { sort } = params;
  let claudeQuery = Prisma.empty;
  let queryRecord: Record<string, unknown> = {};

  // Get Claude results if text search is provided
  const updatedChatHistory = params.chatHistory ? [...params.chatHistory] : [];
  if (params.text) {
    try {
      // Pass chatHistory to Claude
      const claudeResults = await fetchClaudeSearchResult(params.text, updatedChatHistory)
        .then((results) => {
          // Find the tool_use block in content array (could be at any index)
          const content = results?.content as Array<{ type: string; input?: { database_schema?: string } }> | undefined;
          const toolUseBlock = content?.find(
            (block) => block.type === 'tool_use'
          );
          const dbSchema = toolUseBlock?.input?.database_schema;
          if (typeof dbSchema === 'string') {
            try {
              return JSON.parse(dbSchema);
            } catch {
              return {};
            }
          }

          // Extract the first text message from Claude's response or error
          let messageText = '';
          if (results && typeof results.message === 'string' && results.tool === '{}') {
            // Overload or error case
            messageText = results.message as string;
          } else if (content && Array.isArray(content)) {
            // Find the first text item in the content array
            const textItem = content.find((item) => item.type === 'text') as { type: string; text?: string } | undefined;
            if (textItem && textItem.text) {
              messageText = textItem.text;
            }
          }

          // Append Claude's response to chatHistory with renamed 'tool' and new 'message' field
          updatedChatHistory.push({
            role: "assistant",
            tool: JSON.stringify(dbSchema),
            message: messageText
          });
          return dbSchema ?? {};
        });
      // Define orderBy based on sort parameter
      let orderBy: Record<string, string> | undefined = undefined;
      
      if (sort) {
        switch (sort) {
          case 'newest':
            orderBy = { listed_at: 'desc' };
            break;
          case 'least_expensive':
            orderBy = { price: 'asc' };
            break;
          case 'most_expensive':
            orderBy = { price: 'desc' };
            break;
          default:
            // No sorting
            break;
        }
      }
      
      // Parse claudeResults into Prisma filters - properly await the async function
      [claudeQuery, queryRecord] = await parseClaudeResultsToPrismaSQL(claudeResults, orderBy, limit, skip);

    } catch {
      // Continue with empty whereCondition if Claude search fails
    }
  }

  try {
    // Execute the query if we have one from Claude
    const properties = params.text
      ? await prisma.$queryRaw<RawProperty[]>(claudeQuery)
      : (await prisma.latest_properties_materialized.findMany({
          where: { id: { not: null } },
          take: limit,
          skip: skip,
          orderBy: sort ? {
            [sort === 'newest' ? 'listed_at' : 'price']:
            sort === 'least_expensive' ? 'asc' : 'desc'
          } : undefined
        })) as unknown as RawProperty[];

    const formattedProperties = properties.map(formatRawProperty);

    return [formattedProperties, queryRecord, updatedChatHistory] as [Property[], Record<string, unknown>, ChatHistory];
  } catch (error) {
    throw error;
  }
}


export async function fetchPropertiesRDSById(id: string): Promise<Property> {

  try {
    const property = await prisma.latest_properties_materialized.findFirst({
      where: { fct_id: id },
    }); 

    if (!property) {
      throw new Error(`Property with fct_id ${id} not found.`);
    }

    return formatRawProperty(property as unknown as RawProperty);
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch multiple properties by their fct_id values.
 * Properties that no longer exist are silently omitted.
 */
export async function fetchPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (ids.length === 0) return [];

  const properties = await prisma.latest_properties_materialized.findMany({
    where: { fct_id: { in: ids } },
  });

  return properties.map((p) => formatRawProperty(p as unknown as RawProperty));
}

/**
 * Fetches a single property from the latest_properties_all_details_materialized view,
 * which includes media columns (description, images, videos, floorplans).
 * Used by the listing detail page instead of separate property + details queries.
 */
async function fetchPropertyPageById(id: string): Promise<Property> {
  const property = await prisma.latest_properties_all_details_materialized.findUnique({
    where: { fct_id: id },
  });
  if (!property) {
    throw new Error(`Property with fct_id ${id} not found.`);
  }
  return formatRawProperty(property as unknown as RawProperty);
}

/**
 * Fetches nearest subway station data for a property by its ID
 * @param id - The property's listing ID
 * @returns Array of PropertyNearestStations with subway station information
 */
export async function fetchPropertyNearestStationsById(id: string): Promise<PropertyNearestStations[] | null> {
  try {
    // Fetch all station records for this property
    const stationRecords = await prisma.dim_property_nearest_stations.findMany({
      where: { listing_id: id },
      orderBy: { walking_minutes: 'asc' }, // Order by walking time, closest first
    });

    if (!stationRecords || stationRecords.length === 0) {
      return []; // Return empty array if none found
    }

    // Format the data to match PropertyNearestStations type
    const formattedStations = stationRecords.map(station => ({
      listing_id: station.listing_id,
      route_id: station.route_id,
      walking_minutes: station.walking_minutes.toNumber(),
      route_short_name: station.route_short_name,
      route_color: station.route_color,
      stop_name: station.stop_name,
      peak: station.peak?.toNumber() || null,
      off_peak: station.off_peak?.toNumber() || null,
      late_night: station.late_night?.toNumber() || null,
    }));

    return formattedStations as PropertyNearestStations[];
  } catch {
    return []; // Return empty array on error
  }
}

export async function fetchPropertyNearestPoisById(id: string): Promise<PropertyNearestPois[] | null> {
  try {
    // Use fixed categories
    const categories = ['fitness_center', 'food', 'grocery', 'park'];
    
    // Create an array of promises, one for each category query
    const poiPromises = categories.map(category => 
      prisma.dim_property_nearest_pois.findMany({
        where: { 
          listing_id: id,
          category: category
        },
        orderBy: { distance: 'asc' },
        take: 5
      })
    );

    // Execute all POI queries in parallel
    const resultsByCategory = await Promise.all(poiPromises);

    // Flatten the array of arrays into a single array of POIs
    const allPois = resultsByCategory.flat();
    
    if (allPois.length === 0) {
      return []; // Return empty array if none found
    }

    // Format the data to match PropertyNearestPois type
    const formattedPois = allPois.map((poi) => ({
      listing_id: poi.listing_id,
      name: poi.name,
      longitude: poi.longitude.toNumber(), // Ensure longitude is a number
      latitude: poi.latitude.toNumber(),   // Ensure latitude is a number
      distance: Number(poi.distance),      // Ensure distance is a number
      address: poi.address,
      website: poi.website,
      category: poi.category,
    }));

    return formattedPois as PropertyNearestPois[];
  } catch {
    return []; // Return empty array on error
  }
}

export async function fetchPropertyAnalyticsById(id: string): Promise<PropertyAnalyticsDetails | null> {
  try {
    const analytics = await prisma.dim_property_analytics_view.findFirst({
      where: { fct_id: id },
    });

    if (!analytics) return null;

    // Convert all Decimal fields to plain numbers so they can be passed to Client Components
    const formatted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(analytics)) {
      formatted[key] = value !== null && typeof value === 'object' && 'toNumber' in value
        ? (value as { toNumber(): number }).toNumber()
        : value;
    }
    return formatted as PropertyAnalyticsDetails;
  } catch {
    return null;
  }
}

export async function fetchNeighborhoodContext(neighborhood: string, bedrooms: number): Promise<NeighborhoodContext | null> {
  try {
    type ContextRow = {
      median_price: { toNumber(): number } | number | null;
      avg_days_on_market: { toNumber(): number } | number | null;
      active_listing_count: bigint | number | null;
      avg_days_to_rent: { toNumber(): number } | number | null;
    };

    const result = await prisma.$queryRaw<ContextRow[]>`
      SELECT
        percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
        AVG(days_on_market) AS avg_days_on_market,
        COUNT(*) AS active_listing_count,
        (SELECT AVG(days_on_market)
         FROM real_estate.dim_property_details
         WHERE neighborhood = ${neighborhood} AND bedrooms = ${bedrooms}
         AND status = 'closed' AND closed_at > NOW() - INTERVAL '90 days'
        ) AS avg_days_to_rent
      FROM real_estate.latest_properties_materialized
      WHERE neighborhood = ${neighborhood} AND bedrooms = ${bedrooms}
    `;

    if (!result || result.length === 0) return null;

    const row = result[0];

    const toNum = (val: unknown): number | null => {
      if (val == null) return null;
      if (typeof val === 'object' && val !== null && 'toNumber' in val) {
        return (val as { toNumber(): number }).toNumber();
      }
      if (typeof val === 'bigint') return Number(val);
      return typeof val === 'number' ? val : null;
    };

    return {
      median_price: toNum(row.median_price),
      avg_days_on_market: toNum(row.avg_days_on_market),
      active_listing_count: toNum(row.active_listing_count),
      avg_days_to_rent: toNum(row.avg_days_to_rent),
    };
  } catch {
    return null;
  }
}

export async function fetchPropertyPage(id: string): Promise<CombinedPropertyDetails> {
  try {
    const start = performance.now();

    const [
      property,
      propertyAnalytics,
      nearestStations,
      nearestPois
    ] = await Promise.all([
      fetchPropertyPageById(id).then(r => { console.log(`[fetchPropertyPage] all_details_materialized: ${(performance.now() - start).toFixed(0)}ms`); return r; }),
      fetchPropertyAnalyticsById(id).then(r => { console.log(`[fetchPropertyPage] analytics: ${(performance.now() - start).toFixed(0)}ms`); return r || {}; }),
      fetchPropertyNearestStationsById(id).then(r => { console.log(`[fetchPropertyPage] stations: ${(performance.now() - start).toFixed(0)}ms`); return r || []; }),
      fetchPropertyNearestPoisById(id).then(r => { console.log(`[fetchPropertyPage] pois: ${(performance.now() - start).toFixed(0)}ms`); return r || []; }),
    ]);

    console.log(`[fetchPropertyPage] total: ${(performance.now() - start).toFixed(0)}ms`);

    const propertyCombined = {
      ...property,
      ...(propertyAnalytics as PropertyAnalyticsDetails),
      closest_stations: nearestStations as PropertyNearestStations[],
      nearest_pois: nearestPois as PropertyNearestPois[]
    };

    return propertyCombined as CombinedPropertyDetails;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch page data for listing id ${id}: ${error.message}`);
    }
    throw new Error(`Failed to fetch page data for listing id ${id}: ${String(error)}`);
  }
}

export async function fetchClaudeSearchResult(
  text: string,
  chatHistory: ChatHistory = []
): Promise<Record<string, unknown>> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  const model = "claude-haiku-4-5-20251001";
  const max_tokens = 8192;
  const temperature = 0;

  // Generate the tag list from the tag categories
  const TAG_LIST = JSON.stringify(
    Object.entries(tagCategories).reduce((result, [category, tags]) => {
      result[category] = tags
        // .filter(tag => tag.source.includes('AI'))
        .map(tag => tag.name);
      return result;
    }, {} as Record<string, string[]>), 
    null, 
    2
  );
  
  // Get the database schema
  const DATABASE_SCHEMA = propertyString;

  // Get the neighborhoods
  const NEIGHBORHOODS = await prisma.neighborhoods_enhanced_view.findMany({
    select: { name: true },
    where: { level: { in: [3, 4, 5] } }
  });

  try {
    // Create a deep copy of the tools from the config
    const tools = JSON.parse(JSON.stringify(prompts.searchQueryProcessing.tools));
    
    // Replace placeholders in the tool description
    for (const tool of tools) {
      if (tool.name === 'process_search_query') {
        tool.input_schema.properties.database_schema.description = 
          tool.input_schema.properties.database_schema.description
            .replace('{{DATABASE_SCHEMA}}', DATABASE_SCHEMA)
            .replace('{{TAG_LIST}}', TAG_LIST)
            .replace('{{NEIGHBORHOODS}}', JSON.stringify(NEIGHBORHOODS, null, 2));
      }
    }
    
    // Create a deep copy of the example messages from the config
    const exampleMessages = JSON.parse(JSON.stringify(prompts.searchQueryProcessing.exampleMessages));
    
    // Only include user messages with non-empty message and assistant messages with non-empty, non-'{}' tool
    const historyMessages = chatHistory
      .filter(msg =>
        (msg.role === 'user' && msg.message && msg.message.trim() !== '') ||
        (msg.role === 'assistant' && msg.tool && msg.tool !== '{}' && msg.tool.trim() !== '')
      )
      .map(msg => {
        if (msg.role === 'assistant') {
          return {
            role: 'assistant',
            content: [{ type: "text", text: `Previous tool call:\n\`\`\`json\n${msg.tool}\n\`\`\`` }]
          };
        }
        return {
          role: 'user',
          content: [{ type: "text", text: msg.message }]
        };
      });
    
    // Add the latest user query as the last message
    const messages = [
      ...exampleMessages, // optionally keep examples for grounding
      ...historyMessages, 
      {
        role: "user" as const,
        content: [{ type: "text" as const, text: `Query: ${text}` }]
      }
    ];

    // Use initial prompt only if there is no meaningful assistant tool in chatHistory
    const lastMeaningfulAssistant = [...chatHistory].reverse().find(
      msg => msg.role === 'assistant' && msg.tool && msg.tool !== '{}' && msg.tool.trim() !== ''
    );
    const isInitial = !lastMeaningfulAssistant;
    const systemPrompt = isInitial
      ? prompts.searchQueryProcessing.systemPromptInitial
      : prompts.searchQueryProcessing.systemPromptModification;

    // Make the API call
    const msg = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      system: systemPrompt,
      messages,
      tools
    });

    return msg as unknown as Record<string, unknown>;
  } catch (e: unknown) {
    // Handle Claude overload error (529 or overloaded_error)
    const err = e as { status?: number; error?: { type?: string }; message?: string };
    if (err?.status === 529 || err?.error?.type === 'overloaded_error' || (typeof err?.message === 'string' && err.message.includes('Overloaded'))) {
      return {
        content: [],
        tool: '{}',
        message: 'Claude is overloaded. Please try again later.'
      };
    }
    return {};
  }
}

export async function getAllChildNeighborhoods(parentName: string) {
  const results = await prisma.$queryRaw`
    WITH parent_neighborhood AS (
      SELECT id, name, hierarchy_path
      FROM "real_estate"."neighborhoods_enhanced_view"
      WHERE name = ${parentName}
    )
    
    SELECT child.name
    FROM "real_estate"."neighborhoods_enhanced_view" AS child
    JOIN parent_neighborhood AS parent
      ON child.hierarchy_path LIKE (parent.hierarchy_path || '%')
    ORDER BY child.level, child.name;
  `;
  
  return results;
}

// Fetch neighborhoods from RDS and cache in sessionStorage
export async function getCachedNeighborhoods(): Promise<Neighborhood[]> {
  // Check if neighborhoods are already stored in sessionStorage
  const cachedData = sessionStorage.getItem('neighborhoods');
  
  if (cachedData) {
    // Data exists in sessionStorage, parse and return it
    return JSON.parse(cachedData);
  }
  
  try {
    // Fetch neighborhoods directly from the database
    const neighborhoods = await prisma.neighborhoods_enhanced_view.findMany({
      select: {
        id: true,
        name: true,
        level: true,
        parent_id: true,
        hierarchy_path: true
      },
      orderBy: {
        level: 'asc',
        name: 'asc'
      }
    });
    
    // Store in sessionStorage
    sessionStorage.setItem('neighborhoods', JSON.stringify(neighborhoods));

    return neighborhoods;
  } catch {
    return [] as Neighborhood[];
  }
}
