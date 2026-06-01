/**
 * Supabase server client for storing and retrieving reports.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ReportPayload } from "./reportSchema";
import { mergeStoredReportBody } from "./mergeStoredReport";

/** Jsonb / denormalized columns that may be missing on older DBs — retry insert without them. */
export const REPORT_OPTIONAL_JSONB_COLUMNS = [
  "overview_copy",
  "primary_findings",
  "secondary_findings",
  "opportunity_findings",
  "money_leaks",
  "quick_wins",
  "growth_roadmap",
  "dimension_scores",
  "extended_analysis",
] as const;

/** Optional scalar columns (new migrations). */
export const REPORT_OPTIONAL_SCALAR_COLUMNS = [
  "score_delta",
  "previous_score",
  "growth_score",
  "share_token",
  "biggest_opportunity",
  "estimated_impact",
  "source",
  "scan_type",
] as const;

export function stripReportOptionalJsonbColumns<T extends Record<string, unknown>>(
  row: T
): T {
  const out = { ...row } as T;
  for (const k of REPORT_OPTIONAL_JSONB_COLUMNS) {
    delete (out as Record<string, unknown>)[k];
  }
  for (const k of REPORT_OPTIONAL_SCALAR_COLUMNS) {
    delete (out as Record<string, unknown>)[k];
  }
  return out;
}

export function isMissingReportColumnError(err: { message?: string } | null | undefined): boolean {
  const msg = err?.message ?? "";
  if (!msg) return false;
  const lower = msg.toLowerCase();
  if (!lower.includes("column") && !lower.includes("schema cache")) return false;
  if (REPORT_OPTIONAL_JSONB_COLUMNS.some((c) => msg.includes(c))) return true;
  if (REPORT_OPTIONAL_SCALAR_COLUMNS.some((c) => msg.includes(c))) return true;
  return false;
}

type InsertReportRowResult<T> = {
  data: T | null;
  error: { message?: string; code?: string; details?: string } | null;
};

/**
 * Insert into `reports`; if PostgREST rejects optional jsonb columns, retry without them.
 * Uses `.select()` (array) as returned by the browser client after insert.
 */
export async function insertReportRowWithOptionalJsonbFallback(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<InsertReportRowResult<unknown[]>> {
  type RowResult = { data: unknown[] | null; error: { message?: string } | null };
  let first: RowResult;
  try {
    first = (await supabase.from("reports").insert(row).select()) as RowResult;
  } catch (err) {
    console.warn("[DB] reports insert threw, retrying without optional jsonb columns:", err);
    first = {
      data: null,
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }

  if (!first.error && first.data) return { data: first.data, error: null };
  if (first.error && isMissingReportColumnError(first.error)) {
    console.warn(
      "[DB] Failed to write overview_copy / optional jsonb columns:",
      first.error.message
    );
    const second = (await supabase
      .from("reports")
      .insert(stripReportOptionalJsonbColumns(row))
      .select()) as RowResult;
    return { data: second.data, error: second.error };
  }
  return { data: first.data, error: first.error };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getClient() {
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey);
}

export interface StoredReportRow {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
}

type ReportRowRaw = {
  id: string;
  domain: string;
  created_at: string;
  analysis?: unknown;
  payload?: unknown;
  overview_copy?: unknown;
};

function rowToStoredReport(row: ReportRowRaw): StoredReportRow {
  const merged = mergeStoredReportBody(row.analysis, row.payload, row.overview_copy);
  return {
    id: row.id,
    domain: row.domain,
    created_at: row.created_at,
    analysis: merged ?? (row.analysis as ReportPayload),
  };
}

/** Save report keyed by domain + timestamp. Returns the inserted row id. */
export async function saveReport(
  domain: string,
  analysis: ReportPayload,
  userId: string | null,
  options?: { source?: string | null; scan_type?: string | null }
): Promise<string> {
  const uid = typeof userId === "string" && userId.trim() ? userId.trim() : null;

  const supabase = getClient();
  const normalizedDomain = domain.toLowerCase().trim();
  const overviewCopy = analysis.overviewCopy ?? null;
  const share_token = randomUUID();
  const dimRows = Array.isArray(analysis.dimensionScores)
    ? analysis.dimensionScores
    : [];
  const dimLog = dimRows.map(
    (d) => `${String((d as { label?: string }).label ?? "?")}=${String((d as { score?: number }).score ?? "?")}`
  );
  console.log(
    "[DB] saveReport dimension_scores (before insert):",
    dimLog.length ? dimLog.join(" | ") : "(none)"
  );

  const row = {
    domain: normalizedDomain,
    analysis: { ...analysis, shareToken: share_token },
    overview_copy: overviewCopy,
    user_id: uid ?? null,
    share_token,
    money_leaks:
      analysis.moneyLeaks ??
      analysis.primaryFindings ??
      analysis.priorityFindings ??
      null,
    quick_wins: analysis.quickWins ?? null,
    growth_roadmap: analysis.growthRoadmap ?? null,
    verdict:
      analysis.overviewCopy?.verdict ??
      analysis.executiveSummary?.verdict ??
      null,
    biggest_opportunity: analysis.overviewCopy?.biggestOpportunity ?? null,
    estimated_impact: analysis.overviewCopy?.estimatedImpact ?? null,
    health_score:
      typeof analysis.healthScore === "number"
        ? analysis.healthScore
        : typeof analysis.growthScore === "number"
          ? analysis.growthScore
          : 0,
    critical_count: analysis.criticalCount ?? null,
    high_count: analysis.highCount ?? null,
    total_failed: analysis.totalFailed ?? null,
    total_passed: analysis.totalPassed ?? null,
    dimension_scores: analysis.dimensionScores ?? null,
    source: options?.source ?? null,
    scan_type: options?.scan_type ?? 'full',
  };

  let data: { id: string } | null = null;
  let error: { message?: string } | null = null;
  try {
    const r = await supabase.from("reports").insert(row).select("id").single();
    data = r.data as { id: string } | null;
    error = r.error;
  } catch (err) {
    console.warn("[DB] reports insert threw (saveReport):", err);
    error = { message: err instanceof Error ? err.message : String(err) };
  }

  if (!error && data?.id) return data.id;

  if (error && isMissingReportColumnError(error)) {
    console.warn("[DB] Failed to write overview_copy, retrying without optional jsonb columns:", error.message);
    const { data: d2, error: e2 } = await supabase
      .from("reports")
      .insert(stripReportOptionalJsonbColumns(row))
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    if (!(d2 as { id?: string } | null)?.id) throw new Error("Failed to save report.");
    return (d2 as { id: string }).id;
  }

  if (error) throw new Error(error.message ?? "Failed to save report.");
  throw new Error("Failed to save report.");
}

/** Get the latest report for a domain, or null if none. */
export async function getLatestReport(domain: string, userId?: string): Promise<StoredReportRow | null> {
  const supabase = getClient();
  const normalizedDomain = domain.toLowerCase().trim();
  const { data, error } = await supabase
    .from("reports")
    .select("id, domain, created_at, analysis, payload, overview_copy")
    .eq("domain", normalizedDomain)
    .maybeSingle();

  // Legacy fallback: if userId isn't present, don't break existing deployments.
  if (!userId) {
    if (error) {
      if (error.code === "PGRST116") return null; // no rows
      throw new Error(error.message);
    }
    if (!data) return null;
    return rowToStoredReport(data as ReportRowRaw);
  }

  const { data: userData, error: userError } = await supabase
    .from("reports")
    .select("id, domain, created_at, analysis, payload, overview_copy")
    .eq("domain", normalizedDomain)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (userError) {
    if (userError.code === "PGRST116") return null; // no rows
    throw new Error(userError.message);
  }

  return rowToStoredReport(userData as ReportRowRaw);
}

/** Public share link lookup — no user id; returns merged analysis only. */
export async function getReportPayloadByShareToken(
  token: string
): Promise<{ domain: string; payload: ReportPayload } | null> {
  const supabase = getClient();
  const t = typeof token === "string" ? token.trim() : "";
  if (!t || t.length > 64) return null;
  const { data, error } = await supabase
    .from("reports")
    .select("domain, analysis, payload, overview_copy")
    .eq("share_token", t)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ReportRowRaw;
  const merged = mergeStoredReportBody(row.analysis, row.payload, row.overview_copy);
  if (!merged) return null;
  return {
    domain: String(row.domain ?? "").toLowerCase().trim(),
    payload: merged as ReportPayload,
  };
}

export async function getUserReports(userId: string, limit = 3): Promise<
  Array<{ id: string; domain: string; created_at: string; analysis: ReportPayload }>
> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, domain, created_at, analysis")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Array<{
    id: string;
    domain: string;
    created_at: string;
    analysis: ReportPayload;
  }>;
}

type JsonLike = Record<string, unknown>;

export async function getProfilePlanAndScanCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ plan?: string; scan_count?: number } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("plan, scan_count")
    .eq("id", userId)
    .maybeSingle();
  return (data as { plan?: string; scan_count?: number } | null) ?? null;
}

export async function incrementProfileScanCount(
  supabase: SupabaseClient,
  userId: string,
  scanCount: number
): Promise<void> {
  await supabase
    .from("profiles")
    .update({ scan_count: scanCount + 1 })
    .eq("id", userId);
}

export async function createProfileWithScanCount(
  supabase: SupabaseClient,
  userId: string,
  plan: "free" | "pro" = "free",
  scanCount = 1
): Promise<void> {
  await supabase.from("profiles").insert({
    id: userId,
    plan,
    scan_count: scanCount,
  });
}

/** Most recent prior report for rescan comparison (call before inserting a new row). */
export async function getPreviousScanForRescan(
  supabase: SupabaseClient,
  domain: string,
  userId: string
): Promise<{ previousScore: number; created_at: string } | null> {
  const d = domain.toLowerCase().trim();
  const { data, error } = await supabase
    .from("reports")
    .select("health_score, created_at")
    .eq("domain", d)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { health_score?: number | null; created_at?: string };
  if (typeof row.health_score !== "number" || typeof row.created_at !== "string") return null;
  return { previousScore: row.health_score, created_at: row.created_at };
}

export async function getLatestReportPayloadByDomain(
  supabase: SupabaseClient,
  domain: string,
  userId: string
): Promise<unknown | null> {
  const { data } = await supabase
    .from("reports")
    .select("payload")
    .eq("domain", domain.toLowerCase().trim())
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return ((data as { payload?: unknown } | null)?.payload ?? null) as unknown | null;
}

