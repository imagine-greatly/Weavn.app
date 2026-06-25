import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  FREE_API_TRIAL_SCANS,
  DASHBOARD_PLAN_MONTHLY_CAPS,
  API_PLAN_INCLUDED_SCANS,
} from "@/lib/constants";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

// Fire-and-forget: report SCAN-COUNT units to Stripe metered billing.
//
// BILLING (customer-facing), kept strictly separate from COGS: the meter counts
// SCANS, not dollars. One billable scan = `scanCount` units (default 1). The
// Stripe metered price (see scripts/setup-stripe.ts) applies the included
// allowance ($0 up to the tier's quota) and the per-scan overage rate via
// graduated tiers — so the dollar logic lives in the price, never here.
//
// This deliberately does NOT pass model cost. Real model COGS
// (realScanCostUsd → api_usage.cost_usd / reports.scan_cost_usd) is internal
// margin accounting and never touches the meter.
export function reportUsageToStripe(apiKeyId: string, scanCount = 1): void {
  void (async () => {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const meterId = process.env.STRIPE_API_SCAN_METER_ID;
      if (!stripeKey || !meterId) return;

      const supabase = getServiceClient();

      // Resolve user_id from api_keys
      const { data: keyRow } = await supabase
        .from("api_keys")
        .select("user_id")
        .eq("id", apiKeyId)
        .single();
      const userId = (keyRow as { user_id?: string } | null)?.user_id;
      if (!userId) return;

      // Resolve stripe_customer_id from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", userId)
        .single();
      const customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
      if (!customerId) return;

      const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
      await stripe.billing.meterEvents.create({
        event_name: "api_scan",
        payload: { stripe_customer_id: customerId, value: String(Math.max(1, Math.round(scanCount))) },
      });
    } catch (err) {
      console.error("[usageTracking] reportUsageToStripe failed:", err);
    }
  })();
}

export async function logScanUsage(
  apiKeyId: string,
  data: {
    url: string;
    score: number | null;
    responseTimeMs: number;
    status: "success" | "error";
    statusCode: number;
    // "scan"/"scan_batch" = full scans (status + findings). "scan_score"/"scan_batch_score"
    // = score-only scans (status + score + dimension coverages, pass-2 skipped). The label is
    // the distinct billing/COGS flag for score mode — quota + the Stripe scan-meter unit below
    // are UNCHANGED (one billable scan either way); only the endpoint tag and the real cost_usd
    // (materially lower with no pass-2 output) differ. Plain text column, no CHECK — additive.
    endpoint?: "scan" | "scan_batch" | "scan_score" | "scan_batch_score";
    errorCode?: string | null;
    pageCount?: number;
    costUsd?: number;
    cached?: boolean;
  }
): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from("api_usage").insert({
      api_key_id: apiKeyId,
      url: data.url,
      score: data.score,
      response_time_ms: data.responseTimeMs,
      status: data.status,
      status_code: data.statusCode,
      endpoint: data.endpoint ?? "scan",
      error_code: data.errorCode ?? null,
      page_count: data.pageCount ?? 1,
      cost_usd: data.costUsd ?? 0,
      cached: data.cached ?? false,
    });
    // Consume quota ONLY on a successful scan. A failed scan (scrape/analyze/parse/
    // save error) must NOT decrement the user's remaining scans — they got nothing,
    // so they pay nothing. Cached hits never reach here (the cache path skips
    // logScanUsage) and rejected requests use logRejectedRequest, which never
    // increments — so this is the single place scans_used grows.
    if (data.status === "success") {
      await supabase.rpc("increment_scans_used", { key_id: apiKeyId }).then(() => {}, () => {
        // Fallback: manual increment if RPC not available
        return supabase
          .from("api_keys")
          .select("scans_used")
          .eq("id", apiKeyId)
          .single()
          .then(({ data: row }) => {
            const current = (row as { scans_used?: number } | null)?.scans_used ?? 0;
            return supabase
              .from("api_keys")
              .update({ scans_used: current + 1 })
              .eq("id", apiKeyId);
          });
      });
    }
    // Report to Stripe metered billing (fire and forget) — ONE scan unit per
    // billable scan. Included allowance + overage rate are applied by the Stripe
    // price tiers. cost_usd above is internal COGS and is intentionally NOT sent.
    if (data.status === "success" && !data.cached) {
      reportUsageToStripe(apiKeyId, 1);
    }
  } catch (err) {
    console.error("[usageTracking] logScanUsage failed:", err);
  }
}

/**
 * Log a REJECTED request (401/402/429/400) to api_usage for instrumentation. A reject
 * consumed NO scan, so this deliberately does NOT call increment_scans_used and does
 * NOT report to Stripe — it only writes the log row. status text is 'error' (back-compat)
 * with status_code/error_code carrying the real class. `apiKeyId` may be null (401, key
 * unknown); such rows are correctly invisible to per-user RLS SELECT. Never throws.
 */
export async function logRejectedRequest(
  apiKeyId: string | null,
  data: {
    url: string;
    statusCode: number;
    endpoint: "scan" | "scan_batch";
    errorCode: string;
    responseTimeMs?: number;
    keyPrefixAttempted?: string | null;
  }
): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from("api_usage").insert({
      api_key_id: apiKeyId,
      url: data.url,
      score: null,
      response_time_ms: data.responseTimeMs ?? 0,
      status: "error",
      status_code: data.statusCode,
      endpoint: data.endpoint,
      error_code: data.errorCode,
      page_count: 1,
      cost_usd: 0,
      cached: false,
      key_prefix_attempted: data.keyPrefixAttempted ?? null,
    });
  } catch (err) {
    console.error("[usageTracking] logRejectedRequest failed:", err);
  }
}

// Plans that are subject to the free trial ceiling. Any other plan value is
// treated as paid/subscription.
const FREE_TRIAL_PLANS = new Set(["playground", "payg", "free"]);

function utcMonthStartISO(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
function utcNextMonthStartISO(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

// Count billable scans (successful, non-cached) for an API key in the current UTC month.
async function countApiMonthlyScans(
  supabase: ReturnType<typeof getServiceClient>,
  apiKeyId: string
): Promise<number> {
  const { count } = await supabase
    .from("api_usage")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .eq("status", "success")
    .eq("cached", false)
    .gte("created_at", utcMonthStartISO());
  return count ?? 0;
}

export interface ScanAllowance {
  allowed: boolean;
  reason?: string;
  limit?: number; // included quota (paid) or trial ceiling
  used?: number; // scans this period (or lifetime for trial)
  remaining?: number; // included scans left this period (>= 0)
  overage?: boolean; // allowed but beyond included quota — billed as overage (API only)
  plan?: string;
}

/**
 * API-path allowance (keyed by api_key_id).
 * - Trial plans: blocked at the lifetime FREE_API_TRIAL_SCANS ceiling.
 * - Paid API tiers (dev/builder/scale): included monthly quota; ABOVE it scans are
 *   still allowed and flagged `overage: true` so the caller bills the per-scan
 *   overage rate. Never hard-blocked.
 * - Enterprise / unknown paid plan: unlimited (custom contract).
 * Fails OPEN on infra error: the API path meters and bills every scan, so a
 * lookup blip can't cause unbounded loss here (unlike the dashboard hard cap).
 */
export async function checkScanAllowed(apiKeyId: string): Promise<ScanAllowance> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("plan, scans_used")
    .eq("id", apiKeyId)
    .single();

  if (error || !data) {
    console.warn("[checkScanAllowed] key lookup failed (allowing — API is metered):", error?.message ?? "no data");
    return { allowed: true };
  }

  const row = data as { plan: string; scans_used: number };
  const plan = row.plan;

  // Trial plans: lifetime ceiling.
  if (FREE_TRIAL_PLANS.has(plan)) {
    if (row.scans_used >= FREE_API_TRIAL_SCANS) {
      return { allowed: false, reason: "trial_exhausted", limit: FREE_API_TRIAL_SCANS, used: row.scans_used, plan };
    }
    return {
      allowed: true,
      limit: FREE_API_TRIAL_SCANS,
      used: row.scans_used,
      remaining: FREE_API_TRIAL_SCANS - row.scans_used,
      plan,
    };
  }

  // Paid API tiers: included quota + overage.
  const included = API_PLAN_INCLUDED_SCANS[plan];
  if (included == null) {
    // Enterprise / custom — unlimited by contract.
    return { allowed: true, plan };
  }

  let used = 0;
  try {
    used = await countApiMonthlyScans(supabase, apiKeyId);
  } catch (e) {
    console.warn("[checkScanAllowed] monthly count failed (allowing — API is metered):", e instanceof Error ? e.message : e);
    return { allowed: true, limit: included, plan };
  }

  return {
    allowed: true,
    limit: included,
    used,
    remaining: Math.max(0, included - used),
    overage: used >= included,
    plan,
  };
}

export interface DashboardAllowance {
  allowed: boolean;
  plan: string;
  limit: number | null; // null = unlimited (enterprise/custom)
  used: number;
  reason?: string;
  resetsAt?: string;
}

/**
 * Dashboard-path allowance (keyed by user_id). HARD CAP per plan — no overage.
 * Counts completed (non-pending/failed/error) reports this UTC month against the
 * plan's cap. Plans absent from DASHBOARD_PLAN_MONTHLY_CAPS (enterprise) are
 * unlimited.
 *
 * THROWS on any DB error so the caller can fail CLOSED — a lookup blip must never
 * silently grant unlimited scans to a hard-capped paid tier (unbounded loss).
 */
export async function checkDashboardScanAllowed(userId: string): Promise<DashboardAllowance> {
  const supabase = getServiceClient();

  const { data: profile, error: planErr } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  if (planErr) throw new Error(`profile plan lookup failed: ${planErr.message}`);

  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const cap = DASHBOARD_PLAN_MONTHLY_CAPS[plan];

  // Unlimited by contract.
  if (cap == null) {
    return { allowed: true, plan, limit: null, used: 0 };
  }

  const { count, error: countErr } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", utcMonthStartISO())
    .neq("status", "pending")
    .neq("status", "failed")
    .neq("status", "error");
  if (countErr) throw new Error(`monthly scan count failed: ${countErr.message}`);

  const used = count ?? 0;
  if (used >= cap) {
    return { allowed: false, plan, limit: cap, used, reason: "monthly_cap_reached", resetsAt: utcNextMonthStartISO() };
  }
  return { allowed: true, plan, limit: cap, used };
}

export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export async function deductCredits(userId: string, amount: number): Promise<void> {
  const supabase = getServiceClient();

  const { data: keyRow } = await supabase
    .from("api_keys")
    .select("id, scans_used")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  const row = keyRow as { id?: string; scans_used?: number } | null;
  if (!row?.id) throw new InsufficientCreditsError("No active API key found for user");

  const allowed = await checkScanAllowed(row.id);
  if (!allowed.allowed) throw new InsufficientCreditsError(allowed.reason ?? "Insufficient credits");

  await supabase
    .from("api_keys")
    .update({ scans_used: (row.scans_used ?? 0) + amount })
    .eq("id", row.id);
}

export async function getScanCount(apiKeyId: string): Promise<number> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("scans_used")
    .eq("id", apiKeyId)
    .single();
  if (error || !data) return 0;
  return (data as { scans_used: number }).scans_used;
}
