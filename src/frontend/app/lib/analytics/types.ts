export type AnalyticsDataset = "current" | "trend";

export type AnalyticsField = "price" | "listings";

export type AnalyticsMeasureOp = "avg" | "median" | "min" | "max" | "count";

export type AnalyticsMeasure = {
  op: AnalyticsMeasureOp;
  field: AnalyticsField;
  alias?: string;
};

export type AnalyticsDimension =
  | "borough"
  | "neighborhood"
  | "zipcode"
  | "property_type"
  | "month";

export type AnalyticsTimeBucket = "month";

export type AnalyticsSortDirection = "asc" | "desc";

export type AnalyticsVizPreference =
  | "auto"
  | "table"
  | "bar"
  | "line"
  | "metric"
  | "heatmap"
  | "map_bubble";

export type AnalyticsQuerySpec = {
  dataset: AnalyticsDataset;
  measures: AnalyticsMeasure[];
  dimensions?: AnalyticsDimension[];
  filters?: {
    borough?: string[];
    neighborhood?: string[];
    zipcode?: string[];
    propertyType?: string[];
    price?: {
      min?: number;
      max?: number;
    };
    bedrooms?: {
      min?: number;
      max?: number;
    };
    bathrooms?: {
      min?: number;
      max?: number;
    };
    noFee?: boolean;
    petFriendly?: boolean;
    tags?: string[];
    date?: {
      start?: string;
      end?: string;
      lastMonths?: number;
    };
  };
  timeBucket?: AnalyticsTimeBucket;
  sort?: {
    field: string;
    direction: AnalyticsSortDirection;
  };
  limit?: number;
  vizPreference?: AnalyticsVizPreference;
};

export type AnalyticsColumnType = "string" | "number" | "date" | "boolean" | "unknown";

export type AnalyticsResultColumn = {
  key: string;
  label: string;
  type: AnalyticsColumnType;
};

export type AnalyticsRowValue = string | number | boolean | null;

export type AnalyticsResultRow = Record<string, AnalyticsRowValue>;

export type AnalyticsTabularResult = {
  columns: AnalyticsResultColumn[];
  rows: AnalyticsResultRow[];
  rowCount: number;
  truncated: boolean;
};

export type AnalyticsRenderPrimary =
  | "metric"
  | "table"
  | "bar"
  | "line"
  | "heatmap"
  | "map_bubble";

export type AnalyticsRenderHint = {
  primary: AnalyticsRenderPrimary;
  confidence: number;
  reason?: string;
};

export type AnalyticsContext = {
  lastQuerySpec?: AnalyticsQuerySpec;
  lastRenderHint?: AnalyticsRenderHint;
};

export type AnalyticsChatRequest = {
  message: string;
  threadId: string;
  existingContext?: AnalyticsContext;
};

export type AnalyticsChatResponse = {
  answerText: string;
  result: AnalyticsTabularResult;
  renderHint: AnalyticsRenderHint;
  context: AnalyticsContext;
};
