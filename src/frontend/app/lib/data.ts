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


export async function fetchPropertiesRDS(params: {
  text: string;
  neighborhood: string;
  minPrice: string;
  maxPrice: string;
  brokerFee: string;
  sort?: string;
  tags?: string;
  chatHistory?: ChatHistory;
}): Promise<[Property[], Record<string, any>, ChatHistory]>
{
  const limit = 10;
  const page = 1;
  const skip = (page - 1) * limit;

  // Destructure parameters
  const { neighborhood, minPrice, maxPrice, brokerFee, sort, tags } = params;
  let claudeQuery = Prisma.empty;
  let queryRecord: Record<string, any> = {};

  // Get Claude results if text search is provided
  let updatedChatHistory = params.chatHistory ? [...params.chatHistory] : [];
  if (params.text) {
    try {
      // Pass chatHistory to Claude
      const claudeResults = await fetchClaudeSearchResult(params.text, updatedChatHistory)
        .then((results) => {
          console.log('Claude results:', results);
          // Ensure we're getting a proper object, not a string
          const dbSchema = results?.content?.[1]?.input?.database_schema;
          console.log('dbSchema:', dbSchema);
          if (typeof dbSchema === 'string') {
            try {
              return JSON.parse(dbSchema);
            } catch (parseError) {
              console.error('Error parsing Claude results string:', parseError);
              return {};
            }
          }

          // Extract the first text message from Claude's response or error
          let messageText = '';
          if (results && typeof results.message === 'string' && results.tool === '{}') {
            // Overload or error case
            messageText = results.message;
          } else if (results?.content && Array.isArray(results.content)) {
            // Find the first text item in the content array
            const textItem = results.content.find((item: any) => item.type === 'text');
            console.log('Found text message:', textItem);
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

      

      console.log('updatedChatHistory FISHING', updatedChatHistory);
      // Define orderBy based on sort parameter
      let orderBy: any = undefined;
      
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

    } catch (error) {
      console.error('Error processing Claude search results:', error);
      // Continue with empty whereCondition if Claude search fails
    }
  }

  try {
    // Execute the query if we have one from Claude
    const properties = params.text 
      ? await prisma.$queryRaw<any[]>(claudeQuery)
      : await prisma.latest_properties_materialized.findMany({
          where: { id: { not: null } },
          take: limit,
          skip: skip,
          orderBy: sort ? {
            [sort === 'newest' ? 'listed_at' : 'price']: 
            sort === 'least_expensive' ? 'asc' : 'desc'
          } : undefined
        });
    
    let formattedProperties = properties.map(property => ({
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
    }));

    return [formattedProperties as Property[], queryRecord, updatedChatHistory] as [Property[], Record<string, any>, ChatHistory];
  } catch (error) {
    console.error('Error fetching properties with Prisma:', error);
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
    console.error('Error fetching property:', error);
    throw error;
  }
}

export async function fetchPropertyDetailsById(id: string): Promise<PropertyDetails | null> {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  const ddbDocClient = DynamoDBDocumentClient.from(client);

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
    console.error('Error fetching property details:', error);
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
  } catch (error) {
    console.error('Error fetching property nearest stations:', error);
    return []; // Return empty array on error
  }
}

export async function fetchPropertyNearestPoisById(id: string): Promise<PropertyNearestPois[] | null> {
  try {
    // Use fixed categories
    const categories = ['fitness_center', 'food', 'grocery', 'park'];
    let allPois: any[] = [];
    
    // For each category, get the top 5 nearest POIs
    for (const category of categories) {
      const poisForCategory = await prisma.dim_property_nearest_pois.findMany({
        where: { 
          listing_id: id,
          category: category
        },
        orderBy: { distance: 'asc' },
        take: 5
      });
      
      allPois = [...allPois, ...poisForCategory];
    }
    
    if (allPois.length === 0) {
      return []; // Return empty array if none found
    }

    // Format the data to match PropertyNearestPois type
    const formattedPois = allPois.map((poi) => ({
      listing_id: poi.listing_id,
      name: poi.name,
      longitude: poi.longitude.toNumber(),
      latitude: poi.latitude.toNumber(),
      distance: Number(poi.distance),
      address: poi.address,
      website: poi.website,
      category: poi.category,
    }));

    return formattedPois as PropertyNearestPois[];
  } catch (error) {
    console.error('Error fetching property analytics:', error);
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
  } catch (error) {
    console.error('Error fetching property analytics:', error);
    return null;
  }
}

export async function fetchPropertyPage(id: string): Promise<CombinedPropertyDetails> {
  try {
    const property = await fetchPropertiesRDSById(id);
    const propertyDetails = await fetchPropertyDetailsById(id) || {};
    const propertyAnalytics = await fetchPropertyAnalyticsById(id) || {};
    const nearestStations = await fetchPropertyNearestStationsById(id) || [];
    const nearestPois = await fetchPropertyNearestPoisById(id) || [];
    
    // Properly combine objects with stations in a closest_stations array property
    const propertyCombined = { 
      ...propertyDetails, 
      ...property,
      ...propertyAnalytics,
      closest_stations: nearestStations,
      nearest_pois: nearestPois
    };
    
    return propertyCombined as CombinedPropertyDetails;
  
  } catch (error) {
    console.error(`Failed to fetch listing id ${id}:`, error);
    throw new Error(`Failed to fetch listing id ${id}`);
  }
}

export async function fetchClaudeSearchResult(
  text: string,
  chatHistory: ChatHistory = []
): Promise<Record<string, any>> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  const model = "claude-3-5-haiku-20241022";
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
    let systemPrompt;
    if (isInitial) {
      console.log('[Claude] Using initial system prompt');
      systemPrompt = prompts.searchQueryProcessing.systemPromptInitial;
    } else {
      console.log('[Claude] Using modification system prompt');
      systemPrompt = prompts.searchQueryProcessing.systemPromptModification;
    }
    
    // Make the API call
    const msg = await anthropic.messages.create({
      model,
      max_tokens,
      temperature,
      system: systemPrompt,
      messages,
      tools
    });
    
    return msg;
  } catch (e: any) {
    console.error(e);
    // Handle Claude overload error (529 or overloaded_error)
    if (e?.status === 529 || e?.error?.type === 'overloaded_error' || (typeof e?.message === 'string' && e.message.includes('Overloaded'))) {
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
  } catch (error) {
    console.error('Error fetching neighborhoods:', error);
    return [] as Neighborhood[];
  }
}
