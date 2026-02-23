import { ChatAnthropic } from "@langchain/anthropic";
import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import prisma from "@/app/lib/prisma";
import {
  AnalyticsQuerySpecSchema,
  clampLimit,
  normalizeQuerySpec,
  isSupportedQuerySpec,
} from "@/app/lib/analytics/schemas";
import type {
  AnalyticsQuerySpec,
  AnalyticsResultRow,
  AnalyticsTabularResult,
} from "@/app/lib/analytics/types";
import {
  buildAnalyticsQuery,
  normalizeResultValue,
} from "@/app/lib/analytics/queryBuilder";
import { selectRenderHint } from "@/app/lib/analytics/renderSelector";
import type { AnalyticsAgentStateType } from "./state";

const MODEL_ID = "claude-haiku-4-5-20251001";
const LLM_MAX_RETRIES = 3;
const LLM_RETRY_BASE_DELAY_MS = 1000;

const llm = new ChatAnthropic({
  modelName: MODEL_ID,
  temperature: 0,
  maxTokens: 3000,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const querySpecTool = tool(
  async (input) => JSON.stringify(input),
  {
    name: "build_analytics_query_spec",
    description: `Build an aggregate analytics query spec for NYC housing data.

Rules:
1. Only aggregate-safe analytics are allowed.
2. Never return listing-level row selections like address/id.
3. Allowed measure ops: avg, median, min, max, count.
4. Allowed dimensions: borough, neighborhood, zipcode, property_type, month.
5. Use dataset=trend for time-series questions.
6. Use vizPreference=heatmap only for geospatial density point maps.
7. Keep limits small; never exceed 50.
8. For follow-up prompts, apply the previous query context unless user requests a full reset.
9. Return only this tool call with valid JSON args.`,
    schema: AnalyticsQuerySpecSchema,
  }
);

const llmWithTool = llm.bindTools([querySpecTool], {
  tool_choice: { type: "tool", name: "build_analytics_query_spec" },
});

function inferVizPreferenceFromPrompt(message: string): AnalyticsQuerySpec["vizPreference"] {
  const lower = message.toLowerCase();

  if (lower.includes("heatmap")) return "heatmap";
  if (lower.includes("map")) return "map_bubble";
  if (lower.includes("line chart") || lower.includes("trend") || lower.includes("over time")) {
    return "line";
  }
  if (lower.includes("bar chart") || lower.includes("histogram")) return "bar";
  if (lower.includes("table") || lower.includes("top ")) return "table";
  if (lower.includes("average") || lower.includes("median") || lower.includes("count")) {
    return "metric";
  }

  return "auto";
}

function inferFallbackSpec(
  message: string,
  existing?: AnalyticsQuerySpec
): AnalyticsQuerySpec {
  const lower = message.toLowerCase();
  const mentionsTrend =
    lower.includes("trend") || lower.includes("over time") || lower.includes("monthly");

  const op = lower.includes("median")
    ? "median"
    : lower.includes("minimum") || lower.includes("lowest")
      ? "min"
      : lower.includes("maximum") || lower.includes("highest")
        ? "max"
        : lower.includes("count") || lower.includes("how many")
          ? "count"
          : "avg";

  const dimensions: AnalyticsQuerySpec["dimensions"] = [];
  if (mentionsTrend) dimensions.push("month");
  if (lower.includes("by neighborhood") || lower.includes("neighborhoods")) {
    dimensions.push("neighborhood");
  } else if (lower.includes("by borough") || lower.includes("boroughs")) {
    dimensions.push("borough");
  }

  const boroughFilters: string[] = [];
  const boroughTokens = ["manhattan", "brooklyn", "queens", "bronx", "staten island"];
  for (const token of boroughTokens) {
    if (lower.includes(token)) boroughFilters.push(token);
  }

  return normalizeQuerySpec(
    {
      dataset: mentionsTrend ? "trend" : "current",
      measures: [
        {
          op,
          field: op === "count" ? "listings" : "price",
        },
      ],
      dimensions,
      filters: {
        borough: boroughFilters.length ? boroughFilters : undefined,
        petFriendly:
          lower.includes("pet") || lower.includes("cats") || lower.includes("dogs")
            ? true
            : undefined,
      },
      vizPreference: inferVizPreferenceFromPrompt(message),
      limit: lower.includes("top 10") ? 10 : undefined,
    },
    existing
  );
}

async function invokeLLMWithRetry(
  messages: Array<{ role: string; content: string }>
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < LLM_MAX_RETRIES; attempt += 1) {
    try {
      return await llmWithTool.invoke(messages);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const status = (error as { status?: number }).status;
      const code = (error as { code?: string }).code;

      const retryable = status === 429 || status === 529 || code === "ETIMEDOUT" || code === "ECONNRESET";
      if (!retryable || attempt === LLM_MAX_RETRIES - 1) {
        throw lastError;
      }

      const delay = LLM_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Analytics parser failed");
}

function normalizeMeasureCompatibility(spec: AnalyticsQuerySpec): AnalyticsQuerySpec {
  const normalizedMeasures = spec.measures.map((measure) => {
    if (measure.field === "listings" && measure.op !== "count") {
      return {
        ...measure,
        op: "count" as const,
      };
    }

    if (measure.op === "count") {
      return {
        ...measure,
        field: "listings" as const,
      };
    }

    return measure;
  });

  return {
    ...spec,
    measures: normalizedMeasures,
  };
}

export async function parseAnalyticsQueryNode(
  state: AnalyticsAgentStateType
): Promise<Partial<AnalyticsAgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const userPrompt = typeof lastMessage?.content === "string" ? lastMessage.content : "";

  if (!userPrompt.trim()) {
    return {
      validationError: "Please ask an analytics question.",
      querySpec: null,
    };
  }

  const existingSpec = state.context.lastQuerySpec;

  const systemPrompt = `You transform user questions into an analytics QuerySpec for NYC apartment data.

Data source notes:
- current dataset: current active listings
- trend dataset: historical monthly snapshots

Safety:
- Aggregate-safe output only.
- No listing-level fields (id/address/url/images/agent).
- Max limit is 50.

Follow-up behavior:
- When a user asks a follow-up, keep previous intent and modify relevant fields only by returning a complete updated QuerySpec.`;

  const vizPreference = inferVizPreferenceFromPrompt(userPrompt);

  try {
    const response = await invokeLLMWithRetry([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: existingSpec
          ? `Current query context:\n${JSON.stringify(existingSpec, null, 2)}`
          : "No current query context.",
      },
      { role: "user", content: `User question: ${userPrompt}` },
    ]);

    const toolCall = response.tool_calls?.[0];
    if (!toolCall) {
      const fallback = inferFallbackSpec(userPrompt, existingSpec);
      return {
        querySpec: fallback,
        validationError: null,
      };
    }

    const candidate = toolCall.args as AnalyticsQuerySpec;

    const merged = normalizeQuerySpec(
      {
        ...candidate,
        vizPreference:
          vizPreference && vizPreference !== "auto"
            ? vizPreference
            : candidate.vizPreference,
      },
      existingSpec
    );

    return {
      querySpec: normalizeMeasureCompatibility(merged),
      validationError: null,
    };
  } catch {
    const fallback = inferFallbackSpec(userPrompt, existingSpec);
    return {
      querySpec: fallback,
      validationError: null,
    };
  }
}

export async function validateAnalyticsQueryNode(
  state: AnalyticsAgentStateType
): Promise<Partial<AnalyticsAgentStateType>> {
  if (!state.querySpec) {
    return {
      validationError: "I couldn't build a valid analytics query from that prompt.",
    };
  }

  const parsed = AnalyticsQuerySpecSchema.safeParse(state.querySpec);
  if (!parsed.success) {
    return {
      validationError: `Invalid query specification: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
      retryCount: state.retryCount + 1,
    };
  }

  let normalized = normalizeQuerySpec(parsed.data, state.context.lastQuerySpec);
  normalized = normalizeMeasureCompatibility(normalized);
  normalized.limit = clampLimit(normalized.limit);

  const support = isSupportedQuerySpec(normalized);
  if (!support.valid) {
    return {
      validationError: support.reason,
      querySpec: normalized,
      retryCount: state.retryCount + 1,
    };
  }

  return {
    querySpec: normalized,
    validationError: null,
    retryCount: 0,
  };
}

export async function executeAnalyticsQueryNode(
  state: AnalyticsAgentStateType
): Promise<Partial<AnalyticsAgentStateType>> {
  if (state.validationError || !state.querySpec) {
    return {
      result: {
        columns: [],
        rows: [],
        rowCount: 0,
        truncated: false,
      },
    };
  }

  try {
    const built = buildAnalyticsQuery(state.querySpec);
    const rawRows = await prisma.$queryRaw<Record<string, unknown>[]>(built.query);

    const truncated = rawRows.length > built.effectiveLimit;
    const rows = rawRows.slice(0, built.effectiveLimit).map((row) => {
      const normalizedRow: AnalyticsResultRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalizedRow[key] = normalizeResultValue(value);
      }
      return normalizedRow;
    });

    const result: AnalyticsTabularResult = {
      columns: built.columns,
      rows,
      rowCount: rows.length,
      truncated,
    };

    return {
      result,
    };
  } catch (error) {
    return {
      validationError: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
      result: {
        columns: [],
        rows: [],
        rowCount: 0,
        truncated: false,
      },
    };
  }
}

function describeFilters(spec: AnalyticsQuerySpec): string {
  const parts: string[] = [];
  const filters = spec.filters;

  if (filters?.borough?.length) {
    parts.push(`in ${filters.borough.join(", ")}`);
  }

  if (filters?.neighborhood?.length) {
    parts.push(`for ${filters.neighborhood.join(", ")}`);
  }

  if (filters?.petFriendly) {
    parts.push("for pet-friendly listings");
  }

  if (filters?.price?.max != null) {
    parts.push(`under $${filters.price.max.toLocaleString()}`);
  }

  if (filters?.price?.min != null) {
    parts.push(`over $${filters.price.min.toLocaleString()}`);
  }

  return parts.join(" ");
}

function firstNumericValue(
  result: AnalyticsTabularResult
): { value: number; key: string; label: string } | null {
  if (!result.rows.length || !result.columns.length) return null;
  const firstRow = result.rows[0];
  for (const column of result.columns) {
    const value = firstRow[column.key];
    if (typeof value === "number") {
      return { value, key: column.key, label: column.label };
    }
  }
  return null;
}

export async function formatAnalyticsResponseNode(
  state: AnalyticsAgentStateType
): Promise<Partial<AnalyticsAgentStateType>> {
  const spec = state.querySpec;

  if (!spec) {
    const message = state.validationError || "I couldn't understand that analytics request.";
    return {
      answerText: message,
      renderHint: { primary: "table", confidence: 0.4 },
      messages: [new AIMessage(message)],
      context: state.context,
    };
  }

  if (state.validationError) {
    const message = `${state.validationError} Try asking for an aggregate metric like average/median/count grouped by borough, neighborhood, or month.`;
    return {
      answerText: message,
      renderHint: { primary: "table", confidence: 0.4 },
      messages: [new AIMessage(message)],
      context: {
        ...state.context,
        lastQuerySpec: spec,
      },
    };
  }

  const renderHint = selectRenderHint(state.result, spec);

  let answerText = "";
  if (state.result.rowCount === 0) {
    answerText = "No data matched your current analytics filters. Try broadening the geography, price range, or timeframe.";
  } else if (renderHint.primary === "metric") {
    const metric = firstNumericValue(state.result);
    if (metric != null) {
      const isCurrency = /price|rent|cost/i.test(`${metric.key} ${metric.label}`);
      const formatted = isCurrency
        ? `$${Math.round(metric.value).toLocaleString()}`
        : Number.isInteger(metric.value)
          ? metric.value.toLocaleString()
          : metric.value.toFixed(2);
      answerText = `Here is the requested aggregate: ${formatted}${describeFilters(spec) ? ` ${describeFilters(spec)}` : ""}.`;
    } else {
      answerText = "I computed the aggregate and returned it in the result table.";
    }
  } else {
    answerText = `I found ${state.result.rowCount} row${state.result.rowCount === 1 ? "" : "s"} for your aggregate analytics query${describeFilters(spec) ? ` ${describeFilters(spec)}` : ""}.`;
  }

  if (state.result.truncated) {
    answerText += " Results were truncated to the 50-row safety cap.";
  }

  if (renderHint.reason) {
    answerText += ` ${renderHint.reason}`;
  }

  return {
    answerText,
    renderHint,
    messages: [new AIMessage(answerText)],
    context: {
      lastQuerySpec: spec,
      lastRenderHint: renderHint,
    },
  };
}

export function routeAfterValidation(): "continue" {
  return "continue";
}
