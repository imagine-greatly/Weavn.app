/**
 * GET /api/v1/scans — list scans belonging to the authenticated API key.
 * Query params:
 *   - limit  (default 20, max 100; out-of-range values are clamped)
 *   - cursor (opaque base64 of { created_at, id }; keyset pagination)
 *   - offset (legacy; honored only when no cursor is supplied)
 *
 * Pagination is keyset (created_at desc, id as tiebreak): we fetch limit + 1 rows
 * to detect a further page and return next_cursor / has_more. The existing
 * scans[] / total / limit / offset fields are preserved unchanged.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiAuth";
import { apiError } from "@/lib/apiErrors";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function scoreToVerdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Poor";
}

type ScanCursor = { created_at: string; id: string };

function encodeCursor(c: ScanCursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64");
}

function decodeCursor(raw: string): ScanCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (typeof parsed?.created_at !== "string" || typeof parsed?.id !== "string") return null;
    return { created_at: parsed.created_at, id: parsed.id };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return apiError("AUTH_INVALID", "Invalid API key", 401);
  }

  const { searchParams } = new URL(req.url);

  // limit: default 20, max 100, clamp out-of-range / non-numeric values.
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));

  // offset: legacy fallback, only applied when no cursor is supplied.
  const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

  // cursor: opaque keyset cursor; malformed → standard 400 error envelope.
  const cursorParam = searchParams.get("cursor");
  let cursor: ScanCursor | null = null;
  if (cursorParam) {
    cursor = decodeCursor(cursorParam);
    if (!cursor) {
      return apiError("INVALID_REQUEST", "Malformed cursor", 400);
    }
  }

  const supabase = getServiceClient();

  // Keyset: order created_at desc with id as the tiebreak, then fetch limit + 1
  // rows so the extra row tells us whether another page exists.
  let query = supabase
    .from("reports")
    .select("id, domain, health_score, created_at", { count: "exact" })
    .eq("api_key_id", apiKey.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    // Rows strictly after the cursor in (created_at desc, id desc) order.
    query = query
      .or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
      .limit(limit + 1);
  } else {
    // No cursor: page from offset (default 0). range() is inclusive → limit + 1 rows.
    query = query.range(offset, offset + limit);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[API v1] GET /scans error:", error.message);
    return apiError("INTERNAL_ERROR", "Failed to fetch scans", 500);
  }

  type ReportRow = { id: string; domain: string; health_score: number | null; created_at: string };
  const rows = (data ?? []) as ReportRow[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const scans = pageRows.map((row) => ({
    id: row.id,
    url: `https://${row.domain}`,
    score: row.health_score ?? 0,
    verdict: scoreToVerdict(row.health_score ?? 0),
    scanned_at: row.created_at,
  }));

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor({ created_at: last.created_at, id: last.id }) : null;

  return NextResponse.json({
    scans,
    total: count ?? 0,
    limit,
    offset,
    next_cursor: nextCursor,
    has_more: hasMore,
  });
}
