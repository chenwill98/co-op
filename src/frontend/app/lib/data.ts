// Import your database client/ORM here, e.g. Prisma
import { Prisma } from '@prisma/client';
import prisma from './prisma'; // Import the serverless-friendly Prisma client
import { Property, PropertyDetails, CombinedPropertyDetails, propertyString, Neighborhood, PropertyAnalyticsDetails, PropertyNearestStations, PropertyNearestPois } from './definitions';
import { tagCategories } from './tagUtils';
import { BatchGetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { prompts } from './promptConfig';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import Anthropic from "@anthropic-ai/sdk";
// Import the parser properly using ES module syntax
import { parseClaudeResultsToPrismaSQL } from './claudeQueryParser';
import { ChatHistory } from './definitions';

// Global AWS SDK V3 clients for DynamoDB
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

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
    // Define a type for the raw property result from database
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

    const formattedProperties = properties.map((property: RawProperty) => ({
      ...property,
      price: property.price ? property.price.toNumber() : 0,
      bathrooms: property.bathrooms ? property.bathrooms.toNumber() : null,
      latitude: property.latitude ? String(property.latitude) : '0',
      longitude: property.longitude ? String(property.longitude) : '0',
      listed_at: property.listed_at ? property.listed_at.toDateString() : '',
      closed_at: property.closed_at ? property.closed_at.toDateString() : '',
      available_from: property.available_from ? property.available_from.toDateString() : '',
      loaded_datetime: property.loaded_datetime ? property.loaded_datetime.toDateString() : '',
      date: property.date ? property.date.toDateString() : '',
      brokers_fee: property.brokers_fee ? property.brokers_fee.toNumber() : null,
      tag_list: property.tag_list ? property.tag_list.map((tag: string) => tag) : [],
      additional_fees: property.additional_fees ? property.additional_fees : null,
    }));

    return [formattedProperties as Property[], queryRecord, updatedChatHistory] as [Property[], Record<string, unknown>, ChatHistory];
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

    const formattedProperty = {
      ...property,
      price: property.price ? property.price.toNumber() : 0,
      bathrooms: property.bathrooms ? property.bathrooms.toNumber() : null,
      latitude: property.latitude ? String(property.latitude) : '0',
      longitude: property.longitude ? String(property.longitude) : '0',
      listed_at: property.listed_at ? property.listed_at.toDateString() : '',
      closed_at: property.closed_at ? property.closed_at.toDateString() : '',
      available_from: property.available_from ? property.available_from.toDateString() : '',
      loaded_datetime: property.loaded_datetime ? property.loaded_datetime.toDateString() : '',
      date: property.date ? property.date.toDateString() : '',
      brokers_fee: property.brokers_fee ? property.brokers_fee.toNumber() : null,
      // Convert any emoji tags to system tags
      tag_list: property.tag_list ? property.tag_list.map((tag: string) => tag) : [],
      additional_fees: property.additional_fees ? property.additional_fees : null,
    };
    return formattedProperty as Property;
  } catch (error) {
    throw error;
  }
}

export async function fetchPropertyDetailsById(id: string): Promise<PropertyDetails | null> {
  // Uses global ddbDocClient

  const params = {
    RequestItems: {
      'PropertyMediaDetails': {
        Keys: [{ id }]
      }
    }
  };

  try {
    const response = await ddbDocClient.send(new BatchGetCommand(params));
    const items = response.Responses?.PropertyMediaDetails ?? [];
    
    // Convert any item with tags to use system tags
    if (items.length > 0 && items[0].tag_list) {
      items[0].tag_list = items[0].tag_list.map((tag: string) => tag);
    }
    
    return items.length > 0 ? items[0] as PropertyDetails : null;
  } catch (error) {
    throw error;
  }
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

    const formattedAnalytics = analytics ? {
      ...analytics,
      price: analytics.price?.toNumber(),
      amenity_score: analytics.amenity_score?.toNumber()
    } : null;
    return formattedAnalytics as PropertyAnalyticsDetails | null;
  } catch {
    return null;
  }
}

export async function fetchPropertyPage(id: string): Promise<CombinedPropertyDetails> {
  try {
    const [
      property,
      propertyDetails,
      propertyAnalytics,
      nearestStations,
      nearestPois
    ] = await Promise.all([
      fetchPropertiesRDSById(id),
      fetchPropertyDetailsById(id).then(details => details || {}),
      fetchPropertyAnalyticsById(id).then(analytics => analytics || {}),
      fetchPropertyNearestStationsById(id).then(stations => stations || []),
      fetchPropertyNearestPoisById(id).then(pois => pois || [])
    ]);

    // Ensure property is not null or undefined before spreading
    if (!property) {
      throw new Error(`Property with fct_id ${id} not found via fetchPropertiesRDSById.`);
    }

    // Properly combine objects with stations in a closest_stations array property
    const propertyCombined = {
      ...(propertyDetails as PropertyDetails),
      ...property, // property is already of type Property, ensured by the check above
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
