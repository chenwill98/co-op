import { NextResponse } from "next/server";
import { streamSearchAgent, invokeSearchAgent } from "@/app/lib/agent/graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 *
 * Streaming chat endpoint that uses LangGraph for search query processing.
 * Supports both streaming (SSE) and non-streaming modes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, threadId, stream = false, existingFilters, sort } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json(
        { error: "Thread ID is required" },
        { status: 400 }
      );
    }

    // Non-streaming mode - return full result at once
    if (!stream) {
      const result = await invokeSearchAgent(message, threadId, existingFilters, sort);

      return NextResponse.json({
        results: result.results,
        resultCount: result.resultCount,
        searchFilters: result.searchFilters,
        responseMessage: result.responseMessage,
        responseType: result.intent || "search",
        suggestedQueries: result.suggestedQueries || [],
      });
    }

    // Streaming mode - return SSE stream
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamSearchAgent(
            message,
            threadId,
            existingFilters,
            sort
          )) {
            // Each chunk is an update from a node
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Send done event
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("[/api/chat] Streaming error:", error);
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[/api/chat] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
