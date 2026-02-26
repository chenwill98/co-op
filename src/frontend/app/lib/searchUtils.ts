import type { Property } from "./definitions";
import { resolveTagConflicts } from "./tagUtils";

/**
 * Raw property type from Prisma $queryRaw results.
 * Prisma returns Decimal/Date objects that need manual conversion.
 */
export type RawProperty = {
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
  fct_price?: unknown;
  relevance_score?: { toNumber: () => number };
  ai_tags?: string[];
  analytics_tags?: string[];
  tag_list?: string[];
  additional_fees?: unknown;
  description?: string | null;
  description_summary?: string | null;
  images?: string[];
  videos?: string[];
  floorplans?: string[];
};

/**
 * Converts raw Prisma query results into Property objects.
 * Handles Decimal→number, Date→string, and null-safe coercion.
 * Resolves AI vs analytics tag conflicts (analytics size/price tags take precedence).
 */
export function formatRawProperties(rawResults: RawProperty[]): Property[] {
  return rawResults.map(formatRawProperty);
}

/**
 * Converts a single raw Prisma result into a Property object.
 */
export function formatRawProperty(property: RawProperty): Property {
  return {
    ...property,
    price: property.price ? property.price.toNumber() : 0,
    bathrooms: property.bathrooms ? property.bathrooms.toNumber() : null,
    latitude: property.latitude ? String(property.latitude) : "0",
    longitude: property.longitude ? String(property.longitude) : "0",
    listed_at: property.listed_at ? property.listed_at.toDateString() : "",
    closed_at: property.closed_at ? property.closed_at.toDateString() : "",
    available_from: property.available_from ? property.available_from.toDateString() : "",
    loaded_datetime: property.loaded_datetime ? property.loaded_datetime.toDateString() : "",
    date: property.date ? property.date.toDateString() : "",
    brokers_fee: property.brokers_fee ? property.brokers_fee.toNumber() : null,
    fct_price: property.fct_price ?? 0,
    relevance_score: property.relevance_score ? property.relevance_score.toNumber() : null,
    ai_tags: property.ai_tags ?? [],
    analytics_tags: property.analytics_tags ?? [],
    tag_list: resolveTagConflicts(property.ai_tags ?? [], property.analytics_tags ?? []),
    additional_fees: property.additional_fees ?? null,
    description: property.description ?? '',
    description_summary: property.description_summary ?? '',
    images: property.images ?? [],
    videos: property.videos ?? [],
    floorplans: property.floorplans ?? [],
  } as Property;
}

/**
 * Computes the net effective monthly price (base rent + amortized broker fee).
 * Use this instead of inlining the formula to keep the calculation DRY.
 */
export function netEffectivePrice(listing: { price: number; no_fee: boolean; brokers_fee: number | null }): number {
  return listing.no_fee ? listing.price : listing.price + listing.price * (listing.brokers_fee || 0);
}

/**
 * Maps a sort string (from the UI dropdown) to a Prisma orderBy object.
 * Returns undefined for the default "original" sort (which uses relevance_score).
 */
export function sortToOrderBy(sort: string | undefined): Record<string, string> | undefined {
  switch (sort) {
    case "newest":
      return { listed_at: "desc" };
    case "least_expensive":
      return { price: "asc" };
    case "most_expensive":
      return { price: "desc" };
    default:
      return undefined;
  }
}
