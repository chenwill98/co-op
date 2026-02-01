import { z } from "zod";
import prisma from "../prisma";

// Valid neighborhoods loaded from DB at startup
let validNeighborhoods: string[] = [];
let neighborhoodsLoaded = false;

// Valid property types from the schema
const VALID_PROPERTY_TYPES = [
  "condo",
  "rental",
  "townhouse",
  "house",
  "coop",
  "multi-family",
  "condop",
] as const;

// Valid amenities from the schema
const VALID_AMENITIES = [
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
  "nyc_evacuation_5",
] as const;

// Range schema for numeric fields
const RangeSchema = z
  .object({
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
  })
  .optional();

// Main search filters schema
export const SearchFiltersSchema = z.object({
  price: z
    .object({
      min: z.number().min(0).max(100000000).nullable().optional(),
      max: z.number().min(0).max(100000000).nullable().optional(),
    })
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        if (val.min != null && val.max != null) {
          return val.min <= val.max;
        }
        return true;
      },
      { message: "Price min cannot exceed max" }
    ),

  bedrooms: z
    .object({
      min: z.number().min(0).max(20).nullable().optional(),
      max: z.number().min(0).max(20).nullable().optional(),
    })
    .optional(),

  bathrooms: z
    .object({
      min: z.number().min(0).max(20).nullable().optional(),
      max: z.number().min(0).max(20).nullable().optional(),
    })
    .optional(),

  sqft: RangeSchema,

  built_in: RangeSchema,

  brokers_fee: RangeSchema,

  days_on_market: RangeSchema,

  property_type: z
    .union([z.enum(VALID_PROPERTY_TYPES), z.array(z.enum(VALID_PROPERTY_TYPES))])
    .optional(),

  neighborhood: z.array(z.string()).optional(),

  borough: z.union([z.string(), z.array(z.string())]).optional(),

  zipcode: z.union([z.string(), z.array(z.string())]).optional(),

  tag_list: z.array(z.string()).optional(),

  amenities: z.array(z.string()).optional(),

  no_fee: z.boolean().optional(),

  address: z.string().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Load valid neighborhoods from DB (cached after first call)
 */
export async function loadValidNeighborhoods(): Promise<string[]> {
  if (neighborhoodsLoaded) {
    return validNeighborhoods;
  }

  try {
    const hoods = await prisma.neighborhoods_enhanced_view.findMany({
      select: { name: true },
      where: { level: { in: [3, 4, 5] } },
    });
    validNeighborhoods = hoods.map((h) => h.name.toLowerCase());
    neighborhoodsLoaded = true;
  } catch (error) {
    console.error("Failed to load neighborhoods:", error);
    // Continue with empty list - validation will be permissive
  }

  return validNeighborhoods;
}

/**
 * Get valid neighborhoods (use cached value if available)
 */
export function getValidNeighborhoods(): string[] {
  return validNeighborhoods;
}

/**
 * Find similar neighborhoods using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find similar neighborhood names for suggestions
 */
export function findSimilarNeighborhoods(
  invalidNames: string[],
  maxSuggestions: number = 3
): string[] {
  const suggestions: string[] = [];

  for (const invalid of invalidNames) {
    const invalidLower = invalid.toLowerCase();

    // Find neighborhoods with similar names
    const scored = validNeighborhoods
      .map((valid) => ({
        name: valid,
        distance: levenshteinDistance(invalidLower, valid),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxSuggestions);

    // Only suggest if reasonably close (distance < half the input length)
    for (const s of scored) {
      if (s.distance < Math.max(3, invalidLower.length / 2)) {
        if (!suggestions.includes(s.name)) {
          suggestions.push(s.name);
        }
      }
    }
  }

  return suggestions.slice(0, maxSuggestions);
}

/**
 * Validate amenities against known list
 */
export function validateAmenities(amenities: string[]): {
  valid: string[];
  invalid: string[];
} {
  const amenitySet = new Set(VALID_AMENITIES as readonly string[]);
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const amenity of amenities) {
    if (amenitySet.has(amenity)) {
      valid.push(amenity);
    } else {
      invalid.push(amenity);
    }
  }

  return { valid, invalid };
}

/**
 * Validate neighborhoods against DB list
 */
export async function validateNeighborhoods(neighborhoods: string[]): Promise<{
  valid: string[];
  invalid: string[];
}> {
  await loadValidNeighborhoods();

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const hood of neighborhoods) {
    const hoodLower = hood.toLowerCase();
    if (validNeighborhoods.includes(hoodLower)) {
      valid.push(hood);
    } else {
      invalid.push(hood);
    }
  }

  return { valid, invalid };
}
