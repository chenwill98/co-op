import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchAgentStateType } from "../state";

// --- Mocks ---

// Mock prisma before importing the module under test
vi.mock("../../prisma", () => ({
  default: {
    neighborhoods_enhanced_view: {
      findMany: vi.fn().mockResolvedValue([
        { name: "Chelsea" },
        { name: "Williamsburg" },
        { name: "Soho" },
        { name: "Upper West Side" },
      ]),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

// Mock schemas to avoid real DB calls in loadValidNeighborhoods
vi.mock("./schemas", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../schemas")>();
  return {
    ...actual,
    loadValidNeighborhoods: vi.fn().mockResolvedValue([]),
  };
});

// Track the mock invoke function so we can configure responses per test
const mockInvoke = vi.fn();

// Mock @langchain/anthropic to intercept the LLM
// Must be constructable (use a real class)
vi.mock("@langchain/anthropic", () => {
  class MockChatAnthropic {
    bindTools() {
      return { invoke: mockInvoke };
    }
  }
  return { ChatAnthropic: MockChatAnthropic };
});

// Import after mocks are set up
const { parseQueryNode } = await import("../nodes");

// --- Helpers ---

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

/** Create a mock LLM response that called extract_search_filters */
function searchToolResponse(args: Record<string, unknown>) {
  return {
    tool_calls: [{ name: "extract_search_filters", args }],
    content: "",
  };
}

/** Create a mock LLM response that called respond_conversationally */
function conversationalToolResponse(
  message: string,
  suggestedQueries?: string[]
) {
  return {
    tool_calls: [
      {
        name: "respond_conversationally",
        args: {
          message,
          ...(suggestedQueries ? { suggested_queries: suggestedQueries } : {}),
        },
      },
    ],
    content: "",
  };
}

/** Create a mock LLM response with no tool calls (fallback) */
function noToolCallResponse(textContent: string) {
  return {
    tool_calls: [],
    content: textContent,
  };
}

/** Helper to create a HumanMessage-like object */
function humanMessage(text: string) {
  return { content: text, _getType: () => "human" };
}

// --- Tests ---

describe("parseQueryNode — intent classification", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  // Search intent tests

  it("classifies a property search query as search intent", async () => {
    mockInvoke.mockResolvedValueOnce(
      searchToolResponse({
        bedrooms: { min: 2, max: 2 },
        neighborhood: ["Chelsea"],
        price: { max: 4000 },
      })
    );

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("2br in Chelsea under $4000")] as never[] })
    );

    expect(result.intent).toBe("search");
    expect(result.searchFilters).toBeDefined();
    expect(result.searchFilters?.neighborhood).toEqual(["Chelsea"]);
  });

  it("classifies a studio search as search intent", async () => {
    mockInvoke.mockResolvedValueOnce(
      searchToolResponse({
        bedrooms: { min: 0, max: 0 },
        borough: "Manhattan",
      })
    );

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("studios in Manhattan")] as never[] })
    );

    expect(result.intent).toBe("search");
    expect(result.searchFilters?.borough).toBe("Manhattan");
  });

  it("classifies an amenity search as search intent", async () => {
    mockInvoke.mockResolvedValueOnce(
      searchToolResponse({
        amenities: ["doorman", "gym"],
      })
    );

    const result = await parseQueryNode(
      makeState({
        messages: [humanMessage("apartments with doorman and gym")] as never[],
      })
    );

    expect(result.intent).toBe("search");
    expect(result.searchFilters?.amenities).toEqual(["doorman", "gym"]);
  });

  it("merges modification into existing filters", async () => {
    mockInvoke.mockResolvedValueOnce(
      searchToolResponse({ price: { max: 5000 } })
    );

    const result = await parseQueryNode(
      makeState({
        messages: [humanMessage("change max price to $5000")] as never[],
        searchFilters: {
          bedrooms: { min: 2, max: 2 },
          neighborhood: ["Chelsea"],
          price: { min: null, max: 4000 },
        },
      })
    );

    expect(result.intent).toBe("search");
    // Price max updated, rest preserved via deepMerge
    expect(result.searchFilters?.price).toEqual({ min: null, max: 5000 });
    expect(result.searchFilters?.neighborhood).toEqual(["Chelsea"]);
    expect(result.searchFilters?.bedrooms).toEqual({ min: 2, max: 2 });
  });

  it("merges neighborhood addition into existing filters", async () => {
    mockInvoke.mockResolvedValueOnce(
      searchToolResponse({ neighborhood: ["Chelsea", "Brooklyn"] })
    );

    const result = await parseQueryNode(
      makeState({
        messages: [humanMessage("add Brooklyn to the search")] as never[],
        searchFilters: { neighborhood: ["Chelsea"] },
      })
    );

    expect(result.intent).toBe("search");
    // Arrays replace, so the LLM should return the full list
    expect(result.searchFilters?.neighborhood).toEqual(["Chelsea", "Brooklyn"]);
  });

  it("classifies a single search word as search intent", async () => {
    mockInvoke.mockResolvedValueOnce(searchToolResponse({}));

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("apartments")] as never[] })
    );

    expect(result.intent).toBe("search");
  });

  // Conversational intent tests

  it('classifies "thanks!" as conversational', async () => {
    mockInvoke.mockResolvedValueOnce(
      conversationalToolResponse("You're welcome! Let me know if you need anything else.")
    );

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("thanks!")] as never[] })
    );

    expect(result.intent).toBe("conversational");
    expect(result.responseMessage).toContain("welcome");
    expect(result.searchFilters).toBeUndefined();
  });

  it('classifies "hello" as conversational', async () => {
    mockInvoke.mockResolvedValueOnce(
      conversationalToolResponse(
        "Hello! I can help you find apartments in NYC. What are you looking for?"
      )
    );

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("hello")] as never[] })
    );

    expect(result.intent).toBe("conversational");
    expect(result.responseMessage).toBeTruthy();
  });

  it('classifies "what\'s Chelsea like?" as conversational with suggestions', async () => {
    mockInvoke.mockResolvedValueOnce(
      conversationalToolResponse(
        "Chelsea is a vibrant neighborhood in Manhattan known for art galleries and dining.",
        ["2br in Chelsea under $4000", "studios in Chelsea", "no-fee apartments in Chelsea"]
      )
    );

    const result = await parseQueryNode(
      makeState({
        messages: [humanMessage("what's Chelsea like?")] as never[],
      })
    );

    expect(result.intent).toBe("conversational");
    expect(result.suggestedQueries).toHaveLength(3);
    expect(result.suggestedQueries?.[0]).toContain("Chelsea");
  });

  it('classifies "what would you recommend?" as conversational with suggestions', async () => {
    mockInvoke.mockResolvedValueOnce(
      conversationalToolResponse(
        "I'd be happy to help! Here are some popular searches:",
        [
          "great-deal apartments in Manhattan",
          "no-fee 1br under $3000",
        ]
      )
    );

    const result = await parseQueryNode(
      makeState({
        messages: [humanMessage("what would you recommend?")] as never[],
      })
    );

    expect(result.intent).toBe("conversational");
    expect(result.suggestedQueries).toBeDefined();
    expect(result.suggestedQueries!.length).toBeGreaterThan(0);
  });

  it('classifies "how does this work?" as conversational', async () => {
    mockInvoke.mockResolvedValueOnce(
      conversationalToolResponse(
        "I help you search for apartments in NYC using natural language. Just describe what you're looking for!"
      )
    );

    const result = await parseQueryNode(
      makeState({
        messages: [humanMessage("how does this work?")] as never[],
      })
    );

    expect(result.intent).toBe("conversational");
    expect(result.responseMessage).toBeTruthy();
  });

  // Edge cases

  it("handles no tool call from LLM as conversational fallback", async () => {
    mockInvoke.mockResolvedValueOnce(
      noToolCallResponse("I'm here to help you find apartments in NYC.")
    );

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("...")] as never[] })
    );

    expect(result.intent).toBe("conversational");
    expect(result.responseMessage).toContain("help");
  });

  it("handles empty tool_calls array as conversational fallback", async () => {
    mockInvoke.mockResolvedValueOnce({
      tool_calls: [],
      content: "How can I help you today?",
    });

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("")] as never[] })
    );

    expect(result.intent).toBe("conversational");
    expect(result.responseMessage).toBe("How can I help you today?");
  });

  it("defaults suggested_queries to empty array when not provided", async () => {
    mockInvoke.mockResolvedValueOnce(
      conversationalToolResponse("Thanks for using Co-op!")
    );

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("goodbye")] as never[] })
    );

    expect(result.intent).toBe("conversational");
    expect(result.suggestedQueries).toEqual([]);
  });

  it("returns error state when LLM throws", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("API rate limited"));

    const result = await parseQueryNode(
      makeState({ messages: [humanMessage("test")] as never[] })
    );

    expect(result.validationError).toContain("API rate limited");
  });
});
