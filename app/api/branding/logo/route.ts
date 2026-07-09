import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
};

async function planFor(svc: SupabaseClient, uid: string): Promise<string> {
  const res = await svc.from("profiles").select("plan").eq("id", uid).maybeSingle();
  return String((res.data as { plan?: string } | null)?.plan ?? "free");
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const auth = createServerClient(url, anonKey, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createClient(url, serviceKey);
  // White-label tiers: Agency OR Enterprise (both whiteLabel:true in DASHBOARD_PLANS).
  const plan = await planFor(svc, user.id);
  if (plan !== "agency" && plan !== "enterprise") {
    return NextResponse.json({ error: "White-label branding is an Agency-plan capability." }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch { /* fallthrough */ }
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Logo must be a PNG or SVG." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Logo must be 2MB or smaller." }, { status: 400 });
  }

  const path = `${user.id}/logo-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await svc.storage
    .from("branding")
    .upload(path, buffer, { contentType: file.type, upsert: true, cacheControl: "3600" });
  if (upErr) {
    return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
  }

  const { data } = svc.storage.from("branding").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, filename: file.name });
}
