/**
 * POST   /api/developer/generate-key — generate first API key for logged-in user
 * DELETE /api/developer/generate-key — rotate key (deactivate all, create new)
 *
 * Auth: Supabase session (not API key). Full key returned once — only hash stored.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

// POST — generate a new key for first-time setup
export async function POST(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, hash, prefix } = generateApiKey();
  const supabase = getServiceClient();

  const { error } = await supabase.from("api_keys").insert({
    user_id: userId,
    key_hash: hash,
    key_prefix: prefix,
    name: "Default",
    plan: "payg",
    active: true,
  });

  if (error) {
    console.error("[generate-key] insert:", error.message);
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }

  // Full key returned once and never stored — only the hash lives in DB
  return NextResponse.json({ key }, { status: 201 });
}

// DELETE — deactivate all existing keys, issue one new key
export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();

  await supabase.from("api_keys").update({ active: false }).eq("user_id", userId);

  const { key, hash, prefix } = generateApiKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: userId,
    key_hash: hash,
    key_prefix: prefix,
    name: "Default",
    plan: "payg",
    active: true,
  });

  if (error) {
    console.error("[generate-key] rotate:", error.message);
    return NextResponse.json({ error: "Failed to rotate API key" }, { status: 500 });
  }

  return NextResponse.json({ key });
}
