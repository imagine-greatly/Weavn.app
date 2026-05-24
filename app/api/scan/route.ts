/**
 * POST /api/scan — full pipeline: fetch homepage, discover pages, parse, Claude, Supabase.
 * Body: { url: string }
 * Returns: { domain, reportId, payload } or { error }
 */

import { timingSafeEqual } from "crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { scrapeSite, extractInternalLinks, selectSubpageUrls, scrapeSubpageSafe } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { runAnalysis, buildPageSummary } from "@/lib/analyze";
import { saveReport } from "@/lib/supabase";
import { generateAndPersistAllFindingBriefs } from "@/lib/findingExtendedAnalysis";


function mergeCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export const maxDuration = 115;

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


export async function POST(req: NextRequest) {
  console.log('[ROUTE] scan started', new Date().toISOString())

  // Internal API key bypass — checked before any auth/session logic
  const internalKey = req.headers.get("x-internal-key");
  const expectedKey = process.env.INTERNAL_SCAN_KEY ?? "";
  const internalBypass =
    internalKey !== null &&
    expectedKey.length > 0 &&
    internalKey.length === expectedKey.length &&
    timingSafeEqual(Buffer.from(internalKey), Buffer.from(expectedKey));

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
  let reqSource: string | null = null;
  let reqScanType: string | null = null;
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url : "";
    const isRescan = body?.rescan === true;
    reqSource = typeof body?.source === "string" ? body.source : null;
    reqScanType = typeof body?.scan_type === "string" ? body.scan_type : null;
    console.log("[scan] rescan flag:", isRescan);
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

  const scanStart = Date.now()
  console.log(`[scan] START | url=${normalized} domain=${domain} userId=${userId}`)

  // Hard 85 s deadline for scrape + analysis only. Timer is cleared once Claude succeeds so
  // saveReport always runs to completion (it takes 2-3 s and must not be interrupted).
  let deadlineTimerId: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    deadlineTimerId = setTimeout(
      () => reject(new Error('[TIMEOUT] Scan exceeded 85 s deadline — exiting cleanly to flush logs')),
      85_000
    );
  });

  // 1. Scrape: homepage + up to 4 internal pages
  let extraction;
  const scrapeStart = Date.now()
  process.stderr.write(`[ROUTE] SCRAPE START | url=${normalized}\n`)
  console.log(`[scan] SCRAPE START | url=${normalized}`)
  try {
    extraction = await Promise.race([scrapeSite(normalized), deadline]);
    const scrapeElapsedMs = Date.now() - scrapeStart
    process.stderr.write(`[ROUTE] SCRAPE DONE | rawHtml_len=${extraction.rawHtml.length} pages=${extraction.pagesAnalyzed.length} elapsed=${scrapeElapsedMs}ms\n`)
    console.log(
      `[scan] SCRAPE DONE | domain=${domain}` +
      ` rawHtml_len=${extraction.rawHtml.length}` +
      ` pages=${extraction.pagesAnalyzed.length}` +
      ` pagesAnalyzed=${JSON.stringify(extraction.pagesAnalyzed)}` +
      ` elapsed=${scrapeElapsedMs}ms`
    )
  } catch (err) {
    const scrapeElapsed = Date.now() - scrapeStart
    const message = err instanceof Error ? err.message : "Failed to fetch the site.";
    const isBlocked =
      /block|forbidden|403|401|access denied|scraping|cannot fetch/i.test(message);
    process.stderr.write(`[ROUTE] SCRAPE ERROR | elapsed=${scrapeElapsed}ms isBlocked=${isBlocked} message=${message}\n`)
    console.error(`[scan] SCRAPE ERROR | domain=${domain} elapsed=${scrapeElapsed}ms | isBlocked=${isBlocked} | message=${message}`)
    console.error(`[scan] SCRAPE ERROR stack:`, err instanceof Error ? (err.stack ?? err.message) : err)
    console.log(`[scan] returning 422 | domain=${domain}`)
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
  if (!extraction.rawHtml) {
    process.stderr.write(`[ROUTE] 422 no rawHtml | elapsed=${Date.now() - scanStart}ms\n`)
    console.log(`[scan] 422 no rawHtml | domain=${domain} elapsed=${Date.now() - scanStart}ms`)
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
  process.stderr.write(`[ROUTE] detectSiteType START | htmlLen=${extraction.rawHtml.length}\n`)
  let site_type: ReturnType<typeof detectSiteType>;
  try {
    site_type = detectSiteType(extraction);
  } catch (err) {
    process.stderr.write(`[ROUTE] detectSiteType THREW | ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
    throw err;
  }
  process.stderr.write(`[ROUTE] detectSiteType DONE | site_type=${site_type} elapsed=${Date.now() - scanStart}ms\n`)
  console.log(`[scan] SITE_TYPE | domain=${domain} site_type=${site_type} elapsed=${Date.now() - scanStart}ms`)

  // Fetch user plan for model selection (agency uses higher-capacity model)
  let userPlan = "free";
  if (!internalBypass) {
    const planStart = Date.now()
    try {
      const supabaseService = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: profile } = await supabaseService
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .maybeSingle();
      userPlan = profile?.plan ?? "free";
      console.log(`[scan] USER_PLAN | domain=${domain} plan=${userPlan} elapsed=${Date.now() - planStart}ms`)
    } catch (err) {
      console.log(`[scan] USER_PLAN ERROR (non-fatal, using free) | domain=${domain}`, err instanceof Error ? (err.stack ?? err.message) : err)
    }
  }

  // 2.5. Pro plan: scrape 2 subpages in parallel for deeper multi-page analysis
  const planLower = userPlan.toLowerCase();
  const isProPlan = planLower === 'pro' || planLower === 'agency';
  const homepageScrapeMs = Date.now() - scrapeStart;

  if (isProPlan && homepageScrapeMs < 45_000) {
    const subpageStart = Date.now();
    process.stderr.write(`[ROUTE] subpage scraping START | homepageScrapeMs=${homepageScrapeMs} elapsed=${Date.now() - scanStart}ms\n`);
    try {
      const allLinks = extractInternalLinks(extraction.rawHtml, normalized);
      const subpageUrls = selectSubpageUrls(allLinks, site_type);
      process.stderr.write(`[ROUTE] subpages selected=${JSON.stringify(subpageUrls)}\n`);

      if (subpageUrls.length > 0) {
        const results = await Promise.allSettled(
          subpageUrls.map(url => scrapeSubpageSafe(url))
        );
        const additionalPages = results
          .map(r => r.status === 'fulfilled' ? r.value : null)
          .filter((p): p is { url: string; rawHtml: string } => p !== null);

        if (additionalPages.length > 0) {
          extraction = {
            ...extraction,
            additionalPages,
            pagesAnalyzed: [extraction.pagesAnalyzed[0], ...additionalPages.map(p => p.url)],
          };
          process.stderr.write(`[ROUTE] subpages added=${additionalPages.length} pagesAnalyzed=${JSON.stringify(extraction.pagesAnalyzed)} elapsed=${Date.now() - subpageStart}ms\n`);
        }
      }
    } catch (err) {
      process.stderr.write(`[ROUTE] subpage scraping ERROR (non-fatal) | ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  // 3. Claude analysis (retry once inside runAnalysis), tailored to site_type.
  // Deadline is time-aware: allocates remaining budget minus 5 s for save.
  const analyzeTimeoutMs = Math.max(40_000, Math.min(82_000, 110_000 - (Date.now() - scanStart)));
  const analyzeDeadline = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('[TIMEOUT] Analysis timed out')),
      analyzeTimeoutMs
    )
  )
  let payload;
  const analyzeStart = Date.now()
  process.stderr.write(`[ROUTE] runAnalysis START | domain=${domain} site_type=${site_type} plan=${userPlan} pagesAnalyzed=${extraction.pagesAnalyzed.length} analyzeTimeoutMs=${analyzeTimeoutMs} elapsed_since_scan_start=${Date.now() - scanStart}ms\n`)
  console.log(`[scan] ANALYZE START | domain=${domain} site_type=${site_type} userPlan=${userPlan} pages=${extraction.pagesAnalyzed.length}`)
  try {
    payload = await Promise.race([runAnalysis(extraction, site_type, userPlan), analyzeDeadline]);
    process.stderr.write(`[ROUTE] runAnalysis DONE | elapsed=${Date.now() - analyzeStart}ms\n`)
    console.log(`[scan] ANALYZE DONE | domain=${domain} elapsed=${Date.now() - analyzeStart}ms`)
    // Analysis succeeded — cancel the global deadline so saveReport can't be interrupted.
    clearTimeout(deadlineTimerId!);
  } catch (err) {
    process.stderr.write(`[ROUTE] runAnalysis ERROR | elapsed=${Date.now() - analyzeStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
    console.error(`[scan] ANALYZE ERROR | domain=${domain} elapsed=${Date.now() - analyzeStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : err}`)
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return withCookies(NextResponse.json({ error: message }, { status: 500 }));
  }

  // 4. Store in Supabase (keyed by domain + timestamp)
  let reportId: string;
  const saveStart = Date.now()
  process.stderr.write(`[ROUTE] saveReport START | domain=${domain}\n`)
  console.log(`[scan] SAVE START | domain=${domain}`)
  try {
    reportId = await saveReport(domain, payload, userId, { source: reqSource, scan_type: reqScanType });
    process.stderr.write(`[ROUTE] saveReport DONE | reportId=${reportId} elapsed=${Date.now() - saveStart}ms\n`)
    console.log(`[scan] SAVE DONE | domain=${domain} reportId=${reportId} elapsed=${Date.now() - saveStart}ms`)
  } catch (err) {
    process.stderr.write(`[ROUTE] saveReport ERROR | elapsed=${Date.now() - saveStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
    console.error(`[scan] SAVE ERROR | domain=${domain} elapsed=${Date.now() - saveStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : err}`)
    const message = err instanceof Error ? err.message : "Failed to save report.";
    return withCookies(
      NextResponse.json(
        { error: message, code: "SCAN_SAVE_FAILED" },
        { status: 500 }
      )
    );
  }

  console.log(`[scan] COMPLETE | domain=${domain} reportId=${reportId} total_elapsed=${Date.now() - scanStart}ms`)

  // Fire-and-forget: pre-generate AI advisor briefs for all findings in the background.
  // The response goes out immediately; briefs are written to reports.extended_analysis as they complete.
  const pageSummaryForBriefs = buildPageSummary(extraction).slice(0, 5000);
  void generateAndPersistAllFindingBriefs(reportId, domain, payload, pageSummaryForBriefs).catch((err) => {
    console.log("[scan] background brief generation failed:", err instanceof Error ? (err.stack ?? err.message) : err);
  });

  return withCookies(
    NextResponse.json({ domain, reportId, payload })
  );
}
