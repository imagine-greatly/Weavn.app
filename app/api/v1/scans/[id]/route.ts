/**
 * GET /api/v1/scans/:id — retrieve a single scan by ID.
 * Returns 404 if the scan doesn't exist or belongs to a different API key.
 *
 * Response shape MIRRORS the POST /api/v1/scan sync response exactly (same field
 * names, the same 7 dimension keys, the same finding object). The completed
 * findings come straight from the stored `api_findings` array (which is byte-
 * identical to what the original sync scan returned), and benchmark /
 * dimension_benchmarks / score_profile are recomputed deterministically from the
 * stored site_type + score + dimensions — the same functions POST /scan uses.
 *
 * New rows (scanned after the api_* persistence change) carry page_type, strengths, the flat
 * growth_blueprint (real effort/impact enums), metadata {word_count, cta_count, tech_stack}, and a
 * full scan_meta in the analysis blob under api_* keys — surfaced here for exact sync parity. Rows
 * saved before that change fall back to honest defaults (page_type "homepage", strengths [],
 * growth_blueprint rebuilt from the stored struct, metadata zeros, cached-read scan_meta).
 * benchmark / dimension_benchmarks / score_profile are always recomputed from site_type + score +
 * dimensions. Field-gating is not reconstructable (the original `fields` param is not stored), so
 * the fullest available shape is always returned.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiAuth";
import { apiError } from "@/lib/apiErrors";
import type {
  ReportPayload,
  Leak,
  DimensionScoreRow,
  ConversionTransformation,
  HeroRewrite,
  GrowthBlueprint,
} from "@/lib/reportSchema";
import { toPublicScanId, toDbScanId } from "@/lib/scanId";
import { API_DIMENSION_KEYS } from "@/lib/rubricScan";
import { getBenchmark, getDimensionBenchmarks, getPercentileLabel, getWeightProfile } from "@/lib/benchmarks";

const BASE_URL = "https://weavn.app";

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

// ── Response shape helpers (mirror app/api/v1/scan/route.ts) ─────────────

/**
 * Rebuild the 7-key dimensions object from stored dimensionScores. Handles BOTH
 * storage shapes: the rubric path stores id = snake key ("conversion_architecture");
 * the self-reported path stores label = snake key (id = "dim-N"). Missing keys → 0.
 */
function dimensionsFromStored(rows: DimensionScoreRow[] | undefined): Record<string, number> {
  const keys = API_DIMENSION_KEYS as readonly string[];
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = 0;
  for (const r of rows ?? []) {
    const row = r as unknown as { id?: unknown; label?: unknown; score?: unknown };
    if (typeof row.score !== "number") continue;
    const id = String(row.id ?? "").trim().toLowerCase();
    const label = String(row.label ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    const key = keys.includes(id) ? id : keys.includes(label) ? label : null;
    if (key) out[key] = row.score;
  }
  return out;
}

// Legacy fallback for rows saved before api_findings existed. Reconstructs a
// lean finding from the stored leaks. New rows never hit this — they surface
// api_findings verbatim.
function mapFindings(leaks: Leak[] | undefined) {
  if (!leaks?.length) return [];
  return leaks.slice(0, 20).map((leak, i) => ({
    id: `finding_${String(i + 1).padStart(3, "0")}`,
    title: leak.title ?? "",
    severity: leak.severity ?? "warning",
    dimension: leak.category ?? "",
    impact: leak.impactStatement ?? leak.whyItMatters ?? "",
    explanation: leak.whatWeFound ?? "",
    recommendation: leak.howToFixIt ?? "",
    ...(leak.exampleFix ? { rewritten_copy: leak.exampleFix } : {}),
    confidence: leak.severity === "critical" ? "high" : leak.severity === "warning" ? "medium" : "low",
  }));
}

// Rebuild the flat growth_blueprint from the stored struct. The original per-item
// effort/impact enums are not persisted (only the weekOne/weekTwoToFour/monthTwo
// struct), so effort/impact are heuristic by timeframe — the field names, order,
// and timeframe are faithful.
function mapGrowthBlueprint(blueprint: GrowthBlueprint | undefined) {
  if (!blueprint) return [];
  const items: Array<{ priority: number; action: string; effort: string; impact: string; timeframe: string }> = [];
  let priority = 1;
  for (const action of (blueprint.weekOne ?? [])) {
    items.push({ priority: priority++, action, effort: "high", impact: "high", timeframe: "Week 1" });
  }
  for (const action of (blueprint.weekTwoToFour ?? [])) {
    items.push({ priority: priority++, action, effort: "medium", impact: "medium", timeframe: "Weeks 2-4" });
  }
  if (blueprint.monthTwo) {
    items.push({ priority: priority++, action: blueprint.monthTwo, effort: "low", impact: "medium", timeframe: "Month 2" });
  }
  return items;
}

function buildCopyRewrites(ct: ConversionTransformation | undefined, hr: HeroRewrite | undefined) {
  return {
    headline: ct?.rewrittenHeadline ?? hr?.suggestedHeadline ?? undefined,
    subheadline: ct?.rewrittenSubheadline ?? hr?.suggestedSubheadline ?? undefined,
    cta: ct?.rewrittenCta ?? hr?.suggestedCta ?? undefined,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = await validateApiKey(req);
  if (!apiKey) {
    return apiError("AUTH_INVALID", "Invalid API key", 401);
  }

  const { id } = await params;
  if (!id) {
    return apiError("INVALID_REQUEST", "id is required", 400);
  }

  // Accept BOTH a bare UUID and an sc_-prefixed scan_id (back-compat for older links/tokens).
  const dbId = toDbScanId(id);

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id, domain, health_score, created_at, analysis, status")
    .eq("id", dbId)
    .eq("api_key_id", apiKey.id)  // enforces ownership — wrong key → no row → 404
    .single();

  if (error || !data) {
    return apiError("NOT_FOUND", "Scan not found", 404);
  }

  type ReportRow = {
    id: string;
    domain: string;
    health_score: number | null;
    created_at: string;
    analysis: ReportPayload;
    status: string | null;
  };

  const row = data as ReportRow;

  if (row.status === "pending") {
    return NextResponse.json({ scan_id: toPublicScanId(row.id), status: "pending", message: "Scan in progress" }, { status: 202 });
  }
  if (row.status === "failed") {
    return NextResponse.json({ scan_id: toPublicScanId(row.id), status: "failed", error: "Scan failed" }, { status: 200 });
  }

  const payload = row.analysis;
  // Ad-hoc fields not on the ReportPayload type but persisted in the analysis blob.
  const ap = payload as unknown as Record<string, unknown>;

  const score = row.health_score ?? 0;
  const site_type = typeof ap.site_type === "string" ? ap.site_type : "";
  const dimensions = dimensionsFromStored(payload.dimensionScores);

  // Findings: surface the stored api_findings verbatim (byte-identical to the
  // original sync response). Fall back to the legacy leak reconstruction only for
  // rows saved before api_findings existed.
  const findings = Array.isArray(ap.api_findings)
    ? (ap.api_findings as unknown[]).slice(0, 20)
    : mapFindings(payload.moneyLeaks ?? payload.primaryFindings ?? payload.priorityFindings ?? payload.leaks);

  // score_profile — recomputed. Weights are deterministic from site_type; profile_used uses the
  // persisted render complexity when present (new rows) and falls back to "medium" for old rows.
  const weights = getWeightProfile(site_type);
  const weighted_score = Math.min(100, Math.max(0, Math.round(
    API_DIMENSION_KEYS.reduce((sum, k) => sum + (weights[k] ?? 0) * (dimensions[k] ?? 0), 0)
  )));
  const persistedComplexity =
    ap.api_scan_meta && typeof ap.api_scan_meta === "object"
      ? (ap.api_scan_meta as { complexity?: unknown }).complexity
      : undefined;
  const complexity = typeof persistedComplexity === "string" ? persistedComplexity : "medium";
  const score_profile = { weighted_score, profile_used: `${site_type}_${complexity}`, weights };

  // benchmark + dimension_benchmarks — recomputed from the live benchmark tables,
  // same as POST /scan. Values track current corpus state (benchmarks are live by design).
  const benchmark = await getBenchmark(site_type, score).catch(() => null);
  const rawDimBench = await getDimensionBenchmarks(site_type).catch(() => null);
  const dimension_benchmarks = rawDimBench
    ? API_DIMENSION_KEYS.reduce<Record<string, { score: number; average: number; percentile_label: string; p10: number; p90: number }>>((acc, key) => {
        const b = rawDimBench[key];
        if (b) {
          const dimScore = dimensions[key] ?? 0;
          acc[key] = {
            score: dimScore,
            average: b.average,
            percentile_label: getPercentileLabel(dimScore, b.p10, b.p90, b.average, site_type),
            p10: b.p10,
            p90: b.p90,
          };
        }
        return acc;
      }, {})
    : null;

  const shareToken = typeof ap.shareToken === "string" ? ap.shareToken : undefined;

  // Persisted API-poll fields (new rows, api_* namespaced). Fall back to defaults / legacy
  // reconstruction for rows saved before these were persisted.
  const page_type = typeof ap.api_page_type === "string" ? ap.api_page_type : "homepage";
  const strengths = Array.isArray(ap.api_strengths) ? ap.api_strengths : [];
  const growth_blueprint = Array.isArray(ap.api_growth_blueprint)
    ? ap.api_growth_blueprint
    : mapGrowthBlueprint(payload.growthBlueprint);
  const metadata = ap.api_metadata && typeof ap.api_metadata === "object"
    ? ap.api_metadata
    : { word_count: 0, cta_count: 0, tech_stack: [] as string[] };
  // New rows carry the real fresh-scan scan_meta; old rows fall back to the cached-read variant.
  const scan_meta = ap.api_scan_meta && typeof ap.api_scan_meta === "object"
    ? ap.api_scan_meta
    : { cached: true, cache_reason: "poll", last_scan: row.created_at, site_type };

  const response: Record<string, unknown> = {
    scan_id: toPublicScanId(row.id),
    url: payload.pagesAnalyzed?.[0] ?? `https://${row.domain}`,
    score,
    verdict: scoreToVerdict(score),
    scanned_at: row.created_at,
    pages_scanned: payload.pagesAnalyzed?.length ?? 1,
    page_type,
    findings_summary: findings.length,
    dimensions,
    metadata,
    scan_meta,
    score_profile,
    summary: payload.diagnosticBrief ?? payload.intelligenceBrief ?? payload.executiveSummary?.diagnosis ?? "",
    findings,
    strengths,
    copy_rewrites: buildCopyRewrites(payload.conversionTransformation, payload.heroRewrite),
    growth_blueprint,
  };

  if (benchmark) response.benchmark = benchmark;
  if (dimension_benchmarks) response.dimension_benchmarks = dimension_benchmarks;
  if (shareToken) response.report_url = `${BASE_URL}/reports/${shareToken}`;

  return NextResponse.json(response);
}
