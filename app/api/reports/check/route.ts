import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.toLowerCase().trim() ?? "";
  if (!domain) return NextResponse.json({ exists: false });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ exists: false });

  const supabase = createClient(url, key);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("reports")
    .select("id, health_score")
    .eq("domain", domain)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ exists: false });

  return NextResponse.json({
    exists: true,
    score: typeof data.health_score === "number" ? data.health_score : 0,
    reportId: String(data.id),
  });
}
