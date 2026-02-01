import { getAllChildNeighborhoods } from './data';
import { Prisma } from '@prisma/client';

/**
 * Escapes a string value for safe use in SQL queries.
 * Prevents SQL injection by escaping single quotes and other dangerous characters.
 */
function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

/**
 * Validates that a value is a safe SQL identifier (column name).
 * Only allows alphanumeric characters and underscores.
 */
function isValidIdentifier(value: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

/**
 * Interface representing the structure of Claude's response
 */
export interface ClaudeResponse {
  price?: {
    min: number | null;
    max: number | null;
  };
  bedrooms?: {
    min: number | null;
    max: number | null;
  };
  bathrooms?: {
    min: number | null;
    max: number | null;
  };
  property_type?: string | string[];
  neighborhood?: string | string[];
  borough?: string | string[];
  zipcode?: string | string[];
  tag_list?: string[];
  sqft?: {
    min: number | null;
    max: number | null;
  };
  amenities?: string[];
  no_fee?: boolean;
  built_in?: {
    min: number | null;
    max: number | null;
  };
  [key: string]: unknown;
}

/**
 * Parses Claude's response and converts it into a Prisma query filter
 * @param claudeResults - The response from Claude AI
 * @returns A Prisma-compatible where condition object
 */
export async function parseClaudeResultsToPrismaQuery(claudeResults: ClaudeResponse): Promise<[Record<string, unknown>, string[]]> {
  // Initialize the where condition object
  const whereCondition: Record<string, unknown> = {};
  const tagArray: string[] = [];

  // Handle case where claudeResults is a string
  if (typeof claudeResults === 'string') {
    try {
      claudeResults = JSON.parse(claudeResults);
    } catch {
      return [whereCondition, tagArray];
    }
  }

  // Return empty object if claudeResults is empty or undefined
  if (!claudeResults || Object.keys(claudeResults).length === 0) {
    return [whereCondition, tagArray];
  }

  // Process each key-value pair in claudeResults
  for (const [key, value] of Object.entries(claudeResults)) {
    // Skip null, undefined, or empty values
    if (value === null || value === undefined || value === '') continue;

    // Handle different field types
    switch (key) {
      // Handle range fields (price, sqft, etc.)
      case 'price':
      case 'sqft':
      case 'bedrooms':
      case 'bathrooms':
      case 'built_in':
      case 'days_on_market': {
        const rangeValue = value as { min?: number | null; max?: number | null };
        const minVal = rangeValue.min;
        const maxVal = rangeValue.max;
        const condition: { equals?: number; gte?: number; lte?: number } = {};

        // If min and max are the same and not null, use equals
        if (minVal != null && minVal === maxVal && minVal > 0) {
          condition.equals = Number(minVal);
        } else {
          if (minVal != null && minVal > 0) {
            condition.gte = Number(minVal);
          }
          if (maxVal != null && maxVal > 0) {
            condition.lte = Number(maxVal);
          }
        }

        // Only add if condition is not empty
        if (Object.keys(condition).length > 0) {
          whereCondition[key] = condition;
        }
        break;
      }

      // Handle string fields that can be single values or arrays
      case 'property_type':
        if (typeof value === 'string') {
          whereCondition[key] = { 
            equals: value
          };
        } else if (Array.isArray(value) && value.length > 0) {
          whereCondition[key] = {
            in: value
          };
        }
        break;
        
      case 'borough':
        if (typeof value === 'string') {
          whereCondition[key] = { 
            equals: value.toLowerCase()
          };
        } else if (Array.isArray(value) && value.length > 0) {
          whereCondition[key] = {
            in: value.map(item => typeof item === 'string' ? item.toLowerCase() : item)
          };
        }
        break;

      case 'zipcode':
        if (typeof value === 'string') {
          whereCondition[key] = { 
            equals: value
          };
        } else if (Array.isArray(value) && value.length > 0) {
          whereCondition[key] = {
            in: value
          };
        }
        break;

      // Handle neighborhood field which is always an array in Claude's response
      case 'neighborhood':
        if (Array.isArray(value) && value.length > 0) {
          // Get all child neighborhoods for each parent neighborhood
          const allNeighborhoods = [];
          
          // Process each neighborhood from Claude's response
          for (const neighborhood of value) {
            try {
              // Get all child neighborhoods including the parent
              const childNeighborhoods = await getAllChildNeighborhoods(neighborhood) as { name: string }[];
              
              // Format neighborhood names: lowercase and replace spaces with hyphens
              const formattedNeighborhoods = childNeighborhoods.map((item: { name: string }) =>
                item.name.toLowerCase().replace(/\s+/g, '-')
              );
              
              // Add to the complete list
              allNeighborhoods.push(...formattedNeighborhoods);
            } catch {
              // If there's an error, just add the original neighborhood
              allNeighborhoods.push(neighborhood.toLowerCase().replace(/\s+/g, '-'));
            }
          }

          // Remove duplicates
          const uniqueNeighborhoods = [...new Set(allNeighborhoods)];

          // Set the query condition if we have neighborhoods
          if (uniqueNeighborhoods.length > 0) {
            whereCondition[key] = {
              in: uniqueNeighborhoods
            };
          }
        }
        break;

      // Handle tag_list field which is always an array in Claude's response
      case 'tag_list':
        if (Array.isArray(value) && value.length > 0) {
          // Use tag_list for the query
          whereCondition['tag_list'] = {
            hasSome: value
          };
          // Store in tagArray for result ranking
          tagArray.push(...value);

          // Remove the original tag_list condition since we're using tag_list
          delete whereCondition[key];
        }
        break;

      // Handle amenities field which is always an array in Claude's response
      case 'amenities':
        if (Array.isArray(value) && value.length > 0) {
          whereCondition[key] = { 
            hasSome: value 
          };
        }
        break;

      // Handle boolean fields
      case 'no_fee':
        if (typeof value === 'boolean') {
          whereCondition[key] = value;
        }
        break;

      // Default case: assign value directly if it doesn't match any specific case
      default:
        // Only add if the value is not null or undefined
        if (value !== null && value !== undefined) {
          whereCondition[key] = value;
        }
        break;
    }
  }

  return [whereCondition, tagArray];
}

/**
 * Parses Claude's response and converts it into a SQL query string
 * @param claudeResults - The response from Claude AI
 * @param orderBy - Optional orderBy object from Prisma
 * @param limit - Optional limit for results
 * @param offset - Optional offset for pagination
 * @returns An object with the SQL query string and the tag array used for sorting
 */
export async function parseClaudeResultsToPrismaSQL(
  claudeResults: ClaudeResponse,
  orderBy?: Record<string, string>,
  limit?: number,
  offset?: number
): Promise<[Prisma.Sql, Record<string, unknown>]> {
  // Initialize the where condition parts array and tag array
  const whereClauseParts: string[] = [];
  const tagArray: string[] = [];

  // Handle case where claudeResults is a string
  if (typeof claudeResults === 'string') {
    try {
      claudeResults = JSON.parse(claudeResults);
    } catch {
      return [Prisma.empty, {}];
    }
  }

  // Return empty query if claudeResults is empty or undefined
  if (!claudeResults || Object.keys(claudeResults).length === 0) {
    return [Prisma.empty, {}];
  }
  
  // Process each key-value pair in claudeResults
  for (const [key, value] of Object.entries(claudeResults)) {
    // Skip null, undefined, or empty values
    if (value === null || value === undefined || value === '') continue;
    
    // Handle different field types
    switch (key) {
      // Handle range fields (price, sqft, etc.)
      case 'price':
      case 'sqft':
      case 'bedrooms':
      case 'bathrooms':
      case 'built_in':
      case 'brokers_fee':
      case 'days_on_market': {
        const rangeValue = value as { min?: number | null; max?: number | null };
        const minVal = rangeValue.min;
        const maxVal = rangeValue.max;
        // If min and max are the same and not null, use equals
        if (minVal != null && minVal === maxVal && minVal > 0) {
          whereClauseParts.push(`${key} = ${Number(minVal)}`);
        } else {
          if (minVal != null && minVal > 0) {
            whereClauseParts.push(`${key} >= ${Number(minVal)}`);
          }
          if (maxVal != null && maxVal > 0) {
            whereClauseParts.push(`${key} <= ${Number(maxVal)}`);
          }
        }
        break;
      }

      // Handle string fields that can be single values or arrays
      case 'property_type':
        if (typeof value === 'string') {
          whereClauseParts.push(`${key} = '${escapeSqlString(value)}'`);
        } else if (Array.isArray(value) && value.length > 0) {
          const valuesStr = value.map(v => `'${escapeSqlString(String(v))}'`).join(',');
          whereClauseParts.push(`${key} IN (${valuesStr})`);
        }
        break;

      case 'borough':
        if (typeof value === 'string') {
          whereClauseParts.push(`${key} = '${escapeSqlString(value.toLowerCase())}'`);
        } else if (Array.isArray(value) && value.length > 0) {
          const valuesStr = value.map(item =>
            `'${escapeSqlString(typeof item === 'string' ? item.toLowerCase() : String(item))}'`
          ).join(',');
          whereClauseParts.push(`${key} IN (${valuesStr})`);
        }
        break;

      case 'zipcode':
        if (typeof value === 'string') {
          whereClauseParts.push(`${key} = '${escapeSqlString(value)}'`);
        } else if (Array.isArray(value) && value.length > 0) {
          const valuesStr = value.map(v => `'${escapeSqlString(String(v))}'`).join(',');
          whereClauseParts.push(`${key} IN (${valuesStr})`);
        }
        break;

      // Handle neighborhood field which is always an array in Claude's response
      case 'neighborhood':
        if (Array.isArray(value) && value.length > 0) {
          // Get all child neighborhoods for each parent neighborhood
          const allNeighborhoods = [];
          
          // Process each neighborhood from Claude's response
          for (const neighborhood of value) {
            try {
              // Get all child neighborhoods including the parent
              const childNeighborhoods = await getAllChildNeighborhoods(neighborhood) as { name: string }[];
              
              // Format neighborhood names: lowercase and replace spaces with hyphens
              const formattedNeighborhoods = childNeighborhoods.map((item: { name: string }) =>
                item.name.toLowerCase().replace(/\s+/g, '-')
              );
              
              // Add to the complete list
              allNeighborhoods.push(...formattedNeighborhoods);
            } catch {
              // If there's an error, just add the original neighborhood
              allNeighborhoods.push(neighborhood.toLowerCase().replace(/\s+/g, '-'));
            }
          }

          // Remove duplicates
          const uniqueNeighborhoods = [...new Set(allNeighborhoods)];

          // Set the query condition if we have neighborhoods
          if (uniqueNeighborhoods.length > 0) {
            const valuesStr = uniqueNeighborhoods.map(n => `'${escapeSqlString(n)}'`).join(',');
            whereClauseParts.push(`${key} IN (${valuesStr})`);
          }
        }
        break;

      // Handle tag_list field which is always an array in Claude's response
      case 'tag_list':
        if (Array.isArray(value) && value.length > 0) {
          // Use tag_list for the query
          const tagsArray = value.map(tag => `'${escapeSqlString(String(tag))}'`).join(',');
          whereClauseParts.push(`tag_list && ARRAY[${tagsArray}]`);

          // Store in tagArray for ranking
          tagArray.push(...value.map(String));
        }
        break;

      // Handle amenities field which is always an array in Claude's response
      case 'amenities':
        if (Array.isArray(value) && value.length > 0) {
          const amenitiesArray = value.map(amenity => `'${escapeSqlString(String(amenity))}'`).join(',');
          whereClauseParts.push(`amenities && ARRAY[${amenitiesArray}]`);
        }
        break;

      // Handle boolean fields
      case 'no_fee':
        if (typeof value === 'boolean') {
          whereClauseParts.push(`${key} = ${value}`);
        }
        break;

      // Handle address field, match on lower case
      case 'address':
        if (typeof value === 'string') {
          // Escape % and _ which are LIKE wildcards, then escape SQL quotes
          const escapedValue = escapeSqlString(value.toLowerCase().replace(/%/g, '\\%').replace(/_/g, '\\_'));
          whereClauseParts.push(`LOWER(${key}) ILIKE '%${escapedValue}%'`);
        }
        break;

      // Default case: assign value directly if it doesn't match any specific case
      default:
        // Only add if the value is not null or undefined
        // Only handle known safe column names
        if (value !== null && value !== undefined && isValidIdentifier(key)) {
          // For simplicity, we'll skip complex fields in the default case
          // and only handle strings and numbers
          if (typeof value === 'string') {
            whereClauseParts.push(`${key} = '${escapeSqlString(value)}'`);
          } else if (typeof value === 'number') {
            whereClauseParts.push(`${key} = ${value}`);
          }
        }
        break;
    }
  }
  
  // Always add id IS NOT NULL
  whereClauseParts.push(`id IS NOT NULL`);
  
  // Build the WHERE clause
  const whereClause = whereClauseParts.length > 0 
    ? `WHERE ${whereClauseParts.join(' AND ')}` 
    : '';
  
  // Create tag arrays for safe interpolation
  const tagValues = tagArray.length > 0 ? Prisma.sql`ARRAY[${Prisma.join(tagArray.map(tag => tag))}]` : Prisma.empty;
  
  // Build the final SQL query with tagged template literals
  let baseQuery;
  
  if (tagArray.length > 0) {
    // If we have tags, use a more optimized query that filters out listings without matching tags
    // Use a subquery to avoid GROUP BY issues
    baseQuery = Prisma.sql`
      WITH matched_properties AS (
        SELECT *, 
               array_length(array(
                 SELECT unnest(tag_list) 
                 INTERSECT 
                 SELECT unnest(${tagValues})
               ), 1) as tag_match_count
        FROM "real_estate"."latest_properties_materialized"
        ${Prisma.raw(whereClause)}
      )
      SELECT * FROM matched_properties
      WHERE tag_match_count > 0
    `;
  } else {
    // If no tags, use a simpler query
    baseQuery = Prisma.sql`
      SELECT * 
      FROM "real_estate"."latest_properties_materialized"
      ${Prisma.raw(whereClause)}
    `;
  }
  
  // Add ORDER BY if needed
  if (tagArray.length > 0) {
    baseQuery = Prisma.sql`${baseQuery}
    ORDER BY tag_match_count DESC${orderBy ? Prisma.raw(`, ${Object.keys(orderBy)[0]} ${orderBy[Object.keys(orderBy)[0]]}`) : Prisma.empty}
    `;
  } else if (orderBy) {
    baseQuery = Prisma.sql`${baseQuery}
    ORDER BY ${Prisma.raw(`${Object.keys(orderBy)[0]} ${orderBy[Object.keys(orderBy)[0]]}`)}`;
  }
  
  // Add LIMIT and OFFSET
  if (limit) {
    baseQuery = Prisma.sql`${baseQuery} LIMIT ${limit}`;
  }
  
  if (offset) {
    baseQuery = Prisma.sql`${baseQuery} OFFSET ${offset}`;
  }

  return [baseQuery, claudeResults];
}

/**
 * Example usage:
 * 
 * const claudeResults = {
 *   "price": { "min": null, "max": 3000 },
 *   "bedrooms": { "min": 0, "max": 0 },
 *   "property_type": "rental",
 *   "neighborhood": ["chelsea", "greenwich-village", "upper-west-side", "brooklyn-heights", "park-slope", "williamsburg"],
 *   "tag_list": ["City Center 🏙️", "Quiet Neighborhood 🤫", "Near Subway 🚇"]
 * };
 * 
 * const prismaQuery = await parseClaudeResultsToPrismaQuery(claudeResults);
 * 
 * // Use in Prisma query:
 * const properties = await prisma.latest_property_details_view.findMany({
 *   where: prismaQuery,
 *   take: limit,
 *   skip: skip,
 * });
 */
