import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { FREE_API_TRIAL_SCANS } from "@/lib/constants";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

// Fire-and-forget: report api_scan units to Stripe metered billing.
// costCents: real model cost for this scan in cents (e.g. $0.083 → 8). Defaults to 1 unit.
export function reportUsageToStripe(apiKeyId: string, costCents = 1): void {
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
        .eq("user_id", userId)
        .single();
      const customerId = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
      if (!customerId) return;

      const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });
      await stripe.billing.meterEvents.create({
        event_name: "api_scan",
        payload: { stripe_customer_id: customerId, value: String(Math.max(1, costCents)) },
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
      page_count: data.pageCount ?? 1,
      cost_usd: data.costUsd ?? 0,
      cached: data.cached ?? false,
    });
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
    // Report to Stripe metered billing (fire and forget) — value in cents
    if (data.status === "success" && !data.cached) {
      reportUsageToStripe(apiKeyId, Math.max(1, Math.round((data.costUsd ?? 0.15) * 100)));
    }
  } catch (err) {
    console.error("[usageTracking] logScanUsage failed:", err);
  }
}

// Plans that are subject to the free trial ceiling. Any other plan value is
// treated as paid/subscription and passes through without a trial gate.
const FREE_TRIAL_PLANS = new Set(["playground", "payg", "free"]);

export async function checkScanAllowed(
  apiKeyId: string
): Promise<{ allowed: boolean; reason?: string; limit?: number; used?: number; remaining?: number }> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("plan, scans_used")
    .eq("id", apiKeyId)
    .single();

  if (error || !data) {
    // DB lookup failure — allow through rather than blocking on infra errors
    console.warn("[checkScanAllowed] key lookup failed:", error?.message ?? "no data");
    return { allowed: true };
  }

  const row = data as { plan: string; scans_used: number };

  // Paid / subscription plans are not trial-gated (plan-level limits are a later task)
  if (!FREE_TRIAL_PLANS.has(row.plan)) {
    return { allowed: true };
  }

  // Free trial plan: enforce lifetime ceiling
  if (row.scans_used >= FREE_API_TRIAL_SCANS) {
    return {
      allowed: false,
      reason: "trial_exhausted",
      limit: FREE_API_TRIAL_SCANS,
      used: row.scans_used,
    };
  }

  return {
    allowed: true,
    remaining: FREE_API_TRIAL_SCANS - row.scans_used,
  };
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
