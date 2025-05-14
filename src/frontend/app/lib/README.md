# Claude Query Parser

This module provides functionality to parse Claude AI's structured responses into Prisma query filters for a real estate application.

## Overview

The Claude Query Parser takes the structured output from Claude AI and converts it into a format that can be directly used in Prisma database queries. This allows for natural language queries to be translated into database filters.

## Files

- `claudeQueryParser.js` - The main parser function that converts Claude's response to Prisma query format
- `claudeQueryParser.test.ts` - A test file demonstrating usage with sample data
- `claudeQueryParser.ts` - TypeScript version of the parser (optional)

## Usage

### Basic Usage

```javascript
const { parseClaudeResultsToPrismaQuery } = require('./claudeQueryParser');

// Sample Claude response
const claudeResults = {
  "price": { "min": null, "max": 3000 },
  "bedrooms": { "min": 2, "max": 2 },
  "property_type": "rental",
  "neighborhood": ["chelsea", "greenwich-village"],
  "tag_list": ["City Center 🏙️", "Near Subway 🚇"]
};

// Parse into Prisma query format
const prismaQuery = parseClaudeResultsToPrismaQuery(claudeResults);

// Use in Prisma query
const properties = await prisma.latest_properties_materialized.findMany({
  where: prismaQuery,
  take: 10,
  skip: 0,
});
```

### Integration with Claude API

```javascript
// In your API handler
async function handleSearchQuery(searchText) {
  // Get Claude results
  const claudeResults = await fetchClaudeSearchResult(searchText)
    .then((results) => results?.content?.[1]?.input?.database_schema ?? {});
    
  // Parse Claude results into Prisma filters
  const prismaQuery = parseClaudeResultsToPrismaQuery(claudeResults);
  
  // Execute database query with the filters
  const properties = await prisma.latest_properties_materialized.findMany({
    where: prismaQuery,
    take: 10,
    skip: 0,
  });
  
  return properties;
}
```

## Supported Fields

The parser handles the following fields from Claude's response:

- **price**: Range with min/max values
- **bedrooms/bathrooms**: Range with min/max values
- **property_type**: String value (rental, condo, townhouse, house)
- **neighborhood**: Array of neighborhood names
- **borough**: String or array of borough names
- **zipcode**: String or array of zipcode values
- **tag_list**: Array of tags
- **amenities**: Array of amenity names
- **sqft**: Range with min/max values
- **no_fee**: Boolean value

## Prisma Query Operators

The parser uses the following Prisma operators:

- `equals`: For exact matches
- `in`: For array values (neighborhoods, boroughs, etc.)
- `gte/lte`: For range values (price, sqft, etc.)
- `hasSome`: For array fields like tag_list and amenities
- `mode: 'insensitive'`: For case-insensitive text matching

## Error Handling

The parser gracefully handles missing or null values:
- If a field is null, undefined, or empty, it's skipped
- If a range has only min or max, only the relevant operator is added
- Empty objects are removed to avoid unnecessary filters
