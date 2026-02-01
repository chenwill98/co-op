// Sample Claude response for testing
const sampleClaudeResponse = {
  "price": { "min": null, "max": 3000 },
  "bedrooms": { "min": 0, "max": 0 },
  "property_type": "rental",
  "neighborhood": [
    "chelsea", 
    "greenwich-village", 
    "upper-west-side", 
    "brooklyn-heights", 
    "park-slope", 
    "williamsburg"
  ],
  "tag_list": [
    "City Center ", 
    "Quiet Neighborhood ", 
    "Near Subway "
  ]
};

// Import the parser function
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseClaudeResultsToPrismaQuery } = require('./claudeQueryParser');

// Test the parser function
const prismaQuery = parseClaudeResultsToPrismaQuery(sampleClaudeResponse);

// Log the resulting Prisma query
console.log('Prisma Query:');
console.log(JSON.stringify(prismaQuery, null, 2));

// Expected output:
/* 
{
  "price": {
    "lte": 3000
  },
  "property_type": {
    "equals": "rental",
    "mode": "insensitive"
  },
  "neighborhood": {
    "in": [
      "chelsea",
      "greenwich-village",
      "upper-west-side",
      "brooklyn-heights",
      "park-slope",
      "williamsburg"
    ]
  },
  "tag_list": {
    "hasSome": [
      "City Center ",
      "Quiet Neighborhood ",
      "Near Subway "
    ]
  }
}
*/

// More complex example
const complexExample = {
  "price": { "min": 1500, "max": 5000 },
  "bedrooms": { "min": 2, "max": 3 },
  "bathrooms": { "min": 1, "max": 1 },
  "property_type": "condo",
  "sqft": { "min": 800, "max": null },
  "neighborhood": ["williamsburg", "east-village", "upper-west-side"],
  "amenities": ["doorman", "gym", "washer_dryer"],
  "no_fee": true,
  "tag_list": ["Luxury ", "Near Subway ", "Modern Design "]
};

// Test with the complex example
const complexPrismaQuery = parseClaudeResultsToPrismaQuery(complexExample);

// Log the resulting complex Prisma query
console.log('\nComplex Prisma Query:');
console.log(JSON.stringify(complexPrismaQuery, null, 2));

// Expected output:
/*
{
  "price": {
    "gte": 1500,
    "lte": 5000
  },
  "bedrooms": {
    "gte": 2,
    "lte": 3
  },
  "bathrooms": {
    "equals": 1
  },
  "property_type": {
    "equals": "condo",
    "mode": "insensitive"
  },
  "sqft": {
    "gte": 800
  },
  "neighborhood": {
    "in": [
      "williamsburg",
      "east-village",
      "upper-west-side"
    ]
  },
  "amenities": {
    "hasSome": [
      "doorman",
      "gym",
      "washer_dryer"
    ]
  },
  "no_fee": true,
  "tag_list": {
    "hasSome": [
      "Luxury ",
      "Near Subway ",
      "Modern Design "
    ]
  }
}
*/
