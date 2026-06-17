import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BRANDING, sanitizeBranding } from "@/lib/branding";

// profiles is keyed by `id` (= auth user id). Resolve the row for branding
// read/write by that column.
async function loadProfile(svc: SupabaseClient, uid: string): Promise<{ row: Record<string, unknown> | null; keyCol: "id" }> {
  const res = await svc.from("profiles").select("plan, branding").eq("id", uid).maybeSingle();
  return { row: (res.data as Record<string, unknown> | null) ?? null, keyCol: "id" };
}

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) return null;
  return { url, serviceKey, anonKey };
}

async function getUserId(url: string, anonKey: string): Promise<string | null> {
  const cookieStore = await cookies();
  const auth = createServerClient(url, anonKey, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  const { data: { user } } = await auth.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const c = clients();
  if (!c) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const uid = await getUserId(c.url, c.anonKey);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createClient(c.url, c.serviceKey);
  const { row } = await loadProfile(svc, uid);
  const plan = String((row?.plan as string | undefined) ?? "free");
  const branding = row?.branding ? sanitizeBranding(row.branding) : DEFAULT_BRANDING;
  return NextResponse.json({ plan, branding });
}

export async function PUT(req: NextRequest) {
  const c = clients();
  if (!c) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const uid = await getUserId(c.url, c.anonKey);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createClient(c.url, c.serviceKey);
  const { row, keyCol } = await loadProfile(svc, uid);
  const plan = String((row?.plan as string | undefined) ?? "free");

  // White-label is an Agency-tier capability — gate the write server-side.
  if (plan !== "agency") {
    return NextResponse.json({ error: "White-label branding is an Agency-plan capability." }, { status: 403 });
  }

  let body: unknown = {};
  try { body = await req.json(); } catch { /* empty */ }
  const branding = sanitizeBranding(body);

  const { error } = await svc.from("profiles").update({ branding }).eq(keyCol, uid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branding });
}
