import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type { ClaudeResponse } from "../claudeQueryParser";
import type { Property } from "../definitions";

/**
 * Deep merges filter objects, where new values override old ones.
 * For arrays, new arrays replace old ones (not concatenated).
 * For objects with min/max, new values override old values field by field.
 */
export function deepMergeFilters(
  left: ClaudeResponse,
  right: ClaudeResponse
): ClaudeResponse {
  if (!left || Object.keys(left).length === 0) return right;
  if (!right || Object.keys(right).length === 0) return left;

  const result: ClaudeResponse = { ...left };

  for (const [key, value] of Object.entries(right)) {
    if (value === null || value === undefined) {
      continue;
    }

    // Handle range objects (price, bedrooms, etc.)
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("min" in value || "max" in value)
    ) {
      const rangeValue = value as { min?: number | null; max?: number | null };
      const existing = result[key] as { min?: number | null; max?: number | null } | undefined;
      result[key] = {
        min: rangeValue.min != null ? rangeValue.min : existing?.min ?? null,
        max: rangeValue.max != null ? rangeValue.max : existing?.max ?? null,
      };
    }
    // Arrays replace entirely (neighborhood, tag_list, amenities)
    else if (Array.isArray(value)) {
      result[key] = value;
    }
    // Primitives override
    else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * LangGraph state schema for the property search agent.
 * Uses reducers to accumulate messages and merge filters across turns.
 */
export const SearchAgentState = Annotation.Root({
  // Messages accumulate via concat reducer
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),

  // Filters REPLACE - client sends full filter state, node handles merging with AI output
  searchFilters: Annotation<ClaudeResponse>({
    reducer: (_left, right) => right,
    default: () => ({}),
  }),

  // Validation error for retry loop
  validationError: Annotation<string | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),

  // Latest search results (replaced each turn)
  results: Annotation<Property[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),

  // Result count for response formatting
  resultCount: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),

  // Response message to stream to UI
  responseMessage: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),

  // Retry count for validation loop (per-invocation, not global)
  retryCount: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
});

export type SearchAgentStateType = typeof SearchAgentState.State;
