import { NextResponse } from "next/server";
import { invokeAnalyticsAgent } from "@/app/lib/agent/analytics/graph";
import type { AnalyticsChatRequest } from "@/app/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyticsChatRequest;
    const { message, threadId, existingContext } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!threadId || typeof threadId !== "string") {
      return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
    }

    const response = await invokeAnalyticsAgent(message, threadId, existingContext);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process analytics chat message",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
