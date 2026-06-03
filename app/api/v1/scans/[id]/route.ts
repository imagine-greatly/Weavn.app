/**
 * GET /api/v1/scans/:id — retrieve a single scan by ID.
 * Returns 404 if the scan doesn't exist or belongs to a different API key.
 * Response shape matches POST /api/v1/scan exactly.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiAuth";
import type {
  ReportPayload,
  Leak,
  DimensionScoreRow,
  ConversionTransformation,
  HeroRewrite,
  GrowthBlueprint,
} from "@/lib/reportSchema";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Response shape helpers (mirrors app/api/v1/scan/route.ts) ─────────────

const DIMENSION_KEY_MAP: Record<string, string> = {
  "Conversion Architecture": "conversion_architecture",
  "Trust Signals": "trust_signals",
  "Message Clarity": "message_clarity",
  "Traffic Readiness": "traffic_readiness",
  "Technical Foundation": "technical_foundation",
};

function scoreToVerdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

function mapDimensions(scores: DimensionScoreRow[] | undefined): Record<string, number> {
  const out: Record<string, number> = {
    conversion_architecture: 0,
    trust_signals: 0,
    message_clarity: 0,
    traffic_readiness: 0,
    technical_foundation: 0,
  };
  if (!scores) return out;
  for (const row of scores) {
    const key = DIMENSION_KEY_MAP[row.label];
    if (key) out[key] = typeof row.score === "number" ? row.score : 0;
  }
  return out;
}

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

function mapGrowthBlueprint(blueprint: GrowthBlueprint | undefined) {
  if (!blueprint) return [];
  const items: Array<{ priority: number; action: string; effort: string; impact: string; timeframe: string }> = [];
  let priority = 1;
  const lift = blueprint.projectedLift ?? "";
  for (const action of (blueprint.weekOne ?? [])) {
    items.push({ priority: priority++, action, effort: "High", impact: lift, timeframe: "Week 1" });
  }
  for (const action of (blueprint.weekTwoToFour ?? [])) {
    items.push({ priority: priority++, action, effort: "Medium", impact: lift, timeframe: "Weeks 2-4" });
  }
  if (blueprint.monthTwo) {
    items.push({ priority: priority++, action: blueprint.monthTwo, effort: "Low", impact: lift, timeframe: "Month 2" });
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
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id, domain, health_score, created_at, analysis")
    .eq("id", id)
    .eq("api_key_id", apiKey.id)  // enforces ownership — wrong key → no row → 404
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  type ReportRow = {
    id: string;
    domain: string;
    health_score: number | null;
    created_at: string;
    analysis: ReportPayload;
  };

  const row = data as ReportRow;
  const payload = row.analysis;

  const findings = mapFindings(
    payload.moneyLeaks ?? payload.primaryFindings ?? payload.priorityFindings ?? payload.leaks
  );

  return NextResponse.json({
    id: row.id,
    url: payload.pagesAnalyzed?.[0] ?? `https://${row.domain}`,
    score: row.health_score ?? 0,
    verdict: scoreToVerdict(row.health_score ?? 0),
    scanned_at: row.created_at,
    pages_scanned: payload.pagesAnalyzed?.length ?? 1,
    dimensions: mapDimensions(payload.dimensionScores),
    summary: payload.diagnosticBrief ?? payload.intelligenceBrief ?? payload.executiveSummary?.diagnosis ?? "",
    findings,
    copy_rewrites: buildCopyRewrites(payload.conversionTransformation, payload.heroRewrite),
    growth_blueprint: mapGrowthBlueprint(payload.growthBlueprint),
    metadata: {
      word_count: 0,
      cta_count: 0,
      tech_stack: [] as string[],
    },
  });
}
