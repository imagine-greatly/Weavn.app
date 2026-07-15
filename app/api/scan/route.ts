/**
 * POST /api/scan — full pipeline: fetch homepage, discover pages, parse, Claude, Supabase.
 * Body: { url: string }
 * Returns: { domain, reportId, payload } or { error }
 */

import { timingSafeEqual, randomUUID } from "crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { scrapeSite, extractInternalLinks, selectSubpageUrls, scrapeSubpageSafe } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { runAnalysis, buildPageSummary } from "@/lib/analyze";
import { runRubricScan, wrapSummary } from "@/lib/rubricEngine";
import { extractPageData } from "@/lib/analyzePipeline";
import Anthropic from "@anthropic-ai/sdk";
import type { ReportPayload } from "@/lib/reportSchema";
import DIAGNOSTIC_CHECKS from "@/lib/diagnosticRubric";
import { scoreColor, opportunityFraming, COVERAGE_TOLERANCE } from "@/lib/verdict";
import { saveReport } from "@/lib/supabase";
import { generateAndPersistAllFindingBriefs } from "@/lib/findingExtendedAnalysis";
import { checkDashboardScanAllowed } from "@/lib/usageTracking";
import { checkRateLimit } from "@/lib/rateLimit";
import { Resend } from "resend";
import { DASHBOARD_RATE_LIMIT_PER_MIN } from "@/lib/constants";

// SAME gate as /api/v1/scan: when WEAVN_RUBRIC_SCORING="true", the dashboard runs the unified
// rubric engine (311-check two-pass coverage score) — identical engine to the API. When unset,
// BOTH surfaces fall back to the self-reported runAnalysis path, so they never diverge.
const RUBRIC_SCORING_ENABLED = process.env.WEAVN_RUBRIC_SCORING === "true";
// Dashboard rubric scans narrate the top findings (interactive/full mode — never score-only).
const DASHBOARD_FINDING_LIMIT = 12;


function mergeCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export const maxDuration = 800;

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


/**
 * CSRF / origin guard for the cookie-authenticated scan path. Returns true when the request is a
 * trusted first-party call OR the approved Chrome-extension path:
 *   • No Origin header            → allow. A victim's browser ALWAYS attaches Origin to a cross-site
 *                                   POST, so a missing Origin is never CSRF; also covers same-origin
 *                                   edge cases + server-to-server callers.
 *   • Origin host === request Host → allow. The existing web dashboard (weavn.app→weavn.app, preview
 *                                   hosts, localhost) — behavior UNCHANGED, no header required.
 *   • chrome-extension:// Origin   → allow ONLY with X-Weavn-Client: extension.
 *   • any other (foreign) Origin   → reject. A malicious site's forged POST carries its own https
 *                                   Origin, can't spoof a chrome-extension Origin, and can't add the
 *                                   custom header cross-origin without a preflight this route never
 *                                   grants it. The session cookie is still required downstream —
 *                                   this is defense-in-depth.
 */
function isAllowedScanOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin.startsWith("chrome-extension://")) {
    return req.headers.get("x-weavn-client") === "extension";
  }
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

// Preflight for the Chrome-extension logged-in path (custom header + credentials → preflight).
// Same-origin dashboard calls never preflight, so this handler doesn't affect them.
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("chrome-extension://")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Weavn-Client",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }
  return new NextResponse(null, { status: 204, headers: { Vary: "Origin" } });
}

// Thin wrapper: run the scan, then add credentialed CORS headers for the extension path ONLY.
// Same-origin dashboard responses (Origin is https://weavn.app, not chrome-extension) get nothing
// added → behavior identical to before this change.
export async function POST(req: NextRequest) {
  const res = await handleScan(req);
  const origin = req.headers.get("origin");
  if (origin && origin.startsWith("chrome-extension://")) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.append("Vary", "Origin");
  }
  return res;
}

async function handleScan(req: NextRequest): Promise<NextResponse> {
  console.log('[ROUTE] scan started', new Date().toISOString())

  // Internal API key bypass — checked before any auth/session logic
  const internalKey = req.headers.get("x-internal-key");
  const expectedKey = process.env.INTERNAL_SCAN_KEY ?? "";
  const internalBypass =
    internalKey !== null &&
    expectedKey.length > 0 &&
    internalKey.length === expectedKey.length &&
    timingSafeEqual(Buffer.from(internalKey), Buffer.from(expectedKey));

  // CSRF / origin guard — see isAllowedScanOrigin. Internal-key calls (no browser Origin) are
  // exempt. This ADDS the Chrome-extension path (chrome-extension:// Origin + X-Weavn-Client
  // header); the first-party web dashboard (same-origin) is unaffected.
  if (!internalBypass && !isAllowedScanOrigin(req)) {
    return NextResponse.json(
      { error: "Forbidden origin.", code: "SCAN_FORBIDDEN_ORIGIN" },
      { status: 403 }
    );
  }

  let userId: string | null;
  let withCookies: (res: NextResponse) => NextResponse;

  if (internalBypass) {
    console.log("[scan] internal key auth - bypass active");
    userId = null;
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

  // ── Per-plan monthly scan cap (HARD CAP, fail closed) + per-account rate limit ─
  // Applies to every non-internal, logged-in user — Free AND paid tiers. Paid
  // "unlimited" plans are NOT exempt: each plan has a monthly cap (Starter 50,
  // Pro 200, Agency 500; Enterprise unlimited by contract). The cap is the spend
  // ceiling, so a DB error here fails CLOSED rather than granting unlimited scans.
  // resolvedUserPlan is reused later for model selection (avoids a second lookup).
  let resolvedUserPlan: string | null = null;
  if (!internalBypass && userId) {
    // (a) Coarse per-account rate limit — bounds scripted bursts. Fails open.
    const rl = await checkRateLimit(`dash:${userId}`, DASHBOARD_RATE_LIMIT_PER_MIN);
    if (!rl.allowed) {
      return withCookies(
        NextResponse.json(
          {
            error: "Too many scans in a short time. Please slow down and try again shortly.",
            reason: "rate_limited",
            retry_after_seconds: rl.retryAfterSeconds,
          },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
        )
      );
    }

    // (b) Monthly hard cap.
    let gate;
    try {
      gate = await checkDashboardScanAllowed(userId);
    } catch (quotaErr) {
      // FAIL CLOSED: we could not verify the cap, so we must not let the scan
      // proceed (a hard-capped paid tier would otherwise become unlimited).
      console.error("[scan] quota check failed — failing closed:", quotaErr instanceof Error ? quotaErr.message : quotaErr);
      return withCookies(
        NextResponse.json(
          { error: "Could not verify your scan quota right now. Please try again in a moment.", reason: "quota_check_unavailable" },
          { status: 503 }
        )
      );
    }

    resolvedUserPlan = gate.plan;
    if (!gate.allowed) {
      return withCookies(
        NextResponse.json(
          {
            error: "Monthly scan limit reached. Upgrade your plan to run more scans.",
            reason: gate.reason ?? "monthly_cap_reached",
            plan: gate.plan,
            limit: gate.limit,
            used: gate.used,
            resets_at: gate.resetsAt,
          },
          { status: 429 }
        )
      );
    }
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

  // Service role client — used for pending row management and email throughout the scan
  const supabaseAdmin = (
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ) ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null;

  // Insert a pending row immediately so the client can poll for completion status
  let pendingReportId: string | null = null;
  if (supabaseAdmin) {
    try {
      const { data: pendingData } = await supabaseAdmin
        .from('reports')
        .insert({
          domain,
          user_id: userId,
          status: 'pending',
          health_score: 0,
          verdict: 'pending',
          analysis: {},
          share_token: randomUUID(),
        })
        .select('id')
        .single();
      pendingReportId = (pendingData as { id?: string } | null)?.id ?? null;
      console.log(`[scan] PENDING ROW | domain=${domain} pendingReportId=${pendingReportId}`);
    } catch (err) {
      console.log(`[scan] PENDING ROW FAILED (non-fatal) | ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const markFailed = async () => {
    if (!pendingReportId || !supabaseAdmin) return;
    try {
      await supabaseAdmin.from('reports').update({ status: 'failed' }).eq('id', pendingReportId);
    } catch {}
  };

  const scanStart = Date.now()
  console.log(`[scan] START | url=${normalized} domain=${domain} userId=${userId}`)

  // Hard 85 s deadline for scrape + analysis only. Timer is cleared once Claude succeeds so
  // saveReport always runs to completion (it takes 2-3 s and must not be interrupted).
  let deadlineTimerId: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    deadlineTimerId = setTimeout(
      () => reject(new Error('[TIMEOUT] Scan exceeded 240 s deadline — exiting cleanly to flush logs')),
      240_000
    );
  });

  // 1. Scrape: homepage + up to 4 internal pages
  let extraction;
  let scrapeError: Error | null = null;
  const isRetry = false;
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
    scrapeError = err instanceof Error ? err : new Error(message);
  }

  if (scrapeError && !isRetry) {
    console.log('[ROUTE] scrape failed — waiting 8s and retrying once')
    await new Promise(resolve => setTimeout(resolve, 8000))
    // retry the scrape once
    try {
      extraction = await Promise.race([scrapeSite(normalized), deadline])
      scrapeError = null
    } catch (retryErr) {
      console.log('[ROUTE] scrape retry also failed')
    }
  }

  if (scrapeError) {
    const message = scrapeError.message;
    const isBlocked =
      /block|forbidden|403|401|access denied|scraping|cannot fetch/i.test(message);
    console.log(`[scan] returning 422 | domain=${domain}`)
    await markFailed();
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
  if (!extraction || !extraction.rawHtml) {
    process.stderr.write(`[ROUTE] 422 no rawHtml | elapsed=${Date.now() - scanStart}ms\n`)
    console.log(`[scan] 422 no rawHtml | domain=${domain} elapsed=${Date.now() - scanStart}ms`)
    await markFailed();
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

  // User plan for scan DEPTH (Pro+ gets deeper multi-page scraping below; the analysis
  // model is Sonnet across all tiers). Reuse the plan already resolved by the
  // monthly-cap gate above to avoid a second lookup.
  // profiles is keyed by `id` (= auth user id), so the lookup below uses .eq("id").
  let userPlan = resolvedUserPlan ?? "free";
  if (!internalBypass && resolvedUserPlan === null) {
    const planStart = Date.now()
    try {
      const supabaseService = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const planResult = await Promise.race([
        supabaseService.from("profiles").select("plan").eq("id", userId).maybeSingle(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('[TIMEOUT] plan lookup')), 5_000)
        ),
      ]);
      userPlan = planResult.data?.plan ?? "free";
      console.log(`[scan] USER_PLAN | domain=${domain} plan=${userPlan} elapsed=${Date.now() - planStart}ms`)
    } catch (err) {
      if (err instanceof Error && err.message === '[TIMEOUT] plan lookup') {
        process.stderr.write('[ROUTE] plan lookup TIMEOUT — defaulting to free\n')
      }
      console.log(`[scan] USER_PLAN ERROR (non-fatal, using free) | domain=${domain}`, err instanceof Error ? (err.stack ?? err.message) : err)
    }
  }

  // 2.5. Deeper multi-page analysis (scrape subpages) — Pro and up: Pro, Agency, Enterprise.
  const complexity = extraction.complexity ?? 'medium'
  const planLower = userPlan.toLowerCase();
  const isProPlan = planLower === 'pro' || planLower === 'agency' || planLower === 'enterprise';
  const homepageScrapeMs = Date.now() - scrapeStart;

  if (isProPlan && homepageScrapeMs < 45_000) {
    const subpageStart = Date.now();
    process.stderr.write(`[ROUTE] subpage scraping START | homepageScrapeMs=${homepageScrapeMs} elapsed=${Date.now() - scanStart}ms\n`);
    try {
      const allLinks = extractInternalLinks(extraction.rawHtml, normalized);
      const subpageUrls = selectSubpageUrls(allLinks, site_type);
      process.stderr.write(`[ROUTE] subpages selected=${JSON.stringify(subpageUrls)}\n`);

      if (subpageUrls.length > 0) {
        const subpageCapMs = complexity === 'simple' ? 12_000 : complexity === 'complex' ? 20_000 : 16_000
        const collected: PromiseSettledResult<{ url: string; rawHtml: string } | null>[] = []
        const tasks = subpageUrls.map(u =>
          scrapeSubpageSafe(u, complexity)
            .then(v => { collected.push({ status: 'fulfilled', value: v }); return v })
            .catch(e => { collected.push({ status: 'rejected', reason: e }); return null })
        )
        process.stderr.write(
          '[ROUTE] subpage race cap | complexity=' + complexity +
          ' capMs=' + subpageCapMs + 'ms\n'
        )
        await Promise.race([
          Promise.all(tasks),
          new Promise<void>(resolve => setTimeout(resolve, subpageCapMs)),
        ])
        if (collected.length < subpageUrls.length) {
          process.stderr.write(`[ROUTE] subpage outer race TIMEOUT | capMs=${subpageCapMs} dropped=${subpageUrls.length - collected.length}\n`)
        }
        const results = collected;
        const additionalPages = results
          .map(r => r.status === 'fulfilled' ? r.value : null)
          .filter((p): p is { url: string; rawHtml: string } => p !== null);

        const failedSubpages = subpageUrls.filter(u => !additionalPages.some(p => p.url === u));
        if (failedSubpages.length > 0) {
          process.stderr.write(`[ROUTE] subpages FAILED=${JSON.stringify(failedSubpages)}\n`);
        }

        if (additionalPages.length > 0) {
          extraction = {
            ...extraction,
            additionalPages,
            pagesAnalyzed: [extraction.pagesAnalyzed[0], ...additionalPages.map(p => p.url)],
            pagesAttempted: subpageUrls,
          };
          process.stderr.write(`[ROUTE] subpages added=${additionalPages.length} pagesAnalyzed=${JSON.stringify(extraction.pagesAnalyzed)} elapsed=${Date.now() - subpageStart}ms\n`);
        } else {
          extraction = { ...extraction, pagesAttempted: subpageUrls };
        }
      }
    } catch (err) {
      process.stderr.write(`[ROUTE] subpage scraping ERROR (non-fatal) | ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  // 3. Claude analysis (retry once inside runAnalysis), tailored to site_type.
  // Deadline is complexity-aware: simple sites get less time, complex sites more.
  const elapsed = Date.now() - scanStart
  const isMultiPage = (extraction.additionalPages?.length ?? 0) > 0
  const baseTimeout = (() => {
    if (isMultiPage) {
      if (complexity === 'complex') return 160_000
      if (complexity === 'medium') return 140_000
      return 120_000 // simple
    }
    if (complexity === 'complex') return 200_000
    if (complexity === 'medium') return 130_000
    return 90_000 // simple
  })()
  const calculatedTimeout = baseTimeout - elapsed
  const floor = isMultiPage ? 110_000 : 80_000

  const ceiling = isMultiPage
    ? (complexity === 'complex' ? 140_000
       : complexity === 'medium' ? 115_000
       : 85_000)
    : (complexity === 'complex' ? 150_000
       : complexity === 'medium' ? 95_000
       : 72_000)

  const analyzeTimeoutMs = Math.min(
    ceiling,
    Math.max(floor, calculatedTimeout)
  )
  process.stderr.write(
    '[ROUTE] analyzeTimeoutMs=' + analyzeTimeoutMs +
    ' ceiling=' + ceiling +
    ' complexity=' + complexity +
    ' multipage=' + isMultiPage + '\n'
  )
  const analyzeDeadline = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('[TIMEOUT] Analysis timed out')),
      analyzeTimeoutMs
    )
  )
  let payload;
  let scanTokensUsed: number | undefined;
  const analyzeStart = Date.now()
  process.stderr.write(`[ROUTE] runAnalysis START | domain=${domain} site_type=${site_type} plan=${userPlan} pagesAnalyzed=${extraction.pagesAnalyzed.length} analyzeTimeoutMs=${analyzeTimeoutMs} elapsed_since_scan_start=${Date.now() - scanStart}ms\n`)
  console.log(`[scan] ANALYZE START | domain=${domain} site_type=${site_type} userPlan=${userPlan} pages=${extraction.pagesAnalyzed.length}`)
  try {
    if (RUBRIC_SCORING_ENABLED) {
      // Unified engine: the SAME runRubricScan that powers /api/v1/scan. The dashboard now runs the
      // validated 311-check two-pass coverage score (full mode = findings), not a self-reported call.
      const rubricClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: analyzeTimeoutMs });
      const summaryContent = wrapSummary(buildPageSummary(extraction));
      const r = await runRubricScan({
        client: rubricClient,
        analyzeDeadline,
        summaryContent,
        siteType: site_type,
        findingLimit: DASHBOARD_FINDING_LIMIT,
        scoreOnly: false,
        pagesAnalyzed: extraction.pagesAnalyzed,
        logLabel: domain,
      });
      payload = { ...r.reportPayload, scanCostUsd: r.costUsd } as ReportPayload & { scanCostUsd: number };
      scanTokensUsed = r.tokensUsed;
    } else {
      payload = await Promise.race([runAnalysis(extraction, site_type, userPlan, undefined), analyzeDeadline]);
    }
    process.stderr.write(`[ROUTE] runAnalysis DONE | elapsed=${Date.now() - analyzeStart}ms\n`)
    console.log(`[scan] ANALYZE DONE | domain=${domain} elapsed=${Date.now() - analyzeStart}ms`)
    // Analysis succeeded — cancel the global deadline so saveReport can't be interrupted.
    clearTimeout(deadlineTimerId!);
  } catch (err) {
    process.stderr.write(`[ROUTE] runAnalysis ERROR | elapsed=${Date.now() - analyzeStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
    console.error(`[scan] ANALYZE ERROR | domain=${domain} elapsed=${Date.now() - analyzeStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : err}`)
    const message = err instanceof Error ? err.message : "Analysis failed.";
    await markFailed();
    // Rubric denominator guard: refuse to emit a misleading score on a degraded/near-empty render.
    if (message.includes("INSUFFICIENT_EVALUATION")) {
      return withCookies(
        NextResponse.json(
          { error: "We couldn't evaluate enough of this page to score it confidently — it likely didn't fully render or is mostly blank. Please retry in a moment.", reason: "insufficient_evaluation" },
          { status: 422 }
        )
      );
    }
    return withCookies(NextResponse.json({ error: message }, { status: 500 }));
  }

  // Persist API-poll parity fields (mirrors /api/v1/scan). api_* namespaced + additive — the
  // dashboard client ignores unknown keys. On the rubric path api_page_type / api_strengths /
  // api_growth_blueprint already come from rubricEngine; here we add route-local metadata + scan_meta.
  try {
    const pd = extractPageData(extraction.rawHtml, normalized, "homepage");
    (payload as unknown as Record<string, unknown>).api_metadata = {
      word_count: pd.wordCount,
      cta_count: pd.ctaCount,
      tech_stack: pd.structured_data ?? [],
    };
  } catch { /* best-effort metadata */ }
  const persistedCost = (payload as { scanCostUsd?: number }).scanCostUsd;
  (payload as unknown as Record<string, unknown>).api_scan_meta = {
    complexity,
    duration_ms: Date.now() - scanStart,
    cost_usd: typeof persistedCost === "number" ? persistedCost : undefined,
    tokens_used: scanTokensUsed,
    finding_limit: DASHBOARD_FINDING_LIMIT,
    finding_depth: "full",
    site_type,
    cached: false,
  };

  // 4. Store in Supabase (keyed by domain + timestamp)
  let reportId = '';
  const saveStart = Date.now()
  process.stderr.write(`[ROUTE] saveReport START | domain=${domain}\n`)
  console.log(`[scan] SAVE START | domain=${domain}`)
  try {
    reportId = await Promise.race([
      saveReport(domain, payload, userId, { source: reqSource, scan_type: reqScanType, reportId: pendingReportId }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('[ROUTE] saveReport TIMEOUT')), 10_000)
      ),
    ]);
    process.stderr.write(`[ROUTE] saveReport DONE | reportId=${reportId} elapsed=${Date.now() - saveStart}ms\n`)
    console.log(`[scan] SAVE DONE | domain=${domain} reportId=${reportId} elapsed=${Date.now() - saveStart}ms`)
  } catch (err) {
    if (err instanceof Error && err.message === '[ROUTE] saveReport TIMEOUT') {
      process.stderr.write('[ROUTE] saveReport TIMEOUT\n')
    } else {
      process.stderr.write(`[ROUTE] saveReport ERROR | elapsed=${Date.now() - saveStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
      console.error(`[scan] SAVE ERROR | domain=${domain} elapsed=${Date.now() - saveStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : err}`)
      const message = err instanceof Error ? err.message : "Failed to save report.";
      await markFailed();
      return withCookies(
        NextResponse.json(
          { error: message, code: "SCAN_SAVE_FAILED" },
          { status: 500 }
        )
      );
    }
  }

  // Resolve the canonical share_token for this report. saveReport's update path rewrites
  // share_token on each save, so read the final value by id. This token keys the public
  // /reports/[token] route and the scan-completion email link, matching the v1 API contract
  // (see app/api/v1/scan/route.ts).
  let shareToken: string | null = null;
  if (supabaseAdmin && reportId) {
    try {
      const { data: tokenRow } = await supabaseAdmin
        .from('reports')
        .select('share_token')
        .eq('id', reportId)
        .maybeSingle();
      shareToken = (tokenRow as { share_token?: string | null } | null)?.share_token ?? null;
    } catch (err) {
      console.log(`[scan] share_token lookup failed (non-fatal) | ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Email notification — non-blocking, must not delay the scan response
  if (userId && supabaseAdmin) {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = userData?.user?.email;
      if (userEmail) {
        const criticalCount = typeof payload.criticalCount === 'number' ? payload.criticalCount : 0;
        const highCount = typeof payload.highCount === 'number' ? payload.highCount : 0;
        const reportUrl = shareToken
          ? `https://weavn.app/reports/${shareToken}`
          : 'https://weavn.app/dashboard';

        // Email-safe font stacks — clients can't reliably load web fonts, so IBM Plex leads a fallback chain.
        const MONO = "'IBM Plex Mono','SFMono-Regular',Consolas,'Courier New',monospace";
        const SANS = "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
        const escHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Top-finding teaser — read the rubric payload's REAL findings, same precedence as
        // ReportLayout (moneyLeaks → api_findings → leaks). Render only if one exists; never fabricate.
        type TeaserFinding = { title?: string; revenueTitle?: string; severity?: string };
        const firstFinding = (...arrs: Array<TeaserFinding[] | undefined>): TeaserFinding | undefined => {
          for (const a of arrs) if (a && a.length > 0) return a[0];
          return undefined;
        };
        const topFinding = firstFinding(
          payload.moneyLeaks as TeaserFinding[] | undefined,
          (payload as { api_findings?: TeaserFinding[] }).api_findings,
          payload.leaks as TeaserFinding[] | undefined,
        );
        const tfTitle = topFinding ? escHtml(String(topFinding.revenueTitle || topFinding.title || '').trim()) : '';
        const tfSev = topFinding ? String(topFinding.severity ?? '').toLowerCase() : '';
        const tfColor = tfSev === 'critical' ? '#E8635F' : (tfSev === 'high' || tfSev === 'warning') ? '#EFB23E' : '#6F9BC6';
        const tfSuffix = tfSev === 'critical' ? ' · CRITICAL' : (tfSev === 'high' || tfSev === 'warning') ? ' · HIGH' : '';

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Weavn <reports@weavn.app>',
          to: userEmail,
          subject: `Your Weavn diagnostic is ready — ${domain}`,
          html: `
<div style="background:#050810;padding:32px 0;margin:0;font-family:${SANS};">
<div style="max-width:600px;margin:0 auto;background:#050810;">

  <!-- Header -->
  <div style="padding:32px 40px 24px;border-bottom:1px solid rgba(157,140,255,0.15);">
    <span style="display:inline-block;width:16px;height:16px;border:2px solid #9D8CFF;vertical-align:middle;"></span>
    <span style="color:#9D8CFF;font-size:13px;letter-spacing:0.18em;font-weight:600;font-family:${MONO};vertical-align:middle;margin-left:10px;">Weavn</span>
  </div>

  <!-- Body -->
  <div style="padding:40px;">

    <p style="color:#6E7587;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 20px;font-family:${MONO};">DIAGNOSTIC REPORT · COMPLETE</p>

    <h1 style="color:#E6E9EE;font-size:22px;font-weight:600;margin:0 0 8px;line-height:1.3;font-family:${SANS};">Your diagnostic report<br>is ready.</h1>

    <!-- Domain + Score block -->
    <div style="margin:24px 0;padding:20px;background:#0A0E18;border:1px solid rgba(157,140,255,0.18);border-left:3px solid #9D8CFF;border-radius:0 4px 4px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;">
            <p style="color:#6E7587;font-size:10px;letter-spacing:0.15em;margin:0 0 6px;font-family:${MONO};">DOMAIN SCANNED</p>
            <p style="color:#E6E9EE;font-size:14px;margin:0;font-family:${MONO};">${domain}</p>
          </td>
          <td style="vertical-align:top;text-align:right;">
            <p style="color:#6E7587;font-size:10px;letter-spacing:0.15em;margin:0 0 4px;font-family:${MONO};">BEST-PRACTICE COVERAGE</p>
            <p style="color:${scoreColor(payload.healthScore ?? 0)};font-size:32px;font-weight:700;margin:0;line-height:1;font-family:${SANS};">${payload.healthScore ?? 0}<span style="font-size:14px;color:#6E7587;">% ±${COVERAGE_TOLERANCE} captured</span></p>
            <p style="color:${scoreColor(payload.healthScore ?? 0)};font-size:9px;letter-spacing:0.15em;margin:4px 0 0;font-family:${MONO};">${opportunityFraming(payload.healthScore ?? 0).label.toUpperCase()}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Stats grid -->
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td style="width:33%;padding-right:8px;vertical-align:top;">
          <div style="padding:14px;background:#0A0E18;border:1px solid rgba(232,99,95,0.3);border-radius:4px;text-align:center;">
            <p style="color:#E8635F;font-size:22px;font-weight:700;margin:0;font-family:${SANS};">${criticalCount}</p>
            <p style="color:#6E7587;font-size:9px;letter-spacing:0.12em;margin:4px 0 0;font-family:${MONO};">CRITICAL</p>
          </div>
        </td>
        <td style="width:33%;padding:0 4px;vertical-align:top;">
          <div style="padding:14px;background:#0A0E18;border:1px solid rgba(239,178,62,0.3);border-radius:4px;text-align:center;">
            <p style="color:#EFB23E;font-size:22px;font-weight:700;margin:0;font-family:${SANS};">${highCount}</p>
            <p style="color:#6E7587;font-size:9px;letter-spacing:0.12em;margin:4px 0 0;font-family:${MONO};">HIGH</p>
          </div>
        </td>
        <td style="width:33%;padding-left:8px;vertical-align:top;">
          <div style="padding:14px;background:#0A0E18;border:1px solid rgba(111,155,198,0.28);border-radius:4px;text-align:center;">
            <p style="color:#6F9BC6;font-size:22px;font-weight:700;margin:0;font-family:${SANS};">${DIAGNOSTIC_CHECKS.length}</p>
            <p style="color:#6E7587;font-size:9px;letter-spacing:0.12em;margin:4px 0 0;font-family:${MONO};">CHECKS RUN</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top finding teaser — real rubric finding (moneyLeaks → api_findings → leaks); omitted if none -->
    ${tfTitle ? `
    <div style="margin:0 0 24px;padding:16px;background:#0A0E18;border:1px solid ${tfColor}33;border-left:3px solid ${tfColor};border-radius:0 4px 4px 0;">
      <p style="color:#6E7587;font-size:9px;letter-spacing:0.15em;margin:0 0 8px;font-family:${MONO};">TOP FINDING${tfSuffix}</p>
      <p style="color:#E6E9EE;font-size:13px;margin:0;line-height:1.6;font-family:${SANS};">${tfTitle}</p>
    </div>
    ` : ''}

    <p style="color:#9398A8;font-size:12px;line-height:1.8;margin:0 0 28px;font-family:${SANS};">Weavn ran ${DIAGNOSTIC_CHECKS.length} diagnostic checks across 27 categories on <strong style="color:#E6E9EE;">${domain}</strong>. Full findings ranked by revenue impact, exact resolutions, and your growth blueprint are ready to view.</p>

    <!-- CTA -->
    <a href="${reportUrl}" style="display:inline-block;border:1px solid #9D8CFF;color:#9D8CFF;font-family:${MONO};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;padding:14px 32px;text-decoration:none;">VIEW YOUR REPORT →</a>

  </div>

  <!-- Footer -->
  <div style="padding:20px 40px;border-top:1px solid rgba(157,140,255,0.12);">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="color:#6E7587;font-size:10px;letter-spacing:0.1em;font-family:${MONO};">Weavn · Conversion Intelligence</td>
        <td style="text-align:right;color:#6E7587;font-size:10px;font-family:${MONO};">reports@weavn.app</td>
      </tr>
    </table>
  </div>

</div>
</div>
`,
        });
        console.log(`[ROUTE] email sent | domain=${domain} to=${userEmail}`);
      }
    } catch (emailErr) {
      console.log(`[ROUTE] email failed | error=${emailErr instanceof Error ? emailErr.message : String(emailErr)}`);
    }
  }

  console.log(`[scan] COMPLETE | domain=${domain} reportId=${reportId} total_elapsed=${Date.now() - scanStart}ms`)

  // Fire-and-forget: pre-generate AI advisor briefs for all findings in the background.
  // The response goes out immediately; briefs are written to reports.extended_analysis as they complete.
  const pageSummaryForBriefs = buildPageSummary(extraction);
  // payload.scanCostUsd = real model cost of the primary analysis call (lib/analyze.ts).
  // The briefs task adds its own call cost and persists the total to reports.scan_cost_usd.
  const primaryScanCostUsd = typeof payload.scanCostUsd === "number" ? payload.scanCostUsd : 0;
  process.stderr.write(`[ROUTE] SCAN COST | domain=${domain} primary_usd=$${primaryScanCostUsd.toFixed(4)} (briefs cost added async, infra excluded)\n`);
  void generateAndPersistAllFindingBriefs(reportId, domain, payload, pageSummaryForBriefs, primaryScanCostUsd).catch((err) => {
    console.log("[scan] background brief generation failed:", err instanceof Error ? (err.stack ?? err.message) : err);
  });

  return withCookies(
    NextResponse.json({ domain, reportId, shareToken, payload })
  );
}
