/**
 * POST /api/webhooks/auth
 * Handles Supabase auth events. On SIGNED_UP (or INSERT on auth.users),
 * provisions an API key for the new user if one doesn't already exist.
 *
 * Configure in Supabase Dashboard → Auth → Hooks or Database → Webhooks
 * (table: auth.users, event: INSERT).
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { generateApiKey } from "@/lib/apiAuth";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildWelcomeText(name?: string | null): string {
  return [
    `Hi${name ? ` ${name}` : ''},`,
    '',
    'Your API key has been provisioned. Visit your developer portal to copy it: https://webdocai.com/developer',
    '',
    'Your first 25 scans are free. After that, scans are $0.25 each — no subscription required.',
    '',
    'Docs: https://webdocai.com/docs/api',
    '',
    '— The webdocai team',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Accept both Supabase Auth Hook format (type: SIGNED_UP) and
  // DB webhook format (type: INSERT on auth.users)
  const eventType = String(body?.type ?? body?.event_type ?? "");
  if (eventType !== "SIGNED_UP" && eventType !== "INSERT") {
    return NextResponse.json({ received: true });
  }

  // Auth Hook format: body.user.id / DB webhook format: body.record.id
  const record = (body?.user ?? body?.record) as Record<string, unknown> | undefined;
  const userId = record?.id as string | undefined;
  if (!userId) return NextResponse.json({ received: true });

  const email = record?.email as string | undefined;
  const metadata = (record?.user_metadata ?? record?.raw_user_meta_data) as Record<string, unknown> | undefined;
  const name = metadata?.full_name as string | undefined;

  const supabase = getServiceClient();

  // Idempotency check
  const { data: existing } = await supabase
    .from("api_keys")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, already_exists: true });
  }

  const { key: _key, hash, prefix } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: userId,
    key_hash: hash,
    key_prefix: prefix,
    name: "Default",
    plan: "playground",
    scans_used: 0,
    active: true,
  });

  if (error) {
    console.error("[webhook/auth] api_keys insert:", error.message);
    return NextResponse.json({ error: "Failed to provision key" }, { status: 500 });
  }

  // Fire-and-forget welcome email
  void (async () => {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || !email) return;
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "insights@webdocai.com",
        to: email,
        subject: "Your webdocai API key is ready",
        text: buildWelcomeText(name),
      });
    } catch (err) {
      console.error("[webhook/auth] welcome email failed:", err);
    }
  })();

  return NextResponse.json({ received: true, provisioned: true });
}
