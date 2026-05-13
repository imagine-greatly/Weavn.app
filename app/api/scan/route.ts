/**
 * POST /api/scan — full pipeline: fetch homepage, discover pages, parse, Claude, Supabase.
 * Body: { url: string }
 * Returns: { domain, reportId, payload } or { error }
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { scrapeSite } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { runAnalysis } from "@/lib/analyze";
import type { FindingBriefExpansion } from "@/lib/expandFindingBrief";
import { saveReport } from "@/lib/supabase";
import {
  generateAndPersistExtendedAnalysisForReport,
  generateAndPersistFirstFindingBrief,
  generateRemainingExtendedAnalysisForReport,
  leakKey,
  resolveLeaksForReportPayload,
} from "@/lib/findingExtendedAnalysis";


function mergeCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export const maxDuration = 120;

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function getDomain(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function validateUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WebDocBot/1.0)" },
    });
    clearTimeout(timeout);
    if (res.status >= 200 && res.status < 500) {
      return { valid: true };
    }
    return { valid: false, reason: `Site returned status ${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      return { valid: false, reason: "Site did not respond within 8 seconds" };
    }
    return { valid: false, reason: "Site could not be reached" };
  }
}

export async function POST(req: NextRequest) {
  // Internal API key bypass — checked before any auth/session logic
  const internalKey = req.headers.get("x-internal-key");
  const internalBypass =
    internalKey !== null &&
    Boolean(process.env.INTERNAL_SCAN_KEY) &&
    internalKey === process.env.INTERNAL_SCAN_KEY;

  let userId: string;
  let withCookies: (res: NextResponse) => NextResponse;

  if (internalBypass) {
    console.log("[scan] internal key auth - bypass active");
    userId = "internal";
    withCookies = (res) => res;
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error.", code: "SCAN_SERVER_CONFIG" },
        { status: 500 }
      );
    }

    let supabaseCookieResponse = NextResponse.next({ request: req });
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseCookieResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseCookieResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user?.id) {
      const res = NextResponse.json(
        { error: "Unauthorized", code: "SCAN_UNAUTHORIZED" },
        { status: 401 }
      );
      mergeCookies(supabaseCookieResponse, res);
      return res;
    }
    userId = user.id;
    withCookies = (res: NextResponse) => {
      mergeCookies(supabaseCookieResponse, res);
      return res;
    };
  }

  let url: string;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url : "";
  } catch {
    return withCookies(
      NextResponse.json(
        { error: "Invalid request body.", code: "SCAN_INVALID_BODY" },
        { status: 400 }
      )
    );
  }

  const normalized = normalizeUrl(url);
  if (!normalized) {
    return withCookies(
      NextResponse.json({ error: "Please enter a website URL." }, { status: 400 })
    );
  }

  try {
    new URL(normalized);
  } catch {
    return withCookies(
      NextResponse.json(
        { error: "Invalid URL.", code: "SCAN_INVALID_URL" },
        { status: 400 }
      )
    );
  }

  const domain = getDomain(normalized);
  if (!domain) {
    return withCookies(
      NextResponse.json(
        { error: "Could not determine domain.", code: "SCAN_DOMAIN_REQUIRED" },
        { status: 400 }
      )
    );
  }

  if (!domain.includes(".")) {
    return withCookies(
      NextResponse.json(
        { error: "Invalid URL.", code: "SCAN_INVALID_URL" },
        { status: 400 }
      )
    );
  }

  // 1. Scrape: homepage + up to 4 internal pages
  let extraction;
  try {
    extraction = await scrapeSite(normalized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch the site.";
    const isBlocked =
      /block|forbidden|403|401|access denied|scraping|cannot fetch/i.test(message);
    return withCookies(
      NextResponse.json(
        {
          error: isBlocked
            ? "This site blocks automated access. We couldn't fetch the page."
            : message,
        },
        { status: 422 }
      )
    );
  }

  // If we have no meaningful content, still try AI (it may return a minimal report)
  if (extraction.pages.length === 0) {
    return withCookies(
      NextResponse.json(
        {
          error: "No HTML content could be extracted from the URL.",
          code: "SCAN_NO_HTML",
        },
        { status: 422 }
      )
    );
  }

  // 2. Detect site type from homepage (gates everything that follows)
  const site_type = detectSiteType(extraction);

  // 3. Claude analysis (retry once inside runAnalysis), tailored to site_type
  let payload;
  try {
    payload = await runAnalysis(extraction, site_type);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return withCookies(NextResponse.json({ error: message }, { status: 500 }));
  }

  // 4. Store in Supabase (keyed by domain + timestamp)
  let reportId: string;
  try {
    reportId = await saveReport(domain, payload, userId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save report.";
    return withCookies(
      NextResponse.json(
        { error: message, code: "SCAN_SAVE_FAILED" },
        { status: 500 }
      )
    );
  }

  let extended_analysis: Record<string, FindingBriefExpansion> | undefined;
  try {
    const leaks = resolveLeaksForReportPayload(payload);
    const topFinding = leaks[0];
    if (topFinding) {
      const topLeakKey = leakKey(topFinding);
      const FIRST_BRIEF_MS = 12_000;
      const firstOutcome = generateAndPersistFirstFindingBrief(
        reportId,
        domain,
        payload
      )
        .then((map) => ({ kind: "first" as const, map }))
        .catch((err) => {
          console.warn("[scan] first finding brief failed:", err);
          return { kind: "first" as const, map: null as null };
        });
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutOutcome = new Promise<{ kind: "timeout" }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ kind: "timeout" }), FIRST_BRIEF_MS);
      });
      const raced = await Promise.race([firstOutcome, timeoutOutcome]);
      if (timeoutId && raced.kind === "first") {
        clearTimeout(timeoutId);
      }
      if (
        raced.kind === "first" &&
        raced.map &&
        Object.keys(raced.map).length > 0
      ) {
        extended_analysis = raced.map;
        void generateRemainingExtendedAnalysisForReport(
          reportId,
          domain,
          payload,
          topLeakKey
        ).catch((err) => {
          console.error("[scan] extended_analysis remaining generation failed:", err);
        });
      } else {
        void generateAndPersistExtendedAnalysisForReport(reportId, domain, payload).catch(
          (err) => {
            console.error("[scan] extended_analysis generation failed:", err);
          }
        );
      }
    }
  } catch (err) {
    console.warn("[scan] staged extended_analysis wait failed:", err);
    try {
      void generateAndPersistExtendedAnalysisForReport(reportId, domain, payload).catch(
        (e) => {
          console.error("[scan] extended_analysis generation failed:", e);
        }
      );
    } catch (e) {
      console.warn("[scan] could not schedule extended_analysis fallback:", e);
    }
  }

  return withCookies(
    NextResponse.json({
      domain,
      reportId,
      payload,
      ...(extended_analysis ? { extended_analysis } : {}),
    })
  );
}
