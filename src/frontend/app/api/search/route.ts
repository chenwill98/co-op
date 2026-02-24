import { NextResponse } from "next/server";
import { parseClaudeResultsToPrismaSQL, type ClaudeResponse } from "@/app/lib/claudeQueryParser";
import prisma from "@/app/lib/prisma";
import { type RawProperty, formatRawProperties, sortToOrderBy } from "@/app/lib/searchUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/search
 *
 * Lightweight search endpoint that executes structured filters directly against the DB.
 * No AI call, no LangGraph — used for filter removal and sort changes.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filters, sort, limit = 20, offset = 0 } = body as {
      filters: ClaudeResponse;
      sort?: string;
      limit?: number;
      offset?: number;
    };

    if (!filters || typeof filters !== "object") {
      return NextResponse.json(
        { error: "Filters object is required" },
        { status: 400 }
      );
    }

    // Skip query if filters are empty (caller should handle this case)
    if (Object.keys(filters).length === 0) {
      return NextResponse.json({ results: [], resultCount: 0 });
    }

    const orderBy = sortToOrderBy(sort);

    // Build queries — one with limit/offset for results, one without for total count
    const [query] = await parseClaudeResultsToPrismaSQL(filters, orderBy, limit, offset);
    const [countQuery] = await parseClaudeResultsToPrismaSQL(filters, undefined, undefined, undefined);

    const [rawResults, countResults] = await Promise.all([
      prisma.$queryRaw<RawProperty[]>(query),
      prisma.$queryRaw<RawProperty[]>(countQuery).then((r) => r.length),
    ]);

    const results = formatRawProperties(rawResults);

    return NextResponse.json({
      results,
      resultCount: countResults,
    });
  } catch (error) {
    console.error("[/api/search] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute search",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
