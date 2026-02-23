import { StateGraph, MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { AnalyticsAgentState } from "./state";
import {
  executeAnalyticsQueryNode,
  formatAnalyticsResponseNode,
  parseAnalyticsQueryNode,
  routeAfterValidation,
  validateAnalyticsQueryNode,
} from "./nodes";
import type { AnalyticsContext } from "@/app/lib/analytics/types";

function buildAnalyticsAgentGraph() {
  const workflow = new StateGraph(AnalyticsAgentState)
    .addNode("parseQuery", parseAnalyticsQueryNode)
    .addNode("validateQuery", validateAnalyticsQueryNode)
    .addNode("executeQuery", executeAnalyticsQueryNode)
    .addNode("formatResponse", formatAnalyticsResponseNode)
    .addEdge("__start__", "parseQuery")
    .addEdge("parseQuery", "validateQuery")
    .addConditionalEdges(
      "validateQuery",
      routeAfterValidation,
      {
        continue: "executeQuery",
      }
    )
    .addEdge("executeQuery", "formatResponse")
    .addEdge("formatResponse", "__end__");

  return workflow;
}

const memorySaver = new MemorySaver();

export const analyticsAgent = buildAnalyticsAgentGraph().compile({
  checkpointer: memorySaver,
});

export async function invokeAnalyticsAgent(
  message: string,
  threadId: string,
  existingContext?: AnalyticsContext
) {
  const config = {
    configurable: {
      thread_id: threadId,
    },
  };

  const input = {
    messages: [new HumanMessage(message)],
    ...(existingContext ? { context: existingContext } : {}),
  };

  const result = await analyticsAgent.invoke(input, config);

  return {
    answerText: result.answerText,
    result: result.result,
    renderHint: result.renderHint,
    context: result.context,
  };
}

export type { AnalyticsAgentStateType } from "./state";
