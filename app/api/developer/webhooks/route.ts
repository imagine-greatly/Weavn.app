/**
 * GET    /api/developer/webhooks — list webhooks for logged-in user
 * POST   /api/developer/webhooks — add a webhook
 * DELETE /api/developer/webhooks — remove a webhook
 *
 * Auth: Supabase session (not API key). Secret is never returned.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

async function getActiveApiKeyId(userId: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("api_keys")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data?.id ?? null;
}

// GET — list webhooks for the logged-in user
export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKeyId = await getActiveApiKeyId(userId);
  if (!apiKeyId) return NextResponse.json({ webhooks: [] });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("webhooks")
    .select("id, url, active, created_at")
    .eq("api_key_id", apiKeyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[webhooks] GET:", error.message);
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }

  return NextResponse.json({ webhooks: data ?? [] });
}

// POST — add a webhook
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { url } = body as { url?: string };

  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  const apiKeyId = await getActiveApiKeyId(userId);
  if (!apiKeyId) return NextResponse.json({ error: "No active API key found" }, { status: 400 });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("webhooks")
    .insert({ api_key_id: apiKeyId, url, active: true })
    .select("id, url, active, created_at")
    .single();

  if (error) {
    console.error("[webhooks] POST:", error.message);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE — remove a webhook (ownership verified before deletion)
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const apiKeyId = await getActiveApiKeyId(userId);
  if (!apiKeyId) return NextResponse.json({ error: "No active API key found" }, { status: 400 });

  const supabase = getServiceClient();

  // Verify this webhook belongs to the user before deleting
  const { data: existing } = await supabase
    .from("webhooks")
    .select("id")
    .eq("id", id)
    .eq("api_key_id", apiKeyId)
    .single();

  if (!existing) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  const { error } = await supabase.from("webhooks").delete().eq("id", id);

  if (error) {
    console.error("[webhooks] DELETE:", error.message);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
