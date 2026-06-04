/**
 * POST /api/auth/provision-key
 * Idempotent: creates an API key for the authenticated user if one doesn't exist.
 * Returns { already_exists: true } if a key is already active.
 * Returns { success: true } after creating a new key + sending welcome email.
 */

import { createServerClient } from "@supabase/ssr";
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

async function getSessionUserId(req: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll() {},
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
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
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("api_keys")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ already_exists: true });
  }

  const { key, hash, prefix } = generateApiKey();

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
    console.error("[provision-key] insert:", error.message);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  // Fire-and-forget welcome email
  void (async () => {
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return;

      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) return;

      const name = userData?.user?.user_metadata?.full_name as string | undefined;
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "insights@webdocai.com",
        to: email,
        subject: "Your webdocai API key is ready",
        text: buildWelcomeText(name),
      });
    } catch (err) {
      console.error("[provision-key] welcome email failed:", err);
    }
  })();

  // Return the key once — it is never recoverable after this point
  return NextResponse.json({ success: true, key }, { status: 201 });
}
