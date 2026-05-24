/**
 * Scan-time batch generation of per-finding extended analysis, persisted on reports.extended_analysis.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Leak, ReportPayload } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";
import {
  expandFindingBriefWithAnthropic,
  type ExpandFindingBriefRequestBody,
  type FindingBriefExpansion,
} from "@/lib/expandFindingBrief";
import type {
  ExpandFindingBriefFindingInput,
  ExpandFindingBriefRelated,
} from "@/lib/prompts";

export function leakKey(l: Leak): string {
  return String(l.id ?? l.title);
}

function severityDisplayLabel(l: Leak): string {
  if (l.severity === "critical" || l.rubricSeverity === "Critical") {
    return "CRITICAL";
  }
  if (l.rubricSeverity === "High") return "HIGH IMPACT";
  if (l.rubricSeverity === "Medium") return "MEDIUM";
  if (l.rubricSeverity === "Low") return "LOW";
  if (l.severity === "warning") return "HIGH IMPACT";
  return l.severity === "passing" ? "PASSING" : "FINDING";
}

/** Same ordering as dashboard money leaks / issue detail extended analysis. */
export function resolveLeaksForReportPayload(analysis: ReportPayload | undefined): Leak[] {
  if (!analysis) return [];
  const money = getDashboardMoneyLeaks(analysis);
  if (money.length > 0) return money;
  return Array.isArray(analysis.leaks) ? analysis.leaks : [];
}

function leakToFindingInput(leak: Leak): ExpandFindingBriefFindingInput {
  return {
    title: leak.title,
    severity: severityDisplayLabel(leak),
    category: leak.category ?? "",
    whatWeFound: leak.whatWeFound ?? "",
    whyItMatters: typeof leak.whyItMatters === "string" ? leak.whyItMatters : "",
    howToFixIt: leak.howToFixIt ?? "",
    exampleFix: leak.exampleFix ?? "",
    psychologyPrinciple: leak.psychologyPrinciple ?? "",
    revenueImpact: leak.revenueImpact,
    page_location: leak.page_location,
  };
}

function relatedForLeak(finding: Leak, leaks: Leak[]): ExpandFindingBriefRelated[] {
  const cat = (finding.category ?? "").trim();
  return leaks
    .filter(
      (l) =>
        leakKey(l) !== leakKey(finding) && cat && (l.category ?? "").trim() === cat
    )
    .slice(0, 3)
    .map((l) => ({
      findingId: leakKey(l),
      title: l.title,
      category: (l.category ?? "").trim(),
    }));
}

function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function readMergePersistExtendedAnalysis(
  supabase: SupabaseClient,
  reportId: string,
  newEntries: Record<string, FindingBriefExpansion>
): Promise<Record<string, FindingBriefExpansion> | null> {
  if (Object.keys(newEntries).length === 0) {
    return null;
  }

  const { data: existingRow, error: readErr } = await supabase
    .from("reports")
    .select("extended_analysis")
    .eq("id", reportId)
    .maybeSingle();

  if (readErr) {
    console.warn("[extended-analysis] read existing extended_analysis failed:", readErr.message);
  }

  const prior =
    existingRow?.extended_analysis &&
    typeof existingRow.extended_analysis === "object" &&
    !Array.isArray(existingRow.extended_analysis)
      ? (existingRow.extended_analysis as Record<string, FindingBriefExpansion>)
      : {};

  const merged = { ...prior, ...newEntries };

  const { error } = await supabase
    .from("reports")
    .update({ extended_analysis: merged })
    .eq("id", reportId);

  if (error) {
    console.error("[extended-analysis] failed to persist", reportId, error.message);
    return null;
  }

  return merged;
}

/**
 * Writes generated briefs to both extended_analysis and finding_briefs in one
 * read+write so the expand-finding API's cache check (which reads finding_briefs)
 * finds the data immediately after background generation completes.
 */
async function persistBriefsBatch(
  supabase: SupabaseClient,
  reportId: string,
  newEntries: Record<string, FindingBriefExpansion>
): Promise<void> {
  if (Object.keys(newEntries).length === 0) return;

  const { data: row, error: readErr } = await supabase
    .from("reports")
    .select("extended_analysis, finding_briefs")
    .eq("id", reportId)
    .maybeSingle();

  if (readErr) {
    console.warn("[extended-analysis] persistBriefsBatch read failed:", readErr.message);
    // Fall back to extended_analysis only so at least something is persisted
    await readMergePersistExtendedAnalysis(supabase, reportId, newEntries);
    return;
  }

  const priorEA =
    row?.extended_analysis &&
    typeof row.extended_analysis === "object" &&
    !Array.isArray(row.extended_analysis)
      ? (row.extended_analysis as Record<string, unknown>)
      : {};

  const priorFB =
    row?.finding_briefs &&
    typeof row.finding_briefs === "object" &&
    !Array.isArray(row.finding_briefs)
      ? (row.finding_briefs as Record<string, unknown>)
      : {};

  const { error: writeErr } = await supabase
    .from("reports")
    .update({
      extended_analysis: { ...priorEA, ...newEntries },
      finding_briefs: { ...priorFB, ...newEntries },
    })
    .eq("id", reportId);

  if (writeErr) {
    // finding_briefs column may not exist yet — fall back to extended_analysis only
    const msg = writeErr.message ?? "";
    const isColumnErr =
      writeErr.code === "PGRST204" || /column.*does not exist/i.test(msg);
    if (isColumnErr) {
      await supabase
        .from("reports")
        .update({ extended_analysis: { ...priorEA, ...newEntries } })
        .eq("id", reportId);
    } else {
      console.error("[extended-analysis] persistBriefsBatch write failed", reportId, msg);
    }
  } else {
    console.log(
      `[extended-analysis] persisted ${Object.keys(newEntries).length} briefs to extended_analysis + finding_briefs for report`,
      reportId
    );
  }
}

/**
 * Expands and persists the first dashboard-ranked finding only; returns merged
 * `extended_analysis` after write (for immediate client use), or null on skip/failure.
 */
export async function generateAndPersistFirstFindingBrief(
  reportId: string,
  domain: string,
  payload: ReportPayload
): Promise<Record<string, FindingBriefExpansion> | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[extended-analysis] ANTHROPIC_API_KEY missing; skipping batch expansion.");
    return null;
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn("[extended-analysis] Supabase service client unavailable; skipping.");
    return null;
  }

  const leaks = resolveLeaksForReportPayload(payload);
  const finding = leaks[0];
  if (!finding) {
    return null;
  }

  const overallScore = payload.healthScore ?? payload.growthScore ?? 0;
  const key = leakKey(finding);
  const body: ExpandFindingBriefRequestBody = {
    domain,
    overallScore,
    finding: leakToFindingInput(finding),
    relatedFindings: relatedForLeak(finding, leaks),
  };

  let expansion: FindingBriefExpansion | null;
  try {
    expansion = await expandFindingBriefWithAnthropic(body);
  } catch (e) {
    console.warn("[extended-analysis] expansion failed for", key, e);
    return null;
  }

  if (!expansion) {
    return null;
  }

  return readMergePersistExtendedAnalysis(supabase, reportId, { [key]: expansion });
}

/**
 * Same as full batch, but skips `excludeLeakKey` (already persisted).
 */
export async function generateRemainingExtendedAnalysisForReport(
  reportId: string,
  domain: string,
  payload: ReportPayload,
  excludeLeakKey: string
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[extended-analysis] ANTHROPIC_API_KEY missing; skipping batch expansion.");
    return;
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn("[extended-analysis] Supabase service client unavailable; skipping.");
    return;
  }

  const leaks = resolveLeaksForReportPayload(payload).filter(
    (l) => leakKey(l) !== excludeLeakKey
  );
  if (leaks.length === 0) {
    return;
  }

  const allLeaks = resolveLeaksForReportPayload(payload);
  const overallScore = payload.healthScore ?? payload.growthScore ?? 0;

  const tasks = leaks.map(async (finding): Promise<[string, FindingBriefExpansion | null]> => {
    const key = leakKey(finding);
    const body: ExpandFindingBriefRequestBody = {
      domain,
      overallScore,
      finding: leakToFindingInput(finding),
      relatedFindings: relatedForLeak(finding, allLeaks),
    };
    try {
      const exp = await expandFindingBriefWithAnthropic(body);
      return [key, exp];
    } catch (e) {
      console.warn("[extended-analysis] expansion failed for", key, e);
      return [key, null];
    }
  });

  const settled = await Promise.all(tasks);
  const map: Record<string, FindingBriefExpansion> = {};
  for (const [k, exp] of settled) {
    if (exp) map[k] = exp;
  }

  if (Object.keys(map).length === 0) {
    console.warn("[extended-analysis] no successful expansions for report", reportId);
    return;
  }

  const merged = await readMergePersistExtendedAnalysis(supabase, reportId, map);
  if (!merged) {
    console.warn("[extended-analysis] merge/persist failed for remaining keys", reportId);
  }
}

/**
 * Pre-generates AI advisor briefs for all 5 dashboard-ranked findings in parallel,
 * then writes them to both reports.extended_analysis and reports.finding_briefs so
 * the expand-finding API's cache check finds the data immediately.
 * Intended as a fire-and-forget background task after scan; logs errors without throwing.
 */
export async function generateAndPersistAllFindingBriefs(
  reportId: string,
  domain: string,
  payload: ReportPayload,
  pageSummary?: string
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[extended-analysis] ANTHROPIC_API_KEY missing; skipping batch expansion.");
    return;
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn("[extended-analysis] Supabase service client unavailable; skipping.");
    return;
  }

  const allLeaks = resolveLeaksForReportPayload(payload);
  const leaks = allLeaks.slice(0, 5);
  if (leaks.length === 0) return;

  const overallScore = payload.healthScore ?? payload.growthScore ?? 0;
  console.log(`[extended-analysis] generating briefs for ${leaks.length} findings | report=${reportId}`);

  const results = await Promise.allSettled(
    leaks.map(async (finding): Promise<[string, FindingBriefExpansion]> => {
      const key = leakKey(finding);
      const body: ExpandFindingBriefRequestBody = {
        domain,
        overallScore,
        finding: leakToFindingInput(finding),
        relatedFindings: relatedForLeak(finding, allLeaks),
        pageSummary,
        siteType: payload.site_type,
      };
      const expansion = await expandFindingBriefWithAnthropic(body);
      if (!expansion) throw new Error(`null expansion for ${key}`);
      return [key, expansion];
    })
  );

  const map: Record<string, FindingBriefExpansion> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      const [key, expansion] = result.value;
      map[key] = expansion;
    } else {
      console.warn("[extended-analysis] brief generation failed:", result.reason);
    }
  }

  if (Object.keys(map).length === 0) {
    console.warn("[extended-analysis] no successful expansions for report", reportId);
    return;
  }

  await persistBriefsBatch(supabase, reportId, map);
}

/**
 * Generates extended analysis for all dashboard-ranked findings in parallel,
 * then writes `reports.extended_analysis` as { [findingKey]: FindingBriefExpansion }.
 * Safe to fire-and-forget after scan; logs errors without throwing to the client response path.
 */
export async function generateAndPersistExtendedAnalysisForReport(
  reportId: string,
  domain: string,
  payload: ReportPayload
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[extended-analysis] ANTHROPIC_API_KEY missing; skipping batch expansion.");
    return;
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    console.warn("[extended-analysis] Supabase service client unavailable; skipping.");
    return;
  }

  const leaks = resolveLeaksForReportPayload(payload);
  if (leaks.length === 0) {
    return;
  }

  const overallScore = payload.healthScore ?? payload.growthScore ?? 0;

  const tasks = leaks.map(async (finding): Promise<[string, FindingBriefExpansion | null]> => {
    const key = leakKey(finding);
    const body: ExpandFindingBriefRequestBody = {
      domain,
      overallScore,
      finding: leakToFindingInput(finding),
      relatedFindings: relatedForLeak(finding, leaks),
    };
    try {
      const expansion = await expandFindingBriefWithAnthropic(body);
      return [key, expansion];
    } catch (e) {
      console.warn("[extended-analysis] expansion failed for", key, e);
      return [key, null];
    }
  });

  const settled = await Promise.all(tasks);
  const map: Record<string, FindingBriefExpansion> = {};
  for (const [key, expansion] of settled) {
    if (expansion) map[key] = expansion;
  }

  if (Object.keys(map).length === 0) {
    console.warn("[extended-analysis] no successful expansions for report", reportId);
    return;
  }

  const merged = await readMergePersistExtendedAnalysis(supabase, reportId, map);
  if (!merged) {
    console.warn("[extended-analysis] merge/persist failed for report", reportId);
  }
}
