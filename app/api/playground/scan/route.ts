/**
 * POST /api/playground/scan — rate-limited public scan proxy.
 * 1 scan per IP per hour. PLAYGROUND_API_KEY is never sent to the client.
 */

import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

export async function POST(req: NextRequest) {
  // Rate limit check
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("playground_rate_limits")
    .select("last_scan_at")
    .eq("ip_hash", ipHash)
    .single();

  if (existing?.last_scan_at) {
    const lastScan = new Date(existing.last_scan_at).getTime();
    const hourAgo = Date.now() - 60 * 60 * 1000;
    if (lastScan > hourAgo) {
      const retryAfterMs = lastScan + 60 * 60 * 1000 - Date.now();
      const retryMins = Math.ceil(retryAfterMs / 60000);
      return NextResponse.json(
        { error: "rate_limited", message: `Try again in ${retryMins} minutes or get your own API key`, retry_after_minutes: retryMins },
        { status: 429 }
      );
    }
  }

  // Parse URL from request
  let url: string;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const playgroundKey = process.env.PLAYGROUND_API_KEY;
  if (!playgroundKey) {
    return NextResponse.json({ error: "Playground not configured" }, { status: 503 });
  }

  // Update rate limit record before scan (prevents concurrent abuse)
  await supabase
    .from("playground_rate_limits")
    .upsert({ ip_hash: ipHash, last_scan_at: new Date().toISOString() });

  // Forward to v1/scan using the playground API key (key never exposed to client)
  const origin = new URL(req.url).origin;
  const scanRes = await fetch(`${origin}/api/v1/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${playgroundKey}`,
    },
    body: JSON.stringify({ url }),
  });

  const data = await scanRes.json();
  return NextResponse.json(data, { status: scanRes.status });
}
