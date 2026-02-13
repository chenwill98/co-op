import type {
  AnalyticsQuerySpec,
  AnalyticsRenderHint,
  AnalyticsResultColumn,
  AnalyticsTabularResult,
} from "./types";

function isNumericColumn(column: AnalyticsResultColumn): boolean {
  return column.type === "number";
}

function hasColumn(columns: AnalyticsResultColumn[], key: string): boolean {
  return columns.some((column) => column.key === key);
}

function buildHint(
  primary: AnalyticsRenderHint["primary"],
  confidence: number,
  reason?: string
): AnalyticsRenderHint {
  return { primary, confidence, reason };
}

function isCompatible(
  preferred: AnalyticsRenderHint["primary"],
  columns: AnalyticsResultColumn[]
): boolean {
  const numericColumns = columns.filter(isNumericColumn);

  if (preferred === "metric") {
    return numericColumns.length >= 1;
  }

  if (preferred === "line") {
    return hasColumn(columns, "month") && numericColumns.length >= 1;
  }

  if (preferred === "bar") {
    const categoryColumns = columns.filter((column) => !isNumericColumn(column));
    return categoryColumns.length >= 1 && numericColumns.length >= 1;
  }

  if (preferred === "heatmap" || preferred === "map_bubble") {
    return hasColumn(columns, "latitude") && hasColumn(columns, "longitude");
  }

  return true;
}

function toRenderPrimary(
  vizPreference: AnalyticsQuerySpec["vizPreference"]
): AnalyticsRenderHint["primary"] | null {
  if (!vizPreference || vizPreference === "auto") return null;
  return vizPreference;
}

export function selectRenderHint(
  result: AnalyticsTabularResult,
  querySpec: AnalyticsQuerySpec
): AnalyticsRenderHint {
  const columns = result.columns;
  const numericColumns = columns.filter(isNumericColumn);
  const nonNumericColumns = columns.filter((column) => !isNumericColumn(column));
  const explicitPreference = toRenderPrimary(querySpec.vizPreference);

  if (explicitPreference && explicitPreference !== "table") {
    if (isCompatible(explicitPreference, columns)) {
      return buildHint(explicitPreference, 0.95);
    }

    return buildHint(
      "table",
      0.7,
      `Requested visualization \"${explicitPreference}\" is incompatible with current result shape.`
    );
  }

  if (result.rows.length === 0) {
    return buildHint("table", 0.9, "No rows returned for the selected filters.");
  }

  if (hasColumn(columns, "latitude") && hasColumn(columns, "longitude")) {
    if (hasColumn(columns, "neighborhood")) {
      return buildHint("map_bubble", 0.88);
    }
    return buildHint("heatmap", 0.88);
  }

  if (columns.length === 1 && numericColumns.length === 1) {
    return buildHint("metric", 0.92);
  }

  if (hasColumn(columns, "month") && numericColumns.length >= 1) {
    return buildHint("line", 0.9);
  }

  if (nonNumericColumns.length >= 1 && numericColumns.length >= 1) {
    return buildHint("bar", 0.85);
  }

  return buildHint("table", 0.75);
}
