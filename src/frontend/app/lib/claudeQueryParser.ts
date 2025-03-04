import { getAllChildNeighborhoods } from './data';

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
  [key: string]: any;
}

/**
 * Parses Claude's response and converts it into a Prisma query filter
 * @param claudeResults - The response from Claude AI
 * @returns A Prisma-compatible where condition object
 */
export async function parseClaudeResultsToPrismaQuery(claudeResults: ClaudeResponse): Promise<Record<string, any>> {
  // Initialize the where condition object
  const whereCondition: Record<string, any> = {};

  // Add debugging to check input type
  console.log('Claude results type:', typeof claudeResults);
  
  // Handle case where claudeResults is a string
  if (typeof claudeResults === 'string') {
    try {
      console.log('Attempting to parse string claudeResults');
      claudeResults = JSON.parse(claudeResults);
    } catch (error) {
      console.error('Failed to parse claudeResults string:', error);
      return whereCondition;
    }
  }

  // Return empty object if claudeResults is empty or undefined
  if (!claudeResults || Object.keys(claudeResults).length === 0) {
    console.log('Claude results is empty or undefined');
    return whereCondition;
  }

  console.log('Processing Claude results:', JSON.stringify(claudeResults, null, 2));

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
      case 'live_days_on_market':
        whereCondition[key] = {};
        
        // If min and max are the same and not null, use equals
        if (value.min !== null && value.min === value.max && value.min > 0) {
          whereCondition[key] = { equals: Number(value.min) };
        } else {
          if (value.min !== null && value.min !== undefined && value.min > 0) {
            whereCondition[key].gte = Number(value.min);
          }
          if (value.max !== null && value.max !== undefined && value.max > 0) {
            whereCondition[key].lte = Number(value.max);
          }
        }
        
        // If the whereCondition[key] is empty, remove it
        if (Object.keys(whereCondition[key]).length === 0) {
          delete whereCondition[key];
        }
        break;

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
              const formattedNeighborhoods = childNeighborhoods.map((item: any) => 
                item.name.toLowerCase().replace(/\s+/g, '-')
              );
              
              // Add to the complete list
              allNeighborhoods.push(...formattedNeighborhoods);
            } catch (error) {
              console.error(`Error getting child neighborhoods for ${neighborhood}:`, error);
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
          whereCondition[key] = { 
            hasEvery: value 
          };
        }
        break;

      // Handle amenities field which is always an array in Claude's response
      case 'amenities':
        if (Array.isArray(value) && value.length > 0) {
          whereCondition[key] = { 
            hasEvery: value 
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

  return whereCondition;
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
