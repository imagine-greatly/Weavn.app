import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  expandFindingBriefWithAnthropic,
  parseFindingBriefFromStoredValue,
  type FindingBriefExpansion,
} from "@/lib/expandFindingBrief";
import type { ExpandFindingBriefRelated } from "@/lib/prompts";

export const dynamic = "force-dynamic";

export type { FindingBriefExpansion };

type ExpandFindingBody = {
  report_id?: string;
  finding_id?: string;
  domain?: string;
  overallScore?: number;
  relatedFindings?: ExpandFindingBriefRelated[];
  finding?: {
    title?: string;
    severity?: string;
    category?: string;
    whatWeFound?: string;
    whyItMatters?: string;
    howToFixIt?: string;
    exampleFix?: string;
    psychologyPrinciple?: string;
    revenueImpact?: number;
    page_location?: string;
  };
};

function isMissingDbColumnError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = String(err.message ?? "");
  return err.code === "PGRST204" || /column.*does not exist/i.test(msg);
}

async function readCachedBrief(
  supabase: Awaited<ReturnType<typeof createAuthedSupabase>>,
  reportId: string,
  findingId: string
): Promise<FindingBriefExpansion | null> {
  if (!supabase) return null;

  const { data: row, error } = await supabase
    .from("reports")
    .select("finding_briefs")
    .eq("id", reportId)
    .maybeSingle();

  if (error && isMissingDbColumnError(error)) {
    const { data: fbRow, error: fbErr } = await supabase
      .from("finding_briefs")
      .select("brief")
      .eq("report_id", reportId)
      .eq("finding_id", findingId)
      .maybeSingle();
    if (fbErr) return null;
    return parseFindingBriefFromStoredValue(fbRow?.brief);
  }

  if (error || !row) return null;

  const map = row.finding_briefs as Record<string, unknown> | null | undefined;
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  const raw = map[findingId];
  return parseFindingBriefFromStoredValue(raw);
}

async function persistBriefToSupabase(
  supabase: NonNullable<Awaited<ReturnType<typeof createAuthedSupabase>>>,
  reportId: string,
  findingId: string,
  brief: FindingBriefExpansion
): Promise<void> {
  const payload = JSON.parse(JSON.stringify(brief)) as FindingBriefExpansion;

  const { data: cur, error: readErr } = await supabase
    .from("reports")
    .select("finding_briefs")
    .eq("id", reportId)
    .maybeSingle();

  if (readErr && isMissingDbColumnError(readErr)) {
    const { error: upErr } = await supabase.from("finding_briefs").upsert(
      {
        report_id: reportId,
        finding_id: findingId,
        brief: payload as unknown as Record<string, unknown>,
        created_at: new Date().toISOString(),
      },
      { onConflict: "report_id,finding_id" }
    );
    if (upErr) console.warn("[expand-finding] finding_briefs table upsert failed", upErr);
    return;
  }

  if (readErr) {
    console.warn("[expand-finding] read finding_briefs failed", readErr);
    return;
  }

  const existing =
    cur?.finding_briefs &&
    typeof cur.finding_briefs === "object" &&
    !Array.isArray(cur.finding_briefs)
      ? (cur.finding_briefs as Record<string, unknown>)
      : {};
  const merged = { ...existing, [findingId]: payload };

  const { error: upErr } = await supabase
    .from("reports")
    .update({ finding_briefs: merged })
    .eq("id", reportId);

  if (upErr && isMissingDbColumnError(upErr)) {
    const { error: fbErr } = await supabase.from("finding_briefs").upsert(
      {
        report_id: reportId,
        finding_id: findingId,
        brief: payload as unknown as Record<string, unknown>,
        created_at: new Date().toISOString(),
      },
      { onConflict: "report_id,finding_id" }
    );
    if (fbErr) console.warn("[expand-finding] finding_briefs table upsert failed", fbErr);
    return;
  }

  if (upErr) console.warn("[expand-finding] reports.finding_briefs update failed", upErr);
}

async function createAuthedSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* session refresh not required for this POST */
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ExpandFindingBody;

    const domain = typeof body.domain === "string" ? body.domain.trim() : "";
    const score =
      typeof body.overallScore === "number" && Number.isFinite(body.overallScore)
        ? Math.round(body.overallScore)
        : 0;
    const f = body.finding ?? {};
    const title = typeof f.title === "string" ? f.title : "";
    if (!title.trim()) {
      return NextResponse.json(
        { error: "Missing finding title.", code: "EXPAND_FINDING_MISSING" },
        { status: 400 }
      );
    }

    const reportId = typeof body.report_id === "string" ? body.report_id.trim() : "";
    const findingId = typeof body.finding_id === "string" ? body.finding_id.trim() : "";

    const supabase = await createAuthedSupabase();
    const {
      data: { user },
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    if (supabase && user && reportId && findingId) {
      const cached = await readCachedBrief(supabase, reportId, findingId);
      if (cached) {
        const res = NextResponse.json({ ...cached, cached: true });
        res.headers.set("Cache-Control", "no-store, max-age=0");
        return res;
      }
    }

    const related: ExpandFindingBriefRelated[] = Array.isArray(body.relatedFindings)
      ? body.relatedFindings
          .map((r) => ({
            findingId: typeof r?.findingId === "string" ? r.findingId.trim() : "",
            title: typeof r?.title === "string" ? r.title.trim() : "",
            category: typeof r?.category === "string" ? r.category.trim() : "",
          }))
          .filter((r) => r.findingId && r.title)
      : [];

    const parsed = await expandFindingBriefWithAnthropic({
      domain,
      overallScore: score,
      finding: {
        title,
        severity: typeof f.severity === "string" ? f.severity : "",
        category: typeof f.category === "string" ? f.category : "",
        whatWeFound: typeof f.whatWeFound === "string" ? f.whatWeFound : "",
        whyItMatters: typeof f.whyItMatters === "string" ? f.whyItMatters : "",
        howToFixIt: typeof f.howToFixIt === "string" ? f.howToFixIt : "",
        exampleFix: typeof f.exampleFix === "string" ? f.exampleFix : "",
        psychologyPrinciple:
          typeof f.psychologyPrinciple === "string" ? f.psychologyPrinciple : "",
        revenueImpact:
          typeof f.revenueImpact === "number" && Number.isFinite(f.revenueImpact)
            ? f.revenueImpact
            : undefined,
        page_location:
          typeof f.page_location === "string" ? f.page_location : undefined,
      },
      relatedFindings: related,
    });

    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid model response.", code: "EXPAND_FINDING_PARSE" },
        { status: 502 }
      );
    }

    if (supabase && user && reportId && findingId) {
      void persistBriefToSupabase(supabase, reportId, findingId, parsed);
    }

    const res = NextResponse.json({ ...parsed, cached: false });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Expand finding failed.";
    console.error("[expand-finding]", err);
    return NextResponse.json(
      { error: message, code: "EXPAND_FINDING_ERROR" },
      { status: 500 }
    );
  }
}
