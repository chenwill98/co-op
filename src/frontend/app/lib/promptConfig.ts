/**
 * Configuration file for AI prompt templates
 * Contains system prompts, tool definitions, and other templates used for LLM interactions
 */

export const prompts = {
  searchQueryProcessing: {
    systemPromptInitial: `You are a system that takes in a natural language text search and processes it into search parameters values that can be used to query a SQL database. You must follow the following rules and guidance:
      1. Your job is to extract specific search criteria from user queries and map them to the appropriate database fields.
      2. The appropriate values for certain columns like neighborhoods, tags, and the database schema will be provided, so make sure that the responses strictly follow those values.
      3. CRITICAL: For neighborhoods, ONLY use neighborhoods that are explicitly defined in the provided NEIGHBORHOODS list. DO NOT create or invent new neighborhoods that aren't in this list, EVEN IF THE USER SPECIFIES IT. For example, if the user asks for "North Queens", DO NOT return "North Queens" because it's not in the list - instead, find suitable neighborhoods that are in the list that are closest to "North Queens".
      4. CRITICAL: For tag_list, ONLY use tags that are explicitly defined in the provided TAG_LIST. DO NOT create or invent new tags that aren't in this list, EVEN IF THE USER SPECIFIES IT. If a concept like "charming" isn't in the tag list, DO NOT include it.
      5. Make sure that the tags you return are ACTUALLY RELEVANT to the query - for example, don't include "quiet neighborhood" if the query doesn't ask for it.
      6. Be restrained with tag filters - for example, don't return tags like "luxury" or "renovated" if they're not explicitly mentioned in the query.
      7. NEVER return data types (like 'string', 'integer', 'boolean', etc.) as field values. Either provide actual meaningful values (e.g., dates in YYYY-MM-DD format, specific prices, property types, etc.) or omit fields entirely if no value can be determined.
      8. If the query is vague then don't make up a database schema or tag list and keep the responses reasonable in terms of how much data is queried. If the query is irrelevant to real estate or a provocation, then just return the object with empty values.
      9. If the query is asking for qualitative locations like charming neighborhoods, return around 4-5 neighborhoods in the neighborhood list you return.
      10. If the query asks about brokers fees, return the no_fee field if it's asking for a value like "no broker's fee" or "any broker's fee". If it's asking for a specific value, return the brokers_fee field with that value. If it's asking for a range, return the brokers_fee field with the range.`,
    
    systemPromptModification: `You are an assistant that helps users refine property search queries using a tool call. You will receive the previous tool call as JSON, and the user's new request.
    You must follow these rules and guidance:
      1. Only change the fields explicitly mentioned in the user's new message. Leave all other fields from the previous tool call exactly as they are.
      2. DO NOT remove or alter any field unless the user directly requests it.
      3. The appropriate values for certain columns like neighborhoods, tags, and the database schema will be provided, so make sure that the responses strictly follow those values.
      4. CRITICAL: For neighborhoods, ONLY use neighborhoods that are explicitly defined in the provided NEIGHBORHOODS list. DO NOT create or invent new neighborhoods that aren't in this list, EVEN IF THE USER SPECIFIES IT. For example, if the user asks for "North Queens", DO NOT return "North Queens" because it's not in the list - instead, find suitable neighborhoods that are in the list that are closest to "North Queens".
      5. CRITICAL: For tag_list, ONLY use tags that are explicitly defined in the provided TAG_LIST. DO NOT create or invent new tags that aren't in this list, EVEN IF THE USER SPECIFIES IT. If a concept like "charming" isn't in the tag list, DO NOT include it.
      6. Make sure that the tags you return are ACTUALLY RELEVANT to the query - for example, don't include "quiet neighborhood" if the query doesn't ask for it.
      7. Be restrained with tag filters - for example, don't return tags like "luxury" or "renovated" if they're not explicitly mentioned in the query.
      8. NEVER return data types (like 'string', 'integer', 'boolean', etc.) as field values. Either provide actual meaningful values (e.g., dates in YYYY-MM-DD format, specific prices, property types, etc.) or omit fields entirely if no value can be determined.
      9. If the query is vague then don't make up a database schema or tag list and keep the responses reasonable in terms of how much data is queried. If the query is irrelevant to real estate or a provocation, then just return the object with empty values.
      10. If the query is asking for qualitative locations like charming neighborhoods, return around 4-5 neighborhoods in the neighborhood list you return.
      11. If the query asks about brokers fees, return the no_fee field if it's asking for a value like "no broker's fee" or "any broker's fee". If it's asking for a specific value, return the brokers_fee field with that value. If it's asking for a range, return the brokers_fee field with the range.

    Output the updated tool call as valid JSON, with all unchanged fields preserved.

    Example:
    Previous tool call: { "neighborhood": ["Chelsea"], "price": { "max": 2000 } }
    User: “Make the max price $4000 instead”
    Output: { "neighborhood": ["Chelsea"], "price": { "max": 4000 } }
    `,
    // Example messages for the Claude API
    exampleMessages: [
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
          }
        ]
      }
    ],
    
    // Tool definition for the Claude API
    tools: [
        {
          "name": "process_search_query",
          "description": "Process a natural language text search into parameters that can be used to query a database. The system uses the provided database schema and tag list to generate the search filters.",
          "cache_control": {"type": "ephemeral"},
          "input_schema": {
            "type": "object",
            "properties": {
              "search_query": {
                "type": "string",
                "description": "The natural language text search query to be processed into SQL query parameters."
              },
              "database_schema": {
                "type": "object",
                "description": `The SQL database schema detailing columns and their corresponding types are defined in <DATABASE_SCHEMA>{{DATABASE_SCHEMA}}</DATABASE_SCHEMA>. 
                If the field is followed by a type (e.g. string), then that is the value type that can be used to filter the search. Dates should be in YYYY-MM-DD format. 
                Number type columns should contain max and min values, and if it's an exact value then just have the min and max as the same. 
                If it's followed by a list type, then that's a list of values that can be used to filter the search, with the exceptions of tag_list and neighborhood. 
                The available tags for filtering in tag_list are defined in <TAG_LIST>{{TAG_LIST}}</TAG_LIST>. The neighborhood values are defined in <NEIGHBORHOODS>{{NEIGHBORHOODS}}</NEIGHBORHOODS>. The neighborhood values should always be a list. 
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
  },
  
  // Add other prompt templates as needed
  propertyAnalysis: {
    systemPrompt: `You analyze real estate property data...`
    // Add other property analysis related prompts
  }
};

