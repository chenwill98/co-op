import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { SearchAgentState } from "./state";
import {
  parseQueryNode,
  validateFiltersNode,
  executeSearchNode,
  formatResponseNode,
  routeAfterValidation,
} from "./nodes";

// Maximum retries for validation loop
const MAX_RETRIES = 2;

/**
 * Build the search agent graph
 */
function buildSearchAgentGraph() {
  const workflow = new StateGraph(SearchAgentState)
    // Add nodes
    .addNode("parseQuery", async (state) => {
      console.log(`[graph:parseQuery] State BEFORE:`, JSON.stringify(state.searchFilters, null, 2));
      const result = await parseQueryNode(state);
      console.log(`[graph:parseQuery] Result:`, JSON.stringify(result.searchFilters, null, 2));
      return result;
    })
    .addNode("validateFilters", async (state) => {
      console.log(`[graph:validateFilters] State BEFORE:`, JSON.stringify(state.searchFilters, null, 2));
      const result = await validateFiltersNode(state);
      console.log(`[graph:validateFilters] Result:`, JSON.stringify(result.searchFilters, null, 2));
      return result;
    })
    .addNode("executeSearch", async (state) => {
      const result = await executeSearchNode(state);
      return result;
    })
    .addNode("formatResponse", async (state) => {
      const result = await formatResponseNode(state);
      return result;
    })
    // Add edges
    .addEdge("__start__", "parseQuery")
    .addEdge("parseQuery", "validateFilters")
    // Conditional edge: retry if validation fails (with retry limit)
    .addConditionalEdges("validateFilters", (state) => {
      const route = routeAfterValidation(state);
      if (route === "retry") {
        // Use state.retryCount instead of module-level variable to avoid race conditions
        if (state.retryCount >= MAX_RETRIES) {
          // Hit retry limit, skip to formatResponse with error
          return "continue";
        }
        return "retry";
      }
      return "continue";
    }, {
      retry: "parseQuery",
      continue: "executeSearch",
    })
    .addEdge("executeSearch", "formatResponse")
    .addEdge("formatResponse", "__end__");

  return workflow;
}

// Create a memory saver for conversation persistence
// Note: PostgresSaver can be added later for production persistence
const memorySaver = new MemorySaver();

/**
 * Compiled search agent graph with checkpointing
 */
export const searchAgent = buildSearchAgentGraph().compile({
  checkpointer: memorySaver,
});

/**
 * Invoke the search agent with a user message
 */
export async function invokeSearchAgent(
  message: string,
  threadId: string,
  existingFilters?: Record<string, unknown>
) {
  const { HumanMessage } = await import("@langchain/core/messages");

  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  const input = {
    messages: [new HumanMessage(message)],
    ...(existingFilters ? { searchFilters: existingFilters } : {}),
  };

  const result = await searchAgent.invoke(input, config);

  return {
    results: result.results,
    resultCount: result.resultCount,
    searchFilters: result.searchFilters,
    responseMessage: result.responseMessage,
    messages: result.messages,
  };
}

/**
 * Stream the search agent with a user message
 */
export async function* streamSearchAgent(
  message: string,
  threadId: string,
  existingFilters?: Record<string, unknown>
) {
  const { HumanMessage } = await import("@langchain/core/messages");

  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  const input = {
    messages: [new HumanMessage(message)],
    ...(existingFilters ? { searchFilters: existingFilters } : {}),
  };

  // Stream updates as they happen
  for await (const chunk of await searchAgent.stream(input, {
    ...config,
    streamMode: "updates",
  })) {
    yield chunk;
  }
}

export type { SearchAgentStateType } from "./state";
