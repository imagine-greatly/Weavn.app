/**
 * GET /api/reports/check?domain=<domain> — owned-report discovery for the dashboard.
 *
 * Returns the requesting user's MOST RECENT report row for a domain, including its
 * row id and live status. DashboardShell's ScanProvider calls this right after firing
 * a scan to learn the just-inserted pending row's id (POST /api/scan only returns that
 * id at completion), then polls /api/scan/status/:id by that id.
 *
 * Ownership is enforced: the row is fetched scoped to the caller's user_id, so this
 * only ever reveals the caller's own reports.
 *
 * Response: { exists: false } | { exists: true, reportId, status, share_token,
 *            health_score, created_at }
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain")?.toLowerCase().trim() ?? "";
  if (!domain) return NextResponse.json({ exists: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json({ exists: false });
  }

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* read-only */
      },
    },
  });

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ exists: false }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const { data } = await supabaseAdmin
    .from("reports")
    .select("id, status, share_token, health_score, created_at")
    .eq("domain", domain)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return NextResponse.json({ exists: false });

  const row = data as {
    id: string;
    status: string | null;
    share_token: string | null;
    health_score: number | null;
    created_at: string;
  };

  return NextResponse.json({
    exists: true,
    reportId: String(row.id),
    status: row.status ?? "pending",
    share_token: row.share_token ?? null,
    health_score: typeof row.health_score === "number" ? row.health_score : 0,
    created_at: row.created_at,
  });
}
