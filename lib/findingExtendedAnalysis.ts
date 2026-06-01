/**
 * Scan-time batch generation of per-finding extended analysis, persisted on reports.extended_analysis.
 */

import Anthropic from "@anthropic-ai/sdk";
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
import {
  EXPAND_FINDING_BRIEF_SYSTEM_PROMPT,
  EXPAND_FINDING_BRIEF_JSON_CONTRACT,
} from "@/lib/prompts";
import { parseFindingBriefPayload } from "@/lib/expandFindingBriefParser";

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
 * Makes ONE Anthropic call for all 5 findings and returns a keyed map of expansions.
 * Returns an empty map on failure; the caller handles logging and fallback.
 */
async function generateAllFindingBriefsMaster(
  reportId: string,
  domain: string,
  payload: ReportPayload,
  pageSummary?: string
): Promise<Record<string, FindingBriefExpansion>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};

  const allLeaks = resolveLeaksForReportPayload(payload);
  const leaks = allLeaks.slice(0, 5);
  if (leaks.length === 0) return {};

  const overallScore = payload.healthScore ?? payload.growthScore ?? 0;
  const siteType = payload.site_type;

  const findingsBlock = leaks
    .map((finding, i) => {
      const f = leakToFindingInput(finding);
      const rel = relatedForLeak(finding, allLeaks);
      const relStr =
        rel.length > 0
          ? rel.map((r) => `  - id=${r.findingId} | category=${r.category} | title=${r.title}`).join("\n")
          : "  (none)";
      return `FINDING [${i + 1}]
Title: ${f.title}
Severity: ${f.severity}
Category: ${f.category}
Page location hint: ${f.page_location?.trim() || "(none)"}
Raw evidence: ${f.whatWeFound}
Why it matters: ${f.whyItMatters}
Resolution guidance: ${f.howToFixIt}
Technical/example: ${f.exampleFix}
Revenue mechanism: ${f.psychologyPrinciple}
Revenue impact score: ${typeof f.revenueImpact === "number" ? f.revenueImpact : "(unknown)"}
Related findings in same category:
${relStr}`;
    })
    .join("\n\n");

  const siteTypeLine = siteType ? `\nSite type: ${siteType}` : "";
  const pageSummaryBlock = pageSummary
    ? `\nPAGE CONTEXT (structured summary of the scanned page — use this to ground every analysis paragraph in real page evidence, not generic CRO advice)\n${pageSummary.slice(0, 4000)}\n`
    : "";

  const userMessage = `Domain: ${domain || "unknown"}
Overall diagnostic score: ${overallScore}/100${siteTypeLine}${pageSummaryBlock}

You are analyzing ${leaks.length} findings for this site. Return a JSON ARRAY of exactly ${leaks.length} objects, one per finding, in the same input order.

${findingsBlock}

TASK
For each finding above, produce a full clinical brief grounded in the PAGE CONTEXT. Reference actual headlines, CTAs, copy, and page structure. No generic CRO advice — every sentence must be specific to this domain and this evidence.

Rules for each array element:
- diagnosticAnalysis: exactly two paragraphs, 120-180 words total. Quote actual page evidence in paragraph 1. Name specific affected audience in paragraph 2. No hedging, no bullets, no headers.
- revenueImpact.impactRatingDisplay must align with severity (Critical→CRITICAL SUPPRESSION, High/HIGH IMPACT→HIGH SUPPRESSION, etc.).
- advisorChips: exactly 3 strings, each a short question specific to THAT finding (not generic).
- advisorOpening: must not echo the title alone as the whole message.

Return ONLY a JSON array of ${leaks.length} objects (no markdown fences, no preamble). Array index 0 = FINDING [1], index 1 = FINDING [2], etc. Each element must match this exact shape:
${EXPAND_FINDING_BRIEF_JSON_CONTRACT}`;

  const systemPromptText =
    EXPAND_FINDING_BRIEF_SYSTEM_PROMPT +
    "\n\nNOTE: You will receive multiple findings in one request. Return a JSON array where each element is a complete brief matching the shape requested in the user message, in the same order as the input findings.";

  const anthropic = new Anthropic({ apiKey, timeout: 120_000 });
  let rawText = "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 7000,
      system: [{ type: "text", text: systemPromptText, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = msg.content.find((b) => b.type === "text");
    rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    console.log(
      `[extended-analysis] master brief done | stop_reason=${msg.stop_reason} output_tokens=${msg.usage?.output_tokens} report=${reportId}`
    );
  } catch (err) {
    console.error(
      "[extended-analysis] master brief API error",
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }

  const map: Record<string, FindingBriefExpansion> = {};
  try {
    const trimmed = rawText.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    const jsonStr = fenced?.[1]?.trim() ?? trimmed;
    const arrStart = jsonStr.indexOf("[");
    const arrEnd = jsonStr.lastIndexOf("]");
    const arrStr =
      arrStart >= 0 && arrEnd > arrStart ? jsonStr.slice(arrStart, arrEnd + 1) : jsonStr;
    const parsed = JSON.parse(arrStr);
    if (!Array.isArray(parsed)) {
      console.error("[extended-analysis] master brief response is not a JSON array");
      return {};
    }
    for (let i = 0; i < leaks.length; i++) {
      const item = parsed[i];
      if (!item) {
        console.warn(`[extended-analysis] master brief missing item at index ${i}`);
        continue;
      }
      const expansion = parseFindingBriefPayload(item as Record<string, unknown>);
      if (expansion) {
        map[leakKey(leaks[i])] = expansion;
      } else {
        console.warn(`[extended-analysis] master brief parse failed for finding index ${i}`);
      }
    }
  } catch (err) {
    console.error(
      "[extended-analysis] master brief JSON parse error",
      err instanceof Error ? err.message : String(err),
      rawText.slice(0, 500)
    );
    return {};
  }

  return map;
}

/**
 * Pre-generates AI advisor briefs for all 5 dashboard-ranked findings in a single
 * Anthropic call, then writes them to both reports.extended_analysis and
 * reports.finding_briefs so the expand-finding API's cache check finds the data
 * immediately. Intended as a fire-and-forget background task after scan; logs errors
 * without throwing. Falls back gracefully — the frontend calls /api/expand-finding
 * per-finding if a brief is missing.
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

  const leaks = resolveLeaksForReportPayload(payload).slice(0, 5);
  if (leaks.length === 0) return;

  console.log(`[extended-analysis] generating briefs for ${leaks.length} findings via master call | report=${reportId}`);

  let map: Record<string, FindingBriefExpansion>;
  try {
    map = await generateAllFindingBriefsMaster(reportId, domain, payload, pageSummary);
  } catch (err) {
    console.warn("[extended-analysis] master brief generation failed:", err instanceof Error ? err.message : err);
    return;
  }

  if (Object.keys(map).length === 0) {
    console.warn("[extended-analysis] no successful expansions for report", reportId);
    return;
  }

  await persistBriefsBatch(supabase, reportId, map);
}

