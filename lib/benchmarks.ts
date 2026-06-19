import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

type BenchmarkRow = {
  avg_score: number;
  p10_score: number;
  p50_score: number;
  p90_score: number;
  sample_size: number;
};

function calculatePercentile(score: number, row: BenchmarkRow): number {
  const { p10_score, p50_score, p90_score } = row;
  if (score <= p10_score) return Math.max(1, Math.round((score / p10_score) * 10));
  if (score <= p50_score) return Math.round(10 + ((score - p10_score) / (p50_score - p10_score)) * 40);
  if (score <= p90_score) return Math.round(50 + ((score - p50_score) / (p90_score - p50_score)) * 40);
  return Math.min(99, Math.round(90 + ((score - p90_score) / (100 - p90_score)) * 10));
}

export async function getBenchmark(
  siteType: string,
  score: number
): Promise<{
  industry_average: number;
  industry_percentile: number;
  top_10_percent_score: number;
  sample_size: number;
} | null> {
  try {
    const supabase = getServiceClient();
    let { data } = await supabase
      .from("industry_benchmarks")
      .select("avg_score, p10_score, p50_score, p90_score, sample_size")
      .eq("site_type", siteType)
      .maybeSingle();

    if (!data) {
      const fallback = await supabase
        .from("industry_benchmarks")
        .select("avg_score, p10_score, p50_score, p90_score, sample_size")
        .eq("site_type", "unknown")
        .maybeSingle();
      data = fallback.data;
    }
    if (!data) return null;

    const row = data as BenchmarkRow;
    return {
      industry_average: Math.round(row.avg_score),
      industry_percentile: calculatePercentile(score, row),
      top_10_percent_score: Math.round(row.p90_score),
      sample_size: row.sample_size,
    };
  } catch {
    return null;
  }
}

type DimensionBenchmarkData = {
  average: number;
  p10: number;
  p90: number;
};

const SAAS_DIMENSION_BENCHMARKS: Record<string, DimensionBenchmarkData> = {
  conversion_architecture: { average: 58, p10: 35, p90: 78 },
  trust_signals:           { average: 61, p10: 38, p90: 81 },
  message_clarity:         { average: 55, p10: 32, p90: 76 },
  traffic_readiness:       { average: 60, p10: 37, p90: 79 },
  technical_foundation:    { average: 64, p10: 42, p90: 82 },
  objection_handling:      { average: 48, p10: 25, p90: 72 },
  offer_clarity:           { average: 52, p10: 28, p90: 74 },
};

const ECOMMERCE_DIMENSION_BENCHMARKS: Record<string, DimensionBenchmarkData> = {
  conversion_architecture: { average: 55, p10: 32, p90: 75 },
  trust_signals:           { average: 58, p10: 35, p90: 78 },
  message_clarity:         { average: 51, p10: 28, p90: 72 },
  traffic_readiness:       { average: 57, p10: 34, p90: 76 },
  technical_foundation:    { average: 67, p10: 44, p90: 84 },
  objection_handling:      { average: 45, p10: 22, p90: 69 },
  offer_clarity:           { average: 54, p10: 30, p90: 75 },
};

export async function getDimensionBenchmarks(
  siteType: string
): Promise<Record<string, DimensionBenchmarkData> | null> {
  try {
    if (siteType === "ecommerce") return ECOMMERCE_DIMENSION_BENCHMARKS;
    return SAAS_DIMENSION_BENCHMARKS;
  } catch {
    return null;
  }
}

export function getPercentileLabel(
  score: number,
  p10: number,
  p90: number,
  average: number,
  siteType?: string
): string {
  const context = siteType ? ` of ${siteType} sites` : "";
  if (score <= p10) return `Bottom 10%${context}`;
  if (score < average - 10) return "Below average";
  if (score <= average + 10) return "Industry average";
  if (score < p90) return "Above average";
  return `Top 10%${context}`;
}

export const DIMENSION_WEIGHTS: Record<string, Record<string, number>> = {
  saas_transactional: {
    conversion_architecture: 0.20,
    trust_signals: 0.12,
    message_clarity: 0.18,
    traffic_readiness: 0.10,
    technical_foundation: 0.10,
    objection_handling: 0.15,
    offer_clarity: 0.15,
  },
  ecommerce_transactional: {
    conversion_architecture: 0.22,
    trust_signals: 0.18,
    message_clarity: 0.15,
    traffic_readiness: 0.10,
    technical_foundation: 0.08,
    objection_handling: 0.12,
    offer_clarity: 0.15,
  },
  service_consultative: {
    conversion_architecture: 0.13,
    trust_signals: 0.25,
    message_clarity: 0.20,
    traffic_readiness: 0.10,
    technical_foundation: 0.08,
    objection_handling: 0.17,
    offer_clarity: 0.07,
  },
  default: {
    conversion_architecture: 0.15,
    trust_signals: 0.15,
    message_clarity: 0.15,
    traffic_readiness: 0.15,
    technical_foundation: 0.15,
    objection_handling: 0.15,
    offer_clarity: 0.10,
  },
};

/**
 * Dimension weight profile by site type.
 *
 * NOTE: the previous signature took a `buyerComplexity` arg and branched on
 * "enterprise"/"consultative", but the only caller (/api/v1/scan) passed RENDER
 * complexity ("simple"/"medium"/"complex"), which never matched — so the
 * saas_consultative / saas_enterprise / ecommerce_consultative profiles were dead
 * code and every live scan already resolved to the transactional/service/default
 * profile below. Branching on siteType only preserves those exact weights (no change
 * to any score returned to users) and the dead profiles have been removed.
 */
export function getWeightProfile(siteType: string): Record<string, number> {
  if (siteType === "saas") return DIMENSION_WEIGHTS.saas_transactional;
  if (siteType === "ecommerce") return DIMENSION_WEIGHTS.ecommerce_transactional;
  if (siteType === "service") return DIMENSION_WEIGHTS.service_consultative;
  return DIMENSION_WEIGHTS.default;
}

export function updateBenchmark(siteType: string, newScore: number): void {
  void (async () => {
    try {
      const supabase = getServiceClient();
      const { data } = await supabase
        .from("industry_benchmarks")
        .select("avg_score, sample_size")
        .eq("site_type", siteType)
        .maybeSingle();
      if (!data) return;
      const row = data as { avg_score: number; sample_size: number };
      const newCount = row.sample_size + 1;
      const newAvg = (row.avg_score * row.sample_size + newScore) / newCount;
      await supabase
        .from("industry_benchmarks")
        .update({ avg_score: Math.round(newAvg * 10) / 10, sample_size: newCount, updated_at: new Date().toISOString() })
        .eq("site_type", siteType);
    } catch { /* fire and forget */ }
  })();
}
