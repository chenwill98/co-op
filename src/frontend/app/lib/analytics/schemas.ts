import { z } from "zod";
import type { AnalyticsQuerySpec } from "./types";

export const MAX_ANALYTICS_ROWS = 50;
export const DEFAULT_ANALYTICS_ROWS = 20;
export const DEFAULT_TREND_MONTHS = 12;

export const ALLOWED_DIMENSIONS = [
  "borough",
  "neighborhood",
  "zipcode",
  "property_type",
  "month",
] as const;

export const ALLOWED_DATASETS = ["current", "trend"] as const;

export const ALLOWED_VIZ = [
  "auto",
  "table",
  "bar",
  "line",
  "metric",
  "heatmap",
  "map_bubble",
] as const;

const DateRangeSchema = z
  .object({
    start: z.string().date().optional(),
    end: z.string().date().optional(),
    lastMonths: z.number().int().min(1).max(36).optional(),
  })
  .optional();

const NumberRangeSchema = z
  .object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .optional()
  .refine((value) => {
    if (!value) return true;
    if (value.min == null || value.max == null) return true;
    return value.min <= value.max;
  }, "Range min cannot exceed max");

const MeasureSchema = z.object({
  op: z.enum(["avg", "median", "min", "max", "count"]),
  field: z.enum(["price", "listings"]),
  alias: z.string().trim().min(1).max(50).optional(),
});

const FiltersSchema = z
  .object({
    borough: z.array(z.string().trim().min(1)).max(20).optional(),
    neighborhood: z.array(z.string().trim().min(1)).max(50).optional(),
    zipcode: z.array(z.string().trim().min(1)).max(25).optional(),
    propertyType: z.array(z.string().trim().min(1)).max(10).optional(),
    price: NumberRangeSchema,
    bedrooms: NumberRangeSchema,
    bathrooms: NumberRangeSchema,
    noFee: z.boolean().optional(),
    petFriendly: z.boolean().optional(),
    tags: z.array(z.string().trim().min(1)).max(10).optional(),
    date: DateRangeSchema,
  })
  .optional();

export const AnalyticsQuerySpecSchema = z.object({
  dataset: z.enum(ALLOWED_DATASETS),
  measures: z.array(MeasureSchema).min(1).max(3),
  dimensions: z.array(z.enum(ALLOWED_DIMENSIONS)).max(2).optional(),
  filters: FiltersSchema,
  timeBucket: z.enum(["month"]).optional(),
  sort: z
    .object({
      field: z.string().trim().min(1),
      direction: z.enum(["asc", "desc"]),
    })
    .optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  vizPreference: z.enum(ALLOWED_VIZ).optional(),
});

export type AnalyticsQuerySpecInput = z.infer<typeof AnalyticsQuerySpecSchema>;

export function clampLimit(requested?: number): number {
  if (!requested || Number.isNaN(requested)) return DEFAULT_ANALYTICS_ROWS;
  return Math.min(Math.max(1, Math.trunc(requested)), MAX_ANALYTICS_ROWS);
}

export function normalizeQuerySpec(
  input: AnalyticsQuerySpec,
  existing?: AnalyticsQuerySpec
): AnalyticsQuerySpec {
  const merged: AnalyticsQuerySpec = {
    ...(existing ?? {}),
    ...input,
    filters: {
      ...(existing?.filters ?? {}),
      ...(input.filters ?? {}),
      price: {
        ...(existing?.filters?.price ?? {}),
        ...(input.filters?.price ?? {}),
      },
      bedrooms: {
        ...(existing?.filters?.bedrooms ?? {}),
        ...(input.filters?.bedrooms ?? {}),
      },
      bathrooms: {
        ...(existing?.filters?.bathrooms ?? {}),
        ...(input.filters?.bathrooms ?? {}),
      },
      date: {
        ...(existing?.filters?.date ?? {}),
        ...(input.filters?.date ?? {}),
      },
    },
  };

  const dimensions = merged.dimensions ?? [];
  const hasMonthDimension = dimensions.includes("month") || merged.timeBucket === "month";
  const inferredDataset = merged.dataset === "trend" || hasMonthDimension ? "trend" : "current";

  if (merged.filters?.borough) {
    merged.filters.borough = merged.filters.borough.map((item) => item.toLowerCase());
  }

  if (merged.filters?.propertyType) {
    merged.filters.propertyType = merged.filters.propertyType.map((item) =>
      item.toLowerCase()
    );
  }

  if (merged.filters?.neighborhood) {
    merged.filters.neighborhood = merged.filters.neighborhood.map((item) =>
      item.toLowerCase().replace(/\s+/g, "-")
    );
  }

  if (merged.filters?.tags) {
    merged.filters.tags = merged.filters.tags.map((item) => item.toLowerCase());
  }

  merged.dataset = inferredDataset;
  merged.vizPreference = merged.vizPreference ?? "auto";

  if (inferredDataset === "trend") {
    const nextFilters = merged.filters ?? {};
    const dateFilter = nextFilters.date ?? {};

    if (!dateFilter.start && !dateFilter.end && !dateFilter.lastMonths) {
      dateFilter.lastMonths = DEFAULT_TREND_MONTHS;
    }

    merged.filters = {
      ...nextFilters,
      date: dateFilter,
    };

    if (!dimensions.includes("month")) {
      merged.dimensions = [...dimensions, "month"];
    }
    merged.timeBucket = "month";
  }

  // Scalar results should default to one row unless explicitly grouped.
  const effectiveDimensions = merged.dimensions ?? [];
  if (effectiveDimensions.length === 0 && merged.vizPreference !== "heatmap") {
    merged.limit = 1;
  } else {
    merged.limit = clampLimit(merged.limit);
  }

  // Aggregate-only Top-N guardrail.
  if (merged.limit && merged.limit > 1 && effectiveDimensions.length === 0 && merged.vizPreference !== "heatmap") {
    merged.limit = 1;
  }

  return merged;
}

export function isSupportedQuerySpec(spec: AnalyticsQuerySpec): {
  valid: boolean;
  reason?: string;
} {
  if (spec.dataset === "trend" && spec.vizPreference === "heatmap") {
    return {
      valid: false,
      reason: "Heatmap is only supported for current listing snapshots.",
    };
  }

  if (spec.vizPreference === "line" && !(spec.dimensions ?? []).includes("month")) {
    return {
      valid: false,
      reason: "Line charts require a monthly time dimension.",
    };
  }

  return { valid: true };
}
