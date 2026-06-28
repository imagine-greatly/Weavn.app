/**
 * POST /api/auth/welcome-email
 * Re-sends the welcome email to the authenticated user.
 * Reads user identity from Supabase session — no body required.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getSessionUser(req: NextRequest): Promise<{ id: string; email: string; name?: string } | null> {
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
  if (!user?.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name as string | undefined,
  };
}

function buildWelcomeText(name?: string | null): string {
  return [
    `Hi${name ? ` ${name}` : ''},`,
    '',
    'Your API key has been provisioned. Visit your developer portal to copy it: https://weavn.app/console',
    '',
    'Your first 25 scans are free. After that, scans are $0.30 each — no subscription required.',
    '',
    'Docs: https://weavn.app/docs/api',
    '',
    '— The Weavn team',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[welcome-email] RESEND_API_KEY not set");
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  // Confirm they have an active key before sending
  const supabase = getServiceClient();
  const { data: keyRow } = await supabase
    .from("api_keys")
    .select("id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!keyRow) {
    return NextResponse.json({ error: "No active API key found" }, { status: 404 });
  }

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "Weavn <insights@weavn.app>",
      to: user.email,
      subject: "Your Weavn API key is ready",
      text: buildWelcomeText(user.name),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[welcome-email] send failed:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
