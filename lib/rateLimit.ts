import { createClient } from "@supabase/supabase-js";
import { SCAN_RATE_WINDOW_SECONDS } from "@/lib/constants";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

/**
 * Per-account fixed-window rate limit. Calls the bump_scan_rate RPC (migration 026)
 * which atomically increments the account's counter and returns whether the request
 * is within the limit.
 *
 * Fails OPEN: if the RPC is unavailable (migration not applied) or errors, the
 * request is allowed. This limiter is a coarse abuse bound — the monthly scan cap
 * (which fails closed for the dashboard) is the real spend ceiling.
 */
export async function checkRateLimit(
  accountKey: string,
  maxPerWindow: number,
  windowSeconds: number = SCAN_RATE_WINDOW_SECONDS
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc("bump_scan_rate", {
      p_key: accountKey,
      p_window_seconds: windowSeconds,
      p_max: maxPerWindow,
    });
    if (error) {
      console.warn("[rateLimit] bump_scan_rate RPC failed (failing open):", error.message);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const allowed = data === true;
    return { allowed, retryAfterSeconds: allowed ? 0 : windowSeconds };
  } catch (err) {
    console.warn("[rateLimit] check failed (failing open):", err instanceof Error ? err.message : err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
