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
import { saveReport } from "@/lib/supabase";
import { generateAndPersistAllFindingBriefs } from "@/lib/findingExtendedAnalysis";
import { Resend } from "resend";
import { FREE_DASHBOARD_SCANS_PER_MONTH } from "@/lib/constants";


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

  // ── Free dashboard monthly quota — checked before any scan cost ──────────────
  // Only applies to non-internal, logged-in free-plan users.
  if (!internalBypass && userId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const quotaClient = createClient(supabaseUrl, serviceKey);

        // Fetch the user's plan. profiles PK is user_id, not id.
        const { data: profileData } = await quotaClient
          .from("profiles")
          .select("plan")
          .eq("user_id", userId)
          .maybeSingle();
        const userPlanNow = (profileData as { plan?: string } | null)?.plan ?? "free";

        if (userPlanNow === "free") {
          const now = new Date();
          const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

          // Count completed (non-error) scans this calendar month for this user.
          // Dashboard route never serves cache hits — every completed report is a billed scan.
          // Excludes pending/failed/error rows so in-flight or failed attempts don't consume quota.
          const { count } = await quotaClient
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", monthStart)
            .neq("status", "pending")
            .neq("status", "failed")
            .neq("status", "error");

          const monthlyUsed = count ?? 0;
          if (monthlyUsed >= FREE_DASHBOARD_SCANS_PER_MONTH) {
            const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
            return withCookies(
              NextResponse.json(
                {
                  error: "Monthly scan limit reached",
                  reason: "free_monthly_exhausted",
                  limit: FREE_DASHBOARD_SCANS_PER_MONTH,
                  used: monthlyUsed,
                  resets_at: resetsAt,
                },
                { status: 429 }
              )
            );
          }
        }
      } catch (quotaErr) {
        // Quota check failure must not block the scan — log and continue
        console.warn("[scan] monthly quota check failed (non-fatal):", quotaErr instanceof Error ? quotaErr.message : quotaErr);
      }
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

  // Fetch user plan for model selection (agency uses higher-capacity model)
  let userPlan = "free";
  if (!internalBypass) {
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

  // 2.5. Pro plan: scrape 2 subpages in parallel for deeper multi-page analysis
  const complexity = extraction.complexity ?? 'medium'
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
  const analyzeStart = Date.now()
  process.stderr.write(`[ROUTE] runAnalysis START | domain=${domain} site_type=${site_type} plan=${userPlan} pagesAnalyzed=${extraction.pagesAnalyzed.length} analyzeTimeoutMs=${analyzeTimeoutMs} elapsed_since_scan_start=${Date.now() - scanStart}ms\n`)
  console.log(`[scan] ANALYZE START | domain=${domain} site_type=${site_type} userPlan=${userPlan} pages=${extraction.pagesAnalyzed.length}`)
  try {
    payload = await Promise.race([runAnalysis(extraction, site_type, userPlan, undefined), analyzeDeadline]);
    process.stderr.write(`[ROUTE] runAnalysis DONE | elapsed=${Date.now() - analyzeStart}ms\n`)
    console.log(`[scan] ANALYZE DONE | domain=${domain} elapsed=${Date.now() - analyzeStart}ms`)
    // Analysis succeeded — cancel the global deadline so saveReport can't be interrupted.
    clearTimeout(deadlineTimerId!);
  } catch (err) {
    process.stderr.write(`[ROUTE] runAnalysis ERROR | elapsed=${Date.now() - analyzeStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
    console.error(`[scan] ANALYZE ERROR | domain=${domain} elapsed=${Date.now() - analyzeStart}ms | ${err instanceof Error ? (err.stack ?? err.message) : err}`)
    const message = err instanceof Error ? err.message : "Analysis failed.";
    await markFailed();
    return withCookies(NextResponse.json({ error: message }, { status: 500 }));
  }

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
        const reportUrl = shareToken
          ? `https://weavn.app/reports/${shareToken}`
          : 'https://weavn.app/dashboard';
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'devon@weavn.app',
          to: userEmail,
          subject: `Your Weavn diagnostic is ready — ${domain}`,
          html: `
<div style="background:#080C14;padding:32px 0;margin:0;font-family:'Space Mono','Courier New',monospace;">
<div style="max-width:600px;margin:0 auto;background:#080C14;">

  <!-- Header -->
  <div style="padding:32px 40px 24px;border-bottom:1px solid rgba(0,200,255,0.15);">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:18px;height:18px;border:2px solid #00C8FF;position:relative;flex-shrink:0;"></div>
      <span style="color:#00C8FF;font-size:13px;letter-spacing:0.18em;font-weight:600;">Weavn</span>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:40px;">

    <p style="color:rgba(136,153,170,0.7);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 20px;">DIAGNOSTIC REPORT · COMPLETE</p>

    <h1 style="color:#F0F4FF;font-size:22px;font-weight:600;margin:0 0 8px;line-height:1.3;font-family:'Space Mono','Courier New',monospace;">Your diagnostic report<br>is ready.</h1>

    <!-- Domain + Score block -->
    <div style="margin:24px 0;padding:20px;border:1px solid rgba(0,200,255,0.15);border-left:3px solid #00C8FF;border-radius:0 4px 4px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;">
            <p style="color:rgba(136,153,170,0.6);font-size:10px;letter-spacing:0.15em;margin:0 0 6px;">DOMAIN SCANNED</p>
            <p style="color:#F0F4FF;font-size:14px;margin:0;">${domain}</p>
          </td>
          <td style="vertical-align:top;text-align:right;">
            <p style="color:rgba(136,153,170,0.6);font-size:10px;letter-spacing:0.15em;margin:0 0 4px;">WEAVN SCORE</p>
            <p style="color:#FF2D2D;font-size:32px;font-weight:700;margin:0;line-height:1;">${payload.healthScore ?? 0}<span style="font-size:14px;color:rgba(136,153,170,0.5);">/100</span></p>
            <p style="color:#FF2D2D;font-size:9px;letter-spacing:0.15em;margin:4px 0 0;">${(payload.healthScore ?? 0) >= 70 ? 'NEEDS WORK' : (payload.healthScore ?? 0) >= 50 ? 'AT RISK' : 'CRITICAL RISK'}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Stats grid -->
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td style="width:33%;padding-right:8px;">
          <div style="padding:14px;border:1px solid rgba(255,45,45,0.3);border-radius:4px;text-align:center;">
            <p style="color:#FF2D2D;font-size:22px;font-weight:700;margin:0;">${criticalCount}</p>
            <p style="color:rgba(136,153,170,0.5);font-size:9px;letter-spacing:0.12em;margin:4px 0 0;">CRITICAL</p>
          </div>
        </td>
        <td style="width:33%;padding:0 4px;">
          <div style="padding:14px;border:1px solid rgba(255,140,0,0.3);border-radius:4px;text-align:center;">
            <p style="color:#FF8C00;font-size:22px;font-weight:700;margin:0;">${typeof payload.highCount === 'number' ? payload.highCount : 0}</p>
            <p style="color:rgba(136,153,170,0.5);font-size:9px;letter-spacing:0.12em;margin:4px 0 0;">HIGH</p>
          </div>
        </td>
        <td style="width:33%;padding-left:8px;">
          <div style="padding:14px;border:1px solid rgba(0,200,255,0.2);border-radius:4px;text-align:center;">
            <p style="color:#00C8FF;font-size:22px;font-weight:700;margin:0;">264</p>
            <p style="color:rgba(136,153,170,0.5);font-size:9px;letter-spacing:0.12em;margin:4px 0 0;">CHECKS RUN</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Top finding teaser -->
    ${payload.primaryFindings?.[0] ? `
    <div style="margin:0 0 24px;padding:16px;border:1px solid rgba(255,45,45,0.2);border-left:3px solid #FF2D2D;border-radius:0 4px 4px 0;">
      <p style="color:rgba(136,153,170,0.5);font-size:9px;letter-spacing:0.15em;margin:0 0 8px;">TOP FINDING · CRITICAL</p>
      <p style="color:#F0F4FF;font-size:13px;margin:0;line-height:1.6;">${payload.primaryFindings[0].title ?? ''}</p>
    </div>
    ` : ''}

    <p style="color:rgba(136,153,170,0.55);font-size:12px;line-height:1.8;margin:0 0 28px;">Weavn ran 264 diagnostic checks across 27 categories on <strong style="color:#F0F4FF;">${domain}</strong>. Full findings ranked by revenue impact, exact resolutions, and your growth blueprint are ready to view.</p>

    <!-- CTA -->
    <a href="${reportUrl}" style="display:inline-block;border:1px solid #00C8FF;color:#00C8FF;font-family:'Space Mono','Courier New',monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;padding:14px 32px;text-decoration:none;">VIEW YOUR REPORT →</a>

  </div>

  <!-- Footer -->
  <div style="padding:20px 40px;border-top:1px solid rgba(0,200,255,0.1);">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="color:rgba(136,153,170,0.35);font-size:10px;letter-spacing:0.1em;">Weavn · Conversion Intelligence</td>
        <td style="text-align:right;color:rgba(136,153,170,0.35);font-size:10px;">devon@weavn.app</td>
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
  void generateAndPersistAllFindingBriefs(reportId, domain, payload, pageSummaryForBriefs).catch((err) => {
    console.log("[scan] background brief generation failed:", err instanceof Error ? (err.stack ?? err.message) : err);
  });

  return withCookies(
    NextResponse.json({ domain, reportId, shareToken, payload })
  );
}
