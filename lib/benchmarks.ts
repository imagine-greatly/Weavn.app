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
