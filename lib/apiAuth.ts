import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  plan: string;
  scans_used: number;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export async function validateApiKey(req: NextRequest): Promise<ApiKeyRecord | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  const hash = sha256(token);
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .eq("active", true)
    .single();

  if (error || !data) return null;

  // Update last_used_at — fire and forget
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", (data as ApiKeyRecord).id)
    .then(() => {})
    .catch((err: unknown) => console.error("[apiAuth] last_used_at update failed:", err));

  return data as ApiKeyRecord;
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const random = randomBytes(16).toString("hex"); // 32 hex chars
  const key = `wdoc_live_${random}`;
  const prefix = key.slice(0, 12);
  const hash = sha256(key);
  return { key, hash, prefix };
}
