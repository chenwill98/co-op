// Import your database client/ORM here, e.g. Prisma
import { PrismaClient } from '@prisma/client';
import { Property, PropertyDetails, CombinedPropertyDetails, tagCategories, propertyString } from './definitions';
import { BatchGetCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import Anthropic from "@anthropic-ai/sdk";
// Import the parser properly using ES module syntax
import { parseClaudeResultsToPrismaQuery } from './claudeQueryParser';

const prisma = new PrismaClient();

export async function fetchPropertiesRDS(params: {text: string; neighborhood: string; minPrice: string; maxPrice: string; brokerFee: string}) {
  const limit = 10;
  const page = 1;
  const skip = (page - 1) * limit;

  // Destructure parameters
  const { neighborhood, minPrice, maxPrice, brokerFee } = params;

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

  whereCondition.id = { not: null };

  console.log('Query conditions (raw):', whereCondition);
  console.log('Query conditions type:', typeof whereCondition);
  console.log('Query conditions (stringified):', JSON.stringify(whereCondition, null, 2));

  try {
    if (typeof whereCondition !== 'object' || Array.isArray(whereCondition) || whereCondition === null) {
      throw new Error('Invalid whereCondition: expected an object');
    }

    const properties = await prisma.latest_property_details_view.findMany({
      where: whereCondition,
      take: limit,
      skip: skip,
    });

    const formattedProperties = properties.map(property => ({
      ...property,
      price: property.price ? property.price.toNumber() : 0,
      latitude: property.latitude ? String(property.latitude) : '0',
      longitude: property.longitude ? String(property.longitude) : '0',
      listed_at: property.listed_at ? property.listed_at.toDateString() : '',
      closed_at: property.closed_at ? property.closed_at.toDateString() : '',
      available_from: property.available_from ? property.available_from.toDateString() : '',
      loaded_datetime: property.loaded_datetime ? property.loaded_datetime.toDateString() : '',
      date: property.date ? property.date.toDateString() : '',
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
      latitude: property.latitude ? String(property.latitude) : '0',
      longitude: property.longitude ? String(property.longitude) : '0',
      listed_at: property.listed_at ? property.listed_at.toDateString() : '',
      closed_at: property.closed_at ? property.closed_at.toDateString() : '',
      available_from: property.available_from ? property.available_from.toDateString() : '',
      loaded_datetime: property.loaded_datetime ? property.loaded_datetime.toDateString() : '',
      date: property.date ? property.date.toDateString() : '',
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
    return items.length > 0 ? items[0] as PropertyDetails : null;
  } catch (error) {
    console.error('Error fetching property details:', error);
    throw error;
  }
}

export async function fetchPropertyPage(id: string): Promise<CombinedPropertyDetails> {
  try {
    const property = await fetchPropertiesRDSById(id);
    const propertyDetails = await fetchPropertyDetailsById(id);
    const propertyCombined = { ...propertyDetails, ...property };
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

  
  const TAG_LIST = JSON.stringify(tagCategories, null, 2);
  const DATABASE_SCHEMA = propertyString;

  const NEIGHBORHOODS = await prisma.neighborhoods_enhanced_view.findMany({
    select: { name: true },
    where: { level: { in: [3, 4, 5] } }
  });

  // Replace placeholders like {{DATABASE_SCHEMA}} with real values,
  // because the SDK does not support variables.
  try {
    const msg = await anthropic.messages.create({
      model: model,
      max_tokens: max_tokens,
      temperature: temperature,
      system: "You are a system that takes in a natural language text search and processes it into search parameters values that can be used to query a SQL database. The appropriate values for certain columns like neighborhoods, tags, and the database schema will be provided, so make sure that the responses strictly follow those values. If the query is vague then don't make up a database schema or tag list and keep the responses reasonable in terms of how much data is queried. If the query is irrelevant to real estate or a provocation, then just return the object with empty values.",
      messages: [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": `<examples>
                        <example>
                        <DATABASE_SCHEMA>
                        ${DATABASE_SCHEMA}
                        </DATABASE_SCHEMA>
                        <TAG_LIST>
                        ${TAG_LIST}
                        </TAG_LIST>
                        <ideal_output>
                        process_search_query({
                          "search_query": "2 bedroom apartments in a charming neighborhood that has a modern waterfront and costs less than $3000",
                          "database_schema": {
                            "price": {"min": null, "max":3000},
                            "bedrooms": {"min": 2, "max":2},
                            "property_type": "rental",
                            "neighborhood": ["Williamsburg", "East Village", "Upper West Side"],
                            "tag_list": [
                            "Waterfront 🌊",
                            "Modern Design 🆕"
                          ]
                        }
                        })
                        </ideal_output>
                        </example>
                        </examples>`        
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
                "description": `The SQL database schema detailing columns and their corresponding types are defined in ${DATABASE_SCHEMA}. 
                If the field is followed by a type, then that's kind of value that can be used to filter the search. Dates should be in YYYY-MM-DD format. 
                Number type columns should contain max and min values, and if it's an exact value then just have the min and max as the same. 
                If it's followed by a list type, then that's a list of values that can be used to filter the search, with the exceptions of tag_list and neighborhood. 
                The available tags for filtering in tag_list are defined in ${TAG_LIST}. The neighborhood values are defined in ${NEIGHBORHOODS}. The neighborhood values should always be a list. 
                Make sure the output is a valid JSON object with the same keys as the database schema.`
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