/**
 * GET /api/v1/scans — list scans belonging to the authenticated API key.
 * Query params: limit (default 20, max 100), offset (default 0)
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

export async function GET(req: NextRequest) {
  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return apiError("AUTH_INVALID", "Invalid API key", 401);
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

  const supabase = getServiceClient();

  const { data, error, count } = await supabase
    .from("reports")
    .select("id, domain, health_score, created_at", { count: "exact" })
    .eq("api_key_id", apiKey.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[API v1] GET /scans error:", error.message);
    return apiError("INTERNAL_ERROR", "Failed to fetch scans", 500);
  }

  type ReportRow = { id: string; domain: string; health_score: number | null; created_at: string };

  const scans = (data ?? []).map((row: ReportRow) => ({
    id: row.id,
    url: `https://${row.domain}`,
    score: row.health_score ?? 0,
    verdict: scoreToVerdict(row.health_score ?? 0),
    scanned_at: row.created_at,
  }));

  return NextResponse.json({ scans, total: count ?? 0, limit, offset });
}
