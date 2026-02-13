import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type {
  AnalyticsContext,
  AnalyticsQuerySpec,
  AnalyticsRenderHint,
  AnalyticsTabularResult,
} from "@/app/lib/analytics/types";

export const AnalyticsAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),

  context: Annotation<AnalyticsContext>({
    reducer: (_left, right) => right,
    default: () => ({}),
  }),

  querySpec: Annotation<AnalyticsQuerySpec | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),

  validationError: Annotation<string | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),

  result: Annotation<AnalyticsTabularResult>({
    reducer: (_left, right) => right,
    default: () => ({ columns: [], rows: [], rowCount: 0, truncated: false }),
  }),

  renderHint: Annotation<AnalyticsRenderHint>({
    reducer: (_left, right) => right,
    default: () => ({ primary: "table", confidence: 0 }),
  }),

  answerText: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),

  retryCount: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
});

export type AnalyticsAgentStateType = typeof AnalyticsAgentState.State;
