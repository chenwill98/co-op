import { describe, it, expect, vi } from "vitest";
import type { SearchAgentStateType } from "../state";

// Mock dependencies that nodes.ts imports at module level
vi.mock("@langchain/anthropic", () => {
  class MockChatAnthropic {
    bindTools() {
      return { invoke: vi.fn() };
    }
  }
  return { ChatAnthropic: MockChatAnthropic };
});

vi.mock("../../prisma", () => ({
  default: {
    neighborhoods_enhanced_view: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

const { routeAfterParsing, routeAfterValidation } = await import("../nodes");

function makeState(
  overrides: Partial<SearchAgentStateType> = {}
): SearchAgentStateType {
  return {
    messages: [],
    searchFilters: {},
    validationError: null,
    results: [],
    resultCount: 0,
    responseMessage: "",
    intent: "search",
    suggestedQueries: [],
    retryCount: 0,
    validationWarning: null,
    ...overrides,
  };
}

describe("routeAfterParsing", () => {
  it('returns "search" when intent is "search"', () => {
    expect(routeAfterParsing(makeState({ intent: "search" }))).toBe("search");
  });

  it('returns "conversational" when intent is "conversational"', () => {
    expect(
      routeAfterParsing(makeState({ intent: "conversational" }))
    ).toBe("conversational");
  });

  it('defaults to "search" when intent is not set (uses state default)', () => {
    expect(routeAfterParsing(makeState())).toBe("search");
  });
});

describe("routeAfterValidation", () => {
  it('returns "retry" when there is a validation error', () => {
    expect(
      routeAfterValidation(makeState({ validationError: "bad neighborhood" }))
    ).toBe("retry");
  });

  it('returns "continue" when validation passes', () => {
    expect(
      routeAfterValidation(makeState({ validationError: null }))
    ).toBe("continue");
  });
});
