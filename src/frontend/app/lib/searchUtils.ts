import type { Property } from "./definitions";

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
  tag_list?: string[];
  additional_fees?: unknown;
};

/**
 * Converts raw Prisma query results into Property objects.
 * Handles Decimal→number, Date→string, and null-safe coercion.
 */
export function formatRawProperties(rawResults: RawProperty[]): Property[] {
  return rawResults.map((property) => ({
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
    tag_list: property.tag_list ?? [],
    additional_fees: property.additional_fees ?? null,
  })) as Property[];
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
