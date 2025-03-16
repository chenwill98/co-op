// Import your database client/ORM here, e.g. Prisma
import { PrismaClient } from '@prisma/client';
import { Property, PropertyDetails, CombinedPropertyDetails, propertyString, Neighborhood, PropertyAnalyticsDetails, PropertyNearestStations } from './definitions';
import { getSystemTag, tagCategories } from './tagUtils';
import { BatchGetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import Anthropic from "@anthropic-ai/sdk";
// Import the parser properly using ES module syntax
import { parseClaudeResultsToPrismaQuery } from './claudeQueryParser';



const prisma = new PrismaClient();

export async function fetchPropertiesRDS(params: {
  text: string; 
  neighborhood: string; 
  minPrice: string; 
  maxPrice: string; 
  brokerFee: string; 
  sort?: string;
  tags?: string;
}) {
  const limit = 10;
  const page = 1;
  const skip = (page - 1) * limit;

  // Destructure parameters
  const { neighborhood, minPrice, maxPrice, brokerFee, sort, tags } = params;

  // Build the where condition based on provided filters
  const whereCondition: any = {};

  // Get Claude results if text search is provided
  if (params.text) {
    try {
      const claudeResults = await fetchClaudeSearchResult(params.text)
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
          return dbSchema ?? {};
        });
      
      // Parse claudeResults into Prisma filters - properly await the async function
      const claudeFilters = await parseClaudeResultsToPrismaQuery(claudeResults);
      
      // Merge Claude filters with whereCondition
      Object.assign(whereCondition, claudeFilters);
    } catch (error) {
      console.error('Error processing Claude search results:', error);
      // Continue with empty whereCondition if Claude search fails
    }
  }

  // Apply manual filters (these will override Claude filters if there's a conflict)
  if (neighborhood && !whereCondition.neighborhood) {
    whereCondition.neighborhood = {
      equals: neighborhood,
      mode: 'insensitive'
    };
  }

  if ((minPrice || maxPrice) && !whereCondition.price) {
    whereCondition.price = {};
    if (minPrice) {
      whereCondition.price.gte = Number(minPrice);
    }
    if (maxPrice) {
      whereCondition.price.lte = Number(maxPrice);
    }
  }

  // Handle broker fee filter if needed
  if (brokerFee === 'true' && !whereCondition.no_fee) {
    whereCondition.no_fee = true;
  }

  // Handle tag filtering
  if (tags && !whereCondition.tag_list) {
    const tagArray = tags.split(',');
    if (tagArray.length > 0) {
      whereCondition.tag_list = {
        hasEvery: tagArray
      };
    }
  }

  whereCondition.id = { not: null };

  console.log('Query conditions (raw):', whereCondition);
  console.log('Query conditions type:', typeof whereCondition);
  console.log('Query conditions (stringified):', JSON.stringify(whereCondition, null, 2));

  try {
    if (typeof whereCondition !== 'object' || Array.isArray(whereCondition) || whereCondition === null) {
      throw new Error('Invalid whereCondition: expected an object');
    }

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

    const properties = await prisma.latest_property_details_view.findMany({
      where: whereCondition,
      take: limit,
      skip: skip,
      orderBy: orderBy,
    });

    const formattedProperties = properties.map(property => ({
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
      // Convert any emoji tags to system tags
      tag_list: property.tag_list ? property.tag_list.map(tag => tag) : [],
    }));

    return formattedProperties as Property[];
  } catch (error) {
    console.error('Error fetching properties with Prisma:', error);
    throw error;
  }
}


export async function fetchPropertiesRDSById(id: string): Promise<Property> {

  try {
    const property = await prisma.latest_property_details_view.findFirst({
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
      // Convert any emoji tags to system tags
      tag_list: property.tag_list ? property.tag_list.map(tag => tag) : [],
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
    console.error('Error fetching property analytics:', error);
    return []; // Return empty array on error
  }
}

export async function fetchPropertyAnalyticsById(id: string): Promise<PropertyAnalyticsDetails | null> {
  try {
    const analytics = await prisma.dim_property_analytics_view.findFirst({
      where: { listing_id: id },
    });

    const formattedAnalytics = analytics ? {
      ...analytics,
      subway_access_percentile: analytics.subway_access_percentile?.toNumber() || null,
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
    
    // Properly combine objects with stations in a closest_stations array property
    const propertyCombined = { 
      ...propertyDetails, 
      ...property,
      ...propertyAnalytics,
      closest_stations: nearestStations // Put stations in closest_stations property
    };
    
    return propertyCombined as CombinedPropertyDetails;
  
  } catch (error) {
    console.error(`Failed to fetch listing id ${id}:`, error);
    throw new Error(`Failed to fetch listing id ${id}`);
  }
}

export async function fetchClaudeSearchResult(text: string): Promise<Record<string, any>>{

  const anthropic = new Anthropic({
    // defaults to process.env["ANTHROPIC_API_KEY"]
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const model = "claude-3-5-haiku-20241022";
  const max_tokens = 8192;
  const temperature = 0;

  
  const TAG_LIST = JSON.stringify(
    Object.entries(tagCategories).reduce((result, [category, tags]) => {
      result[category] = tags
        .filter(tag => tag.source.includes('AI'))
        .map(tag => tag.name);
      return result;
    }, {} as Record<string, string[]>), 
    null, 
    2
  );
  const DATABASE_SCHEMA = propertyString;

  const NEIGHBORHOODS = await prisma.neighborhoods_enhanced_view.findMany({
    select: { name: true },
    where: { level: { in: [3, 4, 5] } }
  });

  // // Get neighborhoods from cache or fetch them
  // const allNeighborhoods = await getCachedNeighborhoods();
  // const NEIGHBORHOODS = allNeighborhoods
  //   .filter((n: Neighborhood) => [3, 4, 5].includes(n.level))
  //   .map((n: Neighborhood) => ({ name: n.name }));

  // Replace placeholders like {{DATABASE_SCHEMA}} with real values,
  // because the SDK does not support variables.
  try {
    const msg = await anthropic.messages.create({
      model: model,
      max_tokens: max_tokens,
      temperature: temperature,
      // cache_prompt: true,
      // system: "You are a system that takes in a natural language text search and processes it into search parameters values that can be used to query a SQL database. Your job is to extract specific search criteria from user queries and map them to the appropriate database fields.\n\n" +
      //     "Rules:\n" +
      //     "1. Only use values from the provided neighborhoods, tags, and database schema\n" +
      //     "2. For numeric ranges, set both min and max when possible (e.g., {\"min\": 2, \"max\": 2} for exactly 2 bedrooms)\n" +
      //     "3. For open-ended ranges, use null for the unbounded side (e.g., {\"min\": null, \"max\": 3000} for less than $3000)\n" +
      //     "4. If a query is vague, only include parameters that are explicitly mentioned or strongly implied\n" +
      //     "5. For irrelevant or inappropriate queries, return an object with empty or null values for all fields\n" +
      //     "6. Always include property_type as either \"rental\" or \"sale\" based on context",
      system: `You are a system that takes in a natural language text search and processes it into search parameters values that can be used to query a SQL database. You must follow the following rules and guidance:
      1. Your job is to extract specific search criteria from user queries and map them to the appropriate database fields.
      2. The appropriate values for certain columns like neighborhoods, tags, and the database schema will be provided, so make sure that the responses strictly follow those values.
      3. Make sure that the tags you return are ACTUALLY RELEVANT to the query.
      4. NEVER return data types (like 'string', 'integer', 'boolean', etc.) as field values. Either provide actual meaningful values (e.g., dates in YYYY-MM-DD format, specific prices, property types, etc.) or omit fields entirely if no value can be determined.
      5. If the query is vague then don't make up a database schema or tag list and keep the responses reasonable in terms of how much data is queried. If the query is irrelevant to real estate or a provocation, then just return the object with empty values.`,
      messages: [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": `<example>
                        <ideal_output>
                        process_search_query({
                          "search_query": "2 bedroom apartments in a charming neighborhood that has a modern waterfront and costs less than $3000",
                          "database_schema": {
                            "price": {"min": null, "max": 3000},
                            "bedrooms": {"min": 2, "max": 2},
                            "property_type": "rental",
                            "neighborhood": ["Williamsburg", "East Village", "Upper West Side"],
                            "tag_list": [
                            "waterfront",
                            "modern-design"
                          ]
                        }
                        })
                        </ideal_output>
                        <BAD_OUTPUT>
                        process_search_query({
                          "search_query": "Apartments near Central Park",
                          "database_schema": {
                          "status": "string",
                          "listed_at": "string",
                          "closed_at": "string",
                          "available_from": "string",
                          "address": "string",
                          "borough": {
                            "equals": "string"
                          },
                          "zipcode": {
                            "equals": "string"
                          },
                          "property_type": {
                            "in": [
                              "condo",
                              "rental",
                              "townhouse",
                              "house"
                            ]
                          },
                          "amenities": {
                            "hasEvery": [
                              "pets",
                              "media_room",
                              "hardwood_floors",
                              "recreation_facilities",
                              "dogs",
                              "storage_room",
                              "roofdeck",
                              "childrens_playroom",
                              "nyc_evacuation_1",
                              "fios_available",
                              "balcony",
                              "doorman",
                              "bike_room",
                              "furnished",
                              "hot_tub",
                              "nyc_evacuation_6",
                              "public_outdoor_space",
                              "full_time_doorman",
                              "locker_cage",
                              "park_view",
                              "nyc_evacuation_3",
                              "garage",
                              "waterview",
                              "part_time_doorman",
                              "tennis_court",
                              "leed_registered",
                              "garden",
                              "valet",
                              "fireplace",
                              "gas_fireplace",
                              "wheelchair_access",
                              "deck",
                              "waterfront",
                              "city_view",
                              "elevator",
                              "co_purchase",
                              "dishwasher",
                              "courtyard",
                              "washer_dryer",
                              "pool",
                              "garden_view",
                              "sublets",
                              "decorative_fireplace",
                              "parents",
                              "concierge",
                              "terrace",
                              "cold_storage",
                              "virtual_doorman",
                              "pied_a_terre",
                              "guarantors",
                              "smoke_free",
                              "gym",
                              "cats",
                              "valet_parking",
                              "laundry",
                              "nyc_evacuation_2",
                              "central_ac",
                              "private_roof_deck",
                              "roof_rights",
                              "patio",
                              "wood_fireplace",
                              "assigned_parking",
                              "parking",
                              "package_room",
                              "skyline_view",
                              "live_in_super",
                              "storage",
                              "nyc_evacuation_5"
                            ]
                          },
                          "agents": "string[]",
                          "url": "string",
                          "date": "string",
                          "id": {
                            "not": null
                          }
                        })
                        </BAD_OUTPUT>
                        </example>`        
            },
            {
              "type": "text",
              "text": `Query: ${text}`
            }
          ]
        }
      ],
      tools: [
        {
          "name": "process_search_query",
          "description": "Process a natural language text search into parameters that can be used to query a database. The system uses the provided database schema and tag list to generate the search filters.",
          "input_schema": {
            "type": "object",
            "properties": {
              "search_query": {
                "type": "string",
                "description": "The natural language text search query to be processed into SQL query parameters."
              },
              "database_schema": {
                "type": "object",
                "description": `The SQL database schema detailing columns and their corresponding types are defined in <DATABASE_SCHEMA>${DATABASE_SCHEMA}</DATABASE_SCHEMA>. 
                If the field is followed by a type (e.g. string), then that is the value type that can be used to filter the search. Dates should be in YYYY-MM-DD format. 
                Number type columns should contain max and min values, and if it's an exact value then just have the min and max as the same. 
                If it's followed by a list type, then that's a list of values that can be used to filter the search, with the exceptions of tag_list and neighborhood. 
                The available tags for filtering in tag_list are defined in <TAG_LIST>${TAG_LIST}</TAG_LIST>. The neighborhood values are defined in <NEIGHBORHOODS>${NEIGHBORHOODS}</NEIGHBORHOODS>. The neighborhood values should always be a list. 
                Make sure the output is a valid JSON object with the same keys as the database schema. If a field value would be null or you don't have a specific value for it, exclude that field entirely from the response. IMPORTANT: DO NOT return the type descriptions as values (e.g. NEVER return 'string', 'integer', etc as values). For example, instead of 'status: "string"' either provide an actual status value like 'status: "active"' or omit the field entirely.` 
              }
            },
            "required": [
              "search_query",
              "database_schema"
            ]
          }
        }
      ]
    });
    return msg;
  }
  catch (e) {
    console.error(e);
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
