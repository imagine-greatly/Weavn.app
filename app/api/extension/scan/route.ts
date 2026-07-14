/**
 * POST /api/extension/scan — anonymous scan proxy for the Chrome extension (A1 lead funnel).
 *
 * DISTINCT from /api/playground/scan (marketing site, 1/IP/hour) — the extension gets its OWN
 * budget so the two never contend. No secret is embedded or exposed:
 *   • Auth key: a per-install UUID sent as X-Weavn-Install-Id. Primary budget = 3 scans / 24h.
 *   • Abuse ceiling: the SHA-256 IP hash caps a single network at 15 scans / 24h (shared-office
 *     friendly) to stop one actor farming many install tokens.
 *   • On allowance it proxies to /api/v1/scan with the server-held PLAYGROUND_API_KEY, exactly
 *     like the playground route — the key never reaches the client.
 * Returns the FULL scan result; the extension decides free-vs-gated client-side.
 */

import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  EXTENSION_SCANS_PER_INSTALL_PER_DAY,
  EXTENSION_SCANS_PER_IP_PER_DAY,
  EXTENSION_RATE_WINDOW_SECONDS,
} from "@/lib/constants";

export const maxDuration = 300;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Same IP derivation + salted hash as the playground route — no raw IPs stored.
function hashIp(ip: string): string {
  return createHash("sha256").update(ip + (process.env.INTERNAL_SCAN_KEY ?? "")).digest("hex");
}
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// UUID (any version) — the extension generates one per install and stores it locally.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CORS: reflect chrome-extension:// origins ONLY (never *). The primary caller — the extension
 * service worker with host_permissions — isn't subject to CORS at all; this is belt-and-suspenders
 * for a content-script fallback. Because the request requires a custom header (X-Weavn-Install-Id),
 * any cross-origin browser caller is forced to preflight, and only chrome-extension origins get an
 * Allow-Origin back — so an ordinary website cannot call this from the browser.
 */
function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && origin.startsWith("chrome-extension://")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Weavn-Install-Id",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return { Vary: "Origin" };
}

function json(origin: string | null, body: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(origin), ...extra } });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

type RateResult = { allowed: boolean; scan_count: number; remaining: number; reset_at: string };

/**
 * Atomic per-(scope,key) bump via the bump_extension_rate RPC (migration 030).
 * Returns null on RPC error so the caller can FAIL CLOSED — unlike the per-account limiter
 * (which fails open behind the monthly cap), this endpoint spends the shared PLAYGROUND_API_KEY,
 * so an unverifiable limit must NOT grant a free scan.
 */
async function bump(
  supabase: ReturnType<typeof getServiceClient>,
  scope: string,
  key: string,
  max: number
): Promise<RateResult | null> {
  const { data, error } = await supabase.rpc("bump_extension_rate", {
    p_scope: scope,
    p_key: key,
    p_window_seconds: EXTENSION_RATE_WINDOW_SECONDS,
    p_max: max,
  });
  if (error) {
    console.error(`[extension/scan] bump_extension_rate(${scope}) failed:`, error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as RateResult) ?? null;
}

const secondsUntil = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  // 1. Per-install token (required — no token, no free scan).
  const installId = req.headers.get("x-weavn-install-id")?.trim() ?? "";
  if (!installId || !UUID_RE.test(installId)) {
    return json(origin, { error: "missing_install_id", message: "A valid X-Weavn-Install-Id header is required." }, 400);
  }

  // 2. Parse URL.
  let url: string;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url.trim() : "";
  } catch {
    return json(origin, { error: "invalid_body", message: "url is required" }, 400);
  }
  if (!url) return json(origin, { error: "invalid_body", message: "url is required" }, 400);

  const playgroundKey = process.env.PLAYGROUND_API_KEY;
  if (!playgroundKey) {
    return json(origin, { error: "not_configured", message: "Extension scanning is not configured." }, 503);
  }

  const supabase = getServiceClient();
  const ipHash = hashIp(getClientIp(req));

  // 3. Rate limit. Install budget FIRST (block an over-quota user BEFORE touching the shared
  // per-IP ceiling, so one heavy user can't exhaust an office's IP budget for colleagues),
  // then the per-IP anti-farming ceiling. Fail CLOSED on RPC error (protects COGS).
  const installRl = await bump(supabase, "install", installId, EXTENSION_SCANS_PER_INSTALL_PER_DAY);
  if (!installRl) {
    return json(origin, { error: "rate_check_unavailable", message: "Could not verify your free-scan allowance right now. Please try again shortly." }, 503);
  }
  if (!installRl.allowed) {
    const retry = secondsUntil(installRl.reset_at);
    return json(origin, {
      error: "rate_limited",
      scope: "install",
      message: `You've used your ${EXTENSION_SCANS_PER_INSTALL_PER_DAY} free scans for today — they reset in about ${Math.max(1, Math.ceil(retry / 3600))}h.`,
      scans_remaining: 0,
      scans_per_day: EXTENSION_SCANS_PER_INSTALL_PER_DAY,
      reset_at: installRl.reset_at,
      retry_after_seconds: retry,
    }, 429, { "Retry-After": String(retry) });
  }

  const ipRl = await bump(supabase, "ip", ipHash, EXTENSION_SCANS_PER_IP_PER_DAY);
  if (!ipRl) {
    return json(origin, { error: "rate_check_unavailable", message: "Could not verify your free-scan allowance right now. Please try again shortly." }, 503);
  }
  if (!ipRl.allowed) {
    const retry = secondsUntil(ipRl.reset_at);
    return json(origin, {
      error: "rate_limited",
      scope: "ip",
      message: "This network has reached its shared daily free-scan limit. Try again later, or sign in to use your account's scans.",
      reset_at: ipRl.reset_at,
      retry_after_seconds: retry,
    }, 429, { "Retry-After": String(retry) });
  }

  // 4. Proxy to /api/v1/scan with the server-held playground key (never sent to the client) —
  // exactly the playground pattern. Upstream errors (bot-blocked 422, scan-failed 5xx) are
  // passed through honestly with their status.
  const reqOrigin = new URL(req.url).origin;
  let scanRes: Response;
  try {
    scanRes = await fetch(`${reqOrigin}/api/v1/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${playgroundKey}` },
      body: JSON.stringify({ url }),
    });
  } catch (err) {
    console.error("[extension/scan] upstream fetch failed:", err instanceof Error ? err.message : err);
    return json(origin, { error: "scan_failed", message: "The scan engine is temporarily unavailable. Please try again." }, 502);
  }

  const data = await scanRes.json().catch(() => ({ error: "scan_failed", message: "The scan returned an unreadable response." }));

  // Surface remaining budget on EVERY response (success + passed-through error) so the extension
  // can render "N free scans left today" without a second request. NOTE: the install slot is
  // reserved before the scan runs (anti-concurrency, like the playground route), so a bot-blocked
  // or failed scan still consumes a slot — an honest trade-off; refund-on-failure is a possible
  // follow-up if funnel data shows it hurts conversion.
  return json(origin, data, scanRes.status, {
    "X-Weavn-Scans-Remaining": String(installRl.remaining),
    "X-Weavn-Scans-Per-Day": String(EXTENSION_SCANS_PER_INSTALL_PER_DAY),
    "X-Weavn-Reset-At": installRl.reset_at,
  });
}
