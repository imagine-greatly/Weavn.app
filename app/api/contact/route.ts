import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = new Set(["issue", "feedback", "story"]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as {
    type?: string;
    data?: unknown;
    email?: string;
  };

  const type = typeof b.type === "string" ? b.type.trim() : "";
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  if (!b.data || typeof b.data !== "object" || Array.isArray(b.data)) {
    return NextResponse.json({ error: "data must be an object" }, { status: 400 });
  }

  const emailRaw = typeof b.email === "string" ? b.email.trim() : "";
  const email = emailRaw.length > 0 ? emailRaw.slice(0, 320) : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Contact is not configured" }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const row = {
    id: randomUUID(),
    type,
    data: b.data as Record<string, unknown>,
    email,
  };

  const { error } = await supabase.from("contact_submissions").insert(row);
  if (error) {
    console.error("[contact]", error.message);
    return NextResponse.json({ error: "Could not save submission" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
