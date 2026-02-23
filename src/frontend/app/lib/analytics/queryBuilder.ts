import { Prisma } from "@prisma/client";
import {
  clampLimit,
  MAX_ANALYTICS_ROWS,
} from "./schemas";
import type {
  AnalyticsQuerySpec,
  AnalyticsResultColumn,
  AnalyticsRowValue,
} from "./types";

const CURRENT_ALIAS = "lp";
const TREND_FACT_ALIAS = "fp";
const TREND_DIM_ALIAS = "d";

function measureAlias(index: number, preferred?: string): string {
  if (preferred) {
    return preferred
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || `metric_${index + 1}`;
  }
  return `metric_${index + 1}`;
}

function getPriceColumn(dataset: AnalyticsQuerySpec["dataset"]): string {
  return dataset === "trend"
    ? `${TREND_FACT_ALIAS}.price`
    : `${CURRENT_ALIAS}.price`;
}

function getColumnForFilter(dataset: AnalyticsQuerySpec["dataset"], key: string): string {
  if (dataset === "trend") {
    const trendMap: Record<string, string> = {
      borough: `${TREND_DIM_ALIAS}.borough`,
      neighborhood: `${TREND_DIM_ALIAS}.neighborhood`,
      zipcode: `${TREND_DIM_ALIAS}.zipcode`,
      propertyType: `${TREND_DIM_ALIAS}.property_type`,
      bedrooms: `${TREND_DIM_ALIAS}.bedrooms`,
      bathrooms: `${TREND_DIM_ALIAS}.bathrooms`,
      noFee: `${TREND_DIM_ALIAS}.no_fee`,
      amenities: `${TREND_DIM_ALIAS}.amenities`,
      tags: `${TREND_DIM_ALIAS}.tag_list`,
      date: `${TREND_FACT_ALIAS}.date`,
      latitude: `${TREND_DIM_ALIAS}.latitude`,
      longitude: `${TREND_DIM_ALIAS}.longitude`,
    };
    return trendMap[key] ?? "";
  }

  const currentMap: Record<string, string> = {
    borough: `${CURRENT_ALIAS}.borough`,
    neighborhood: `${CURRENT_ALIAS}.neighborhood`,
    zipcode: `${CURRENT_ALIAS}.zipcode`,
    propertyType: `${CURRENT_ALIAS}.property_type`,
    bedrooms: `${CURRENT_ALIAS}.bedrooms`,
    bathrooms: `${CURRENT_ALIAS}.bathrooms`,
    noFee: `${CURRENT_ALIAS}.no_fee`,
    amenities: `${CURRENT_ALIAS}.amenities`,
    tags: `${CURRENT_ALIAS}.tag_list`,
    date: `${CURRENT_ALIAS}.listed_at`,
    latitude: `${CURRENT_ALIAS}.latitude`,
    longitude: `${CURRENT_ALIAS}.longitude`,
  };

  return currentMap[key] ?? "";
}

function getDimensionExpression(
  dataset: AnalyticsQuerySpec["dataset"],
  dimension: string
): { selectExpression: string; groupExpression: string; type: AnalyticsResultColumn["type"] } {
  if (dimension === "month") {
    if (dataset === "trend") {
      return {
        selectExpression: `DATE_TRUNC('month', ${TREND_FACT_ALIAS}.date)::date AS month`,
        groupExpression: `DATE_TRUNC('month', ${TREND_FACT_ALIAS}.date)::date`,
        type: "date",
      };
    }

    return {
      selectExpression: `DATE_TRUNC('month', ${CURRENT_ALIAS}.listed_at)::date AS month`,
      groupExpression: `DATE_TRUNC('month', ${CURRENT_ALIAS}.listed_at)::date`,
      type: "date",
    };
  }

  const column = getColumnForFilter(dataset, dimension === "property_type" ? "propertyType" : dimension);

  return {
    selectExpression: `${column} AS ${dimension}`,
    groupExpression: column,
    type: "string",
  };
}

function buildMeasureExpression(
  dataset: AnalyticsQuerySpec["dataset"],
  measure: AnalyticsQuerySpec["measures"][number],
  index: number
): { selectExpression: string; alias: string; type: AnalyticsResultColumn["type"] } {
  const alias = measureAlias(index, measure.alias ?? `${measure.op}_${measure.field}`);
  const priceColumn = getPriceColumn(dataset);

  if (measure.op === "count") {
    return {
      selectExpression: `COUNT(*)::int AS ${alias}`,
      alias,
      type: "number",
    };
  }

  if (measure.field !== "price") {
    return {
      selectExpression: `COUNT(*)::int AS ${alias}`,
      alias,
      type: "number",
    };
  }

  const aggregateExpression =
    measure.op === "avg"
      ? `AVG(${priceColumn})`
      : measure.op === "median"
        ? `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${priceColumn})`
        : measure.op === "min"
          ? `MIN(${priceColumn})`
          : `MAX(${priceColumn})`;

  return {
    selectExpression: `${aggregateExpression}::float AS ${alias}`,
    alias,
    type: "number",
  };
}

function joinWithAnd(parts: Prisma.Sql[]): Prisma.Sql {
  if (parts.length === 0) {
    return Prisma.sql`TRUE`;
  }

  return parts.slice(1).reduce((acc, part) => Prisma.sql`${acc} AND ${part}`, parts[0]);
}

function buildWhereClauses(spec: AnalyticsQuerySpec): Prisma.Sql[] {
  const filters = spec.filters;
  const whereParts: Prisma.Sql[] = [];

  if (!filters) {
    return whereParts;
  }

  const boroughColumn = getColumnForFilter(spec.dataset, "borough");
  const neighborhoodColumn = getColumnForFilter(spec.dataset, "neighborhood");
  const zipcodeColumn = getColumnForFilter(spec.dataset, "zipcode");
  const propertyTypeColumn = getColumnForFilter(spec.dataset, "propertyType");
  const noFeeColumn = getColumnForFilter(spec.dataset, "noFee");
  const bedroomsColumn = getColumnForFilter(spec.dataset, "bedrooms");
  const bathroomsColumn = getColumnForFilter(spec.dataset, "bathrooms");
  const amenitiesColumn = getColumnForFilter(spec.dataset, "amenities");
  const tagColumn = getColumnForFilter(spec.dataset, "tags");
  const dateColumn = getColumnForFilter(spec.dataset, "date");
  const priceColumn = getPriceColumn(spec.dataset);

  if (filters.borough?.length) {
    whereParts.push(Prisma.sql`${Prisma.raw(boroughColumn)} IN (${Prisma.join(filters.borough)})`);
  }

  if (filters.neighborhood?.length) {
    whereParts.push(
      Prisma.sql`${Prisma.raw(neighborhoodColumn)} IN (${Prisma.join(filters.neighborhood)})`
    );
  }

  if (filters.zipcode?.length) {
    whereParts.push(Prisma.sql`${Prisma.raw(zipcodeColumn)} IN (${Prisma.join(filters.zipcode)})`);
  }

  if (filters.propertyType?.length) {
    whereParts.push(
      Prisma.sql`${Prisma.raw(propertyTypeColumn)} IN (${Prisma.join(filters.propertyType)})`
    );
  }

  if (filters.noFee != null) {
    whereParts.push(Prisma.sql`${Prisma.raw(noFeeColumn)} = ${filters.noFee}`);
  }

  if (filters.price?.min != null) {
    whereParts.push(Prisma.sql`${Prisma.raw(priceColumn)} >= ${filters.price.min}`);
  }

  if (filters.price?.max != null) {
    whereParts.push(Prisma.sql`${Prisma.raw(priceColumn)} <= ${filters.price.max}`);
  }

  if (filters.bedrooms?.min != null) {
    whereParts.push(Prisma.sql`${Prisma.raw(bedroomsColumn)} >= ${filters.bedrooms.min}`);
  }

  if (filters.bedrooms?.max != null) {
    whereParts.push(Prisma.sql`${Prisma.raw(bedroomsColumn)} <= ${filters.bedrooms.max}`);
  }

  if (filters.bathrooms?.min != null) {
    whereParts.push(Prisma.sql`${Prisma.raw(bathroomsColumn)} >= ${filters.bathrooms.min}`);
  }

  if (filters.bathrooms?.max != null) {
    whereParts.push(Prisma.sql`${Prisma.raw(bathroomsColumn)} <= ${filters.bathrooms.max}`);
  }

  if (filters.petFriendly) {
    whereParts.push(
      Prisma.sql`${Prisma.raw(amenitiesColumn)} && ARRAY['pets', 'cats', 'dogs']::text[]`
    );
  }

  if (filters.tags?.length) {
    whereParts.push(
      Prisma.sql`${Prisma.raw(tagColumn)} && ARRAY[${Prisma.join(filters.tags)}]::text[]`
    );
  }

  if (filters.date?.start) {
    whereParts.push(
      Prisma.sql`${Prisma.raw(dateColumn)} >= CAST(${filters.date.start} AS date)`
    );
  }

  if (filters.date?.end) {
    whereParts.push(
      Prisma.sql`${Prisma.raw(dateColumn)} <= CAST(${filters.date.end} AS date)`
    );
  }

  if (filters.date?.lastMonths) {
    whereParts.push(
      Prisma.sql`${Prisma.raw(dateColumn)} >= date_trunc('month', now()) - (${filters.date.lastMonths} * interval '1 month')`
    );
  }

  return whereParts;
}

function getFromClause(dataset: AnalyticsQuerySpec["dataset"]): Prisma.Sql {
  if (dataset === "trend") {
    return Prisma.raw(
      `"real_estate"."fct_properties" ${TREND_FACT_ALIAS} INNER JOIN "real_estate"."dim_property_details" ${TREND_DIM_ALIAS} ON ${TREND_DIM_ALIAS}.id = ${TREND_FACT_ALIAS}.id`
    );
  }

  return Prisma.raw(`"real_estate"."latest_properties_materialized" ${CURRENT_ALIAS}`);
}

function toLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export type BuiltAnalyticsQuery = {
  query: Prisma.Sql;
  columns: AnalyticsResultColumn[];
  effectiveLimit: number;
  isHeatmap: boolean;
};

export function buildAnalyticsQuery(spec: AnalyticsQuerySpec): BuiltAnalyticsQuery {
  const safeLimit = clampLimit(spec.limit);
  const limitWithSentinel = Math.min(safeLimit + 1, MAX_ANALYTICS_ROWS + 1);
  const dimensions = spec.dimensions ?? [];

  const whereParts = buildWhereClauses(spec);
  const whereSql = joinWithAnd(whereParts);

  if (spec.vizPreference === "heatmap") {
    const latColumn = getColumnForFilter(spec.dataset, "latitude");
    const lngColumn = getColumnForFilter(spec.dataset, "longitude");
    const priceColumn = getPriceColumn(spec.dataset);

    const query = Prisma.sql`
      SELECT
        ${Prisma.raw(latColumn)}::float AS latitude,
        ${Prisma.raw(lngColumn)}::float AS longitude,
        ${Prisma.raw(priceColumn)}::float AS weight
      FROM ${getFromClause(spec.dataset)}
      WHERE ${whereSql}
        AND ${Prisma.raw(latColumn)} IS NOT NULL
        AND ${Prisma.raw(lngColumn)} IS NOT NULL
      ORDER BY ${Prisma.raw(priceColumn)} DESC
      LIMIT ${limitWithSentinel}
    `;

    return {
      query,
      effectiveLimit: safeLimit,
      isHeatmap: true,
      columns: [
        { key: "latitude", label: "Latitude", type: "number" },
        { key: "longitude", label: "Longitude", type: "number" },
        { key: "weight", label: "Weight", type: "number" },
      ],
    };
  }

  const selectParts: Prisma.Sql[] = [];
  const groupByExpressions: Prisma.Sql[] = [];
  const columns: AnalyticsResultColumn[] = [];
  const sortableAliases = new Set<string>();

  for (const dimension of dimensions) {
    const def = getDimensionExpression(spec.dataset, dimension);
    selectParts.push(Prisma.raw(def.selectExpression));
    groupByExpressions.push(Prisma.raw(def.groupExpression));
    columns.push({ key: dimension, label: toLabel(dimension), type: def.type });
    sortableAliases.add(dimension);
  }

  const measureAliases: string[] = [];

  for (const [index, measure] of spec.measures.entries()) {
    const measureExpression = buildMeasureExpression(spec.dataset, measure, index);
    selectParts.push(Prisma.raw(measureExpression.selectExpression));
    measureAliases.push(measureExpression.alias);
    sortableAliases.add(measureExpression.alias);
    columns.push({
      key: measureExpression.alias,
      label: toLabel(measureExpression.alias),
      type: measureExpression.type,
    });
  }

  const includeMapBubbleCoords =
    spec.vizPreference === "map_bubble" && dimensions.includes("neighborhood");

  if (includeMapBubbleCoords) {
    const latColumn = getColumnForFilter(spec.dataset, "latitude");
    const lngColumn = getColumnForFilter(spec.dataset, "longitude");
    selectParts.push(Prisma.raw(`AVG(${latColumn})::float AS latitude`));
    selectParts.push(Prisma.raw(`AVG(${lngColumn})::float AS longitude`));
    columns.push({ key: "latitude", label: "Latitude", type: "number" });
    columns.push({ key: "longitude", label: "Longitude", type: "number" });
    sortableAliases.add("latitude");
    sortableAliases.add("longitude");
  }

  const groupBySql =
    groupByExpressions.length > 0
      ? Prisma.sql`GROUP BY ${Prisma.join(groupByExpressions, ", ")}`
      : Prisma.empty;

  const defaultOrderField = dimensions.includes("month")
    ? "month"
    : measureAliases[0] ?? columns[0]?.key;

  const defaultOrderDirection = dimensions.includes("month") ? "asc" : "desc";

  const requestedOrderField = spec.sort?.field;
  const orderField = requestedOrderField && sortableAliases.has(requestedOrderField)
    ? requestedOrderField
    : defaultOrderField;

  const orderDirection = spec.sort?.direction ?? defaultOrderDirection;

  const orderSql = orderField
    ? Prisma.sql`ORDER BY ${Prisma.raw(orderField)} ${Prisma.raw(
        orderDirection.toUpperCase() === "ASC" ? "ASC" : "DESC"
      )}`
    : Prisma.empty;

  const query = Prisma.sql`
    SELECT ${Prisma.join(selectParts, ", ")}
    FROM ${getFromClause(spec.dataset)}
    WHERE ${whereSql}
    ${groupBySql}
    ${orderSql}
    LIMIT ${limitWithSentinel}
  `;

  return {
    query,
    columns,
    effectiveLimit: safeLimit,
    isHeatmap: false,
  };
}

export function normalizeResultValue(value: unknown): AnalyticsRowValue {
  if (value == null) return null;

  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    if ("toNumber" in (value as { toNumber?: unknown }) && typeof (value as { toNumber?: () => number }).toNumber === "function") {
      return (value as { toNumber: () => number }).toNumber();
    }

    if ("toString" in (value as { toString?: unknown }) && typeof (value as { toString?: () => string }).toString === "function") {
      return (value as { toString: () => string }).toString();
    }
  }

  return String(value);
}
