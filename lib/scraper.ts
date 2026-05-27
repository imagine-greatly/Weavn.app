
// -- URL NORMALIZATION --------------------------------------------------
export function normalizeToHomepage(input: string): string {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}/`
  } catch {
    return input
  }
}

// Normalizes protocol/host but preserves the path (used for entry URL handling).
function normalizeUrlPreservingPath(input: string): string {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`
  } catch {
    return input
  }
}

// -- INVALID HEADLINE DETECTION -----------------------------------------
export function isInvalidHeadline(text: string): boolean {
  if (!text || text.length < 4) return true
  if (text.includes('![') || text.includes('](http')) return true
  if (text.startsWith('[![') || text.startsWith('[!')) return true
  if (/^\[.+\]\(.+\)$/.test(text)) return true
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico)/i.test(text)) return true
  if (text.includes('cdn/shop') || text.includes('http')) return true
  const badPatterns = [
    /^your cart/i, /^collection:/i, /^\d+\s*products?/i,
    /^filter/i, /^sort by/i, /^estimated total/i,
    /^country\/region/i, /^have an account/i,
    /^sign in/i, /^log in/i, /^search$/i,
    /^404/i, /^page not found/i, /^item added/i,
    /^skip to/i, /^continue shopping/i,
    /^united states/i, /^usd/i,
    /^(home|menu|navigation)$/i,
  ]
  if (badPatterns.some(p => p.test(text.trim()))) return true
  const t = text.toLowerCase()
  const navLikePhrases = [
    'your cart is empty', 'have an account', 'log in',
    'continue shopping', 'total items in cart',
  ]
  if (navLikePhrases.some(p => t.includes(p))) return true
  return false
}

// -- MARKDOWN CLEANUP ---------------------------------------------------
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*_(.+?)_\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s*/, '')
    .trim()
}

// -- HELPERS ------------------------------------------------------------

// Strip inline scripts/styles before counting, so a page that is 95% JS
// doesn't look like it has readable text when it actually renders empty.
function readableTextLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

// Returns true when the page is a bot challenge, access-denied wall, or
// login gate rather than real site content. Prevents returning junk HTML
// to Claude and ensures we always try attempt 2 for blocked pages.
function isBlockPage(html: string): boolean {
  const t = html.toLowerCase()

  // Cloudflare JS challenge and Turnstile
  if (
    t.includes('cf-browser-verification') ||
    t.includes('_cf_chl_') ||
    t.includes('cf_chl_opt') ||
    t.includes('cf-challenge-error') ||
    t.includes('cf-challenge-running') ||
    (t.includes('just a moment') && t.includes('cloudflare')) ||
    t.includes('checking your browser before accessing') ||
    t.includes('enable javascript and cookies to continue')
  ) return true

  // DDoS-Guard
  if (t.includes('ddos-guard')) return true

  // PerimeterX — always a challenge page regardless of content length
  if (t.includes('px-captcha') || t.includes('_pxhd') || t.includes('perimeterx')) return true

  // Kasada bot-protection — always a challenge page
  if (t.includes('kasada')) return true

  // Imperva / Incapsula
  if (t.includes('incapsula') && t.includes('incident')) return true

  // DataDome — challenge/block page (not a content mention)
  if (t.includes('datadome') && (t.includes('blocked') || t.includes('captcha') || readableTextLength(html) < 900)) return true

  // Thin access-denied / human-verification pages (< 900 chars readable)
  if (readableTextLength(html) < 900) {
    if (
      t.includes('access denied') ||
      t.includes('403 forbidden') ||
      t.includes('please verify you are human') ||
      t.includes('verify you are human') ||
      t.includes('are you a robot') ||
      t.includes('enable javascript and cookies') ||
      t.includes('your connection was interrupted') ||
      t.includes('attention required') ||
      t.includes('login to continue') ||
      t.includes('sign in to continue') ||
      t.includes('log in to access') ||
      t.includes('hcaptcha') ||
      t.includes('recaptcha') ||
      t.includes('you have been blocked')
    ) return true
  }

  return false
}

// -- BROWSERLESS /unblock ------------------------------------------------
//
// Attempt 1 (fast):   residential proxy, domcontentloaded + 5 s settle     ≈ 25 s max
// Attempt 2 (deep):   residential proxy, networkidle2 + 3 s settle         ≈ 25 s max
// Attempt 3 (no-proxy fallback): bare bestAttempt                          ≈ 15 s max
// Total worst case:   65 s — leaves ≥ 20 s for Claude + Supabase under 85 s budget
//
// ignoreHTTPSErrors is a CDPLaunchOption — it goes in the `launch` query
// param as URL-encoded JSON, NOT in the request body. Putting it in the body
// causes Browserless to return HTTP 400.
//
async function fetchWithBrowserless(url: string): Promise<{ html: string; complexity: SiteComplexity; readableRatio: number }> {
  try {
  process.stderr.write(`[SCRAPER] function entered, url: ${url}\n`)

  const apiKey = (process.env.BROWSERLESS_API_KEY ?? '').trim()
  process.stderr.write(`[SCRAPER] token present: ${!!apiKey} prefix: ${apiKey.slice(0, 6) || '(empty)'}\n`)

  if (!apiKey) {
    console.error('[SCRAPER] FATAL: BROWSERLESS_API_KEY env var is not set')
    throw new Error('Browserless API key not configured — set BROWSERLESS_API_KEY')
  }

  // ignoreHTTPSErrors is a CDPLaunchOption, passed as ?launch=<json> query param
  const launchParam = encodeURIComponent(JSON.stringify({ ignoreHTTPSErrors: true }))
  const makeEndpoint = (proxy: boolean) =>
    `https://production-sfo.browserless.io/unblock` +
    `?token=${apiKey}` +
    `&launch=${launchParam}` +
    (proxy ? `&proxy=residential` : '')

  // Parse HTML out of a Browserless /unblock response body (text already read).
  // Checks content / html / data in case the field name varies by API version.
  const extractHtml = (text: string): string | null => {
    try {
      const json = JSON.parse(text) as Record<string, unknown>
      const topLevelKeys = Object.keys(json)
      console.log(`[SCRAPER] response keys: [${topLevelKeys.join(',')}]`)
      const html =
        (typeof json.content === 'string' ? json.content : null) ??
        (typeof json.html === 'string' ? json.html : null) ??
        (typeof json.data === 'string' ? json.data : null)
      return html && html.length > 0 ? html : null
    } catch (err) {
      console.error('[SCRAPER] JSON parse FAILED:', err instanceof Error ? err.message : err)
      return null
    }
  }

  // Attempt 1 — fast path: domcontentloaded + 5 s settle, residential proxy
  const body1 = {
    url,
    bestAttempt: true,
    gotoOptions: { waitUntil: 'domcontentloaded', timeout: 15000 },
    waitForTimeout: 1500,
  }
  process.stderr.write(`[SCRAPER] attempt1 START | url=${url}\n`)
  process.stderr.write(`[SCRAPER] attempt1 request | body=${JSON.stringify(body1)}\n`)

  const ctrl1 = new AbortController()
  const t1 = setTimeout(() => ctrl1.abort(), 18_000)
  let html1: string | null = null
  let rawText1Size = 0
  const a1Start = Date.now()
  process.stderr.write('[SCRAPER] url-built: ' + url + '\n')

  try {
    process.stderr.write('[SCRAPER] pre-attempt1\n')
    process.stderr.write('[SCRAPER] attempt1 sending request\n')
    const res1 = await fetch(makeEndpoint(false), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body1),
      signal: ctrl1.signal,
    })
    const a1FetchMs = Date.now() - a1Start
    // Read body ONCE — res.clone() + res.json() can race on some runtimes
    const rawText1 = await res1.text()
    rawText1Size = rawText1.length
    process.stderr.write('[SCRAPER] attempt1 response: ' + res1.status + ' chars: ' + rawText1.length + '\n')
    process.stderr.write('[SCRAPER] attempt1 body: ' + rawText1.slice(0, 300) + '\n')
    console.log(`[SCRAPER] attempt1 response | status=${res1.status} ${res1.statusText} | fetch_elapsed=${a1FetchMs}ms`)
    console.log(`[SCRAPER] attempt1 raw body | length=${rawText1.length} | first500: ${rawText1.slice(0, 500)}`)

    if (res1.ok) {
      html1 = extractHtml(rawText1)
      const len = readableTextLength(html1 ?? '')
      const blocked = html1 !== null && isBlockPage(html1)
      console.log(`[SCRAPER] attempt1 parsed | html_chars=${html1?.length ?? 0} readable=${len} blocked=${blocked} | total_elapsed=${Date.now() - a1Start}ms`)
      const _h1a1 = html1?.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      const _first_h1_a1 = _h1a1 ? _h1a1[1].replace(/<[^>]+>/g, '').trim().slice(0, 80) : 'none'
      console.log(`[SCRAPER] attempt1 first_h1="${_first_h1_a1}"`)
    } else {
      if (res1.status === 500) {
        console.log(`[SCRAPER] attempt1 500 retry | waiting 3s`)
        await new Promise(resolve => setTimeout(resolve, 3000))
        const res1r = await fetch(makeEndpoint(false), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body1),
          signal: ctrl1.signal,
        })
        const rawText1r = await res1r.text()
        rawText1Size = rawText1r.length
        console.log(`[SCRAPER] attempt1 retry response | status=${res1r.status} chars=${rawText1r.length}`)
        if (res1r.ok) {
          html1 = extractHtml(rawText1r)
          const len = readableTextLength(html1 ?? '')
          const blocked = html1 !== null && isBlockPage(html1)
          console.log(`[SCRAPER] attempt1 retry parsed | html_chars=${html1?.length ?? 0} readable=${len} blocked=${blocked}`)
        } else {
          const errBody = typeof rawText1r === 'string' ? rawText1r : JSON.stringify(rawText1r)
          console.log(`[SCRAPER] Browserless error body: ${errBody.slice(0, 500)}`)
          console.log(`[SCRAPER] attempt1 FAILED after retry | HTTP ${res1r.status}`)
        }
      } else {
        const errBody = typeof rawText1 === 'string' ? rawText1 : JSON.stringify(rawText1)
        console.log(`[SCRAPER] Browserless error body: ${errBody.slice(0, 500)}`)
        console.log(`[SCRAPER] attempt1 FAILED | HTTP ${res1.status} | elapsed=${a1FetchMs}ms`)
      }
    }
  } catch (err) {
    const a1Elapsed = Date.now() - a1Start
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.log(`[SCRAPER] attempt1 ERROR | ${isAbort ? 'ABORTED by 20s timeout' : 'threw exception'} | elapsed=${a1Elapsed}ms`)
    console.log('[SCRAPER] attempt1 exception:', err instanceof Error ? (err.stack ?? err.message) : err)
  } finally {
    clearTimeout(t1)
  }

  // Compute complexity from attempt1 result — drives adaptive timeouts downstream.
  let readableRatio = html1 && html1.length > 0 ? readableTextLength(html1) / html1.length : 0
  let complexity: SiteComplexity = readableRatio > 0.4 ? 'simple' : readableRatio >= 0.15 ? 'medium' : 'complex'

  if (html1?.includes('data-wf-site=') || html1?.includes('data-wf-page=')) {
    complexity = 'simple'
    console.log('[SCRAPER] Webflow detected — complexity forced to simple')
  }

  // Accept attempt 1 only if it has real content AND is not a bot-block page.
  const len1Early = readableTextLength(html1 ?? '')
  if (html1 && len1Early >= 1500 && !isBlockPage(html1)) {
    console.log(`[SCRAPER] attempt1 ACCEPTED | readable=${len1Early} | total_elapsed=${Date.now() - a1Start}ms`)
    return { html: html1, complexity, readableRatio }
  }

  if (html1 && isBlockPage(html1)) {
    console.log(`[SCRAPER] attempt1 returned a block/challenge page — escalating to attempt2`)
  }

  // Attempt 2 — deep path: networkidle2 + 3 s settle, residential proxy
  const subWait = rawText1Size < 80_000 ? 1500 : rawText1Size <= 200_000 ? 2500 : 4000
  console.log(`[SCRAPER] attempt1 adaptive wait | size=${rawText1Size}chars → waitMs=${subWait}ms`)
  const body2 = {
    url,
    bestAttempt: true,
    gotoOptions: { waitUntil: 'networkidle2', timeout: 18000 },
    waitForTimeout: subWait,
  }
  process.stderr.write(`[SCRAPER] attempt1 insufficient (${len1Early} chars), trying attempt2 for ${url}\n`)
  process.stderr.write(`[SCRAPER] attempt2 START | url=${url}\n`)
  process.stderr.write(`[SCRAPER] attempt2 request | body=${JSON.stringify(body2)}\n`)

  const ctrl2 = new AbortController()
  const t2 = setTimeout(() => ctrl2.abort(), 20_000)
  let html2: string | null = null
  const a2Start = Date.now()

  try {
    process.stderr.write('[SCRAPER] attempt2 sending request\n')
    const res2 = await fetch(makeEndpoint(true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body2),
      signal: ctrl2.signal,
    })
    const a2FetchMs = Date.now() - a2Start
    const rawText2 = await res2.text()
    process.stderr.write('[SCRAPER] attempt2 response: ' + res2.status + ' chars: ' + rawText2.length + '\n')
    process.stderr.write('[SCRAPER] attempt2 body: ' + rawText2.slice(0, 300) + '\n')
    console.log(`[SCRAPER] attempt2 response | status=${res2.status} ${res2.statusText} | fetch_elapsed=${a2FetchMs}ms`)
    console.log(`[SCRAPER] attempt2 raw body | length=${rawText2.length} | first500: ${rawText2.slice(0, 500)}`)

    if (res2.ok) {
      html2 = extractHtml(rawText2)
      const len = readableTextLength(html2 ?? '')
      const blocked = html2 !== null && isBlockPage(html2)
      console.log(`[SCRAPER] attempt2 parsed | html_chars=${html2?.length ?? 0} readable=${len} blocked=${blocked} | total_elapsed=${Date.now() - a2Start}ms`)
      const _h1a2 = html2?.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      const _first_h1_a2 = _h1a2 ? _h1a2[1].replace(/<[^>]+>/g, '').trim().slice(0, 80) : 'none'
      console.log(`[SCRAPER] attempt2 first_h1="${_first_h1_a2}"`)
    } else {
      if (res2.status === 500) {
        console.log(`[SCRAPER] attempt2 500 retry | waiting 3s`)
        await new Promise(resolve => setTimeout(resolve, 3000))
        const res2r = await fetch(makeEndpoint(true), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body2),
          signal: ctrl2.signal,
        })
        const rawText2r = await res2r.text()
        console.log(`[SCRAPER] attempt2 retry response | status=${res2r.status} chars=${rawText2r.length}`)
        if (res2r.ok) {
          html2 = extractHtml(rawText2r)
          const len = readableTextLength(html2 ?? '')
          const blocked = html2 !== null && isBlockPage(html2)
          console.log(`[SCRAPER] attempt2 retry parsed | html_chars=${html2?.length ?? 0} readable=${len} blocked=${blocked}`)
        } else {
          const errBody = typeof rawText2r === 'string' ? rawText2r : JSON.stringify(rawText2r)
          console.log(`[SCRAPER] Browserless error body: ${errBody.slice(0, 500)}`)
          console.log(`[SCRAPER] attempt2 FAILED after retry | HTTP ${res2r.status}`)
        }
      } else {
        const errBody = typeof rawText2 === 'string' ? rawText2 : JSON.stringify(rawText2)
        console.log(`[SCRAPER] Browserless error body: ${errBody.slice(0, 500)}`)
        console.log(`[SCRAPER] attempt2 FAILED | HTTP ${res2.status} | elapsed=${a2FetchMs}ms`)
      }
    }
  } catch (err) {
    const a2Elapsed = Date.now() - a2Start
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.log(`[SCRAPER] attempt2 ERROR | ${isAbort ? 'ABORTED by 22s timeout' : 'threw exception'} | elapsed=${a2Elapsed}ms`)
    console.log('[SCRAPER] attempt2 exception:', err instanceof Error ? (err.stack ?? err.message) : err)
  } finally {
    clearTimeout(t2)
  }

  const len1 = readableTextLength(html1 ?? '')
  const len2 = readableTextLength(html2 ?? '')
  const blocked1 = html1 !== null && isBlockPage(html1)
  const blocked2 = html2 !== null && isBlockPage(html2)
  console.log(
    `[SCRAPER] final proxy attempts: attempt1=${len1}(blocked=${blocked1}) attempt2=${len2}(blocked=${blocked2}) url=${url}`
  )

  // If both proxy attempts returned zero content (both 4xx/5xx or network error),
  // try once more without proxy — some Browserless plans don't include residential,
  // and some sites actively block residential IPs.
  if (!html1 && !html2) {
    process.stderr.write(`[SCRAPER] attempt3 START (no proxy) | url=${url}\n`)
    const ctrl3 = new AbortController()
    const t3 = setTimeout(() => ctrl3.abort(), 15000)
    const a3Start = Date.now()

    try {
      process.stderr.write('[SCRAPER] attempt3 sending request\n')
      const res3 = await fetch(makeEndpoint(false), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, bestAttempt: true }),
        signal: ctrl3.signal,
      })
      const rawText3 = await res3.text()
      process.stderr.write('[SCRAPER] attempt3 response: ' + res3.status + ' chars: ' + rawText3.length + '\n')
      console.log(`[SCRAPER] attempt3 response | status=${res3.status} | elapsed=${Date.now() - a3Start}ms`)
      console.log(`[SCRAPER] attempt3 raw body first500: ${rawText3.slice(0, 500)}`)

      if (res3.ok) {
        const html3 = extractHtml(rawText3)
        const len3 = readableTextLength(html3 ?? '')
        console.log(`[SCRAPER] attempt3 parsed | html_chars=${html3?.length ?? 0} readable=${len3}`)
        if (html3 && len3 >= 200) {
          console.log('[SCRAPER] attempt3 ACCEPTED')
          return { html: html3, complexity, readableRatio }
        }
      } else {
        console.log(`[SCRAPER] attempt3 FAILED | HTTP ${res3.status}`)
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      console.log(`[SCRAPER] attempt3 ERROR | ${isAbort ? 'ABORTED by 15s timeout' : 'threw exception'}`)
      console.log('[SCRAPER] attempt3 exception:', err instanceof Error ? err.message : err)
    } finally {
      clearTimeout(t3)
    }
  }

  // Prefer non-blocked content regardless of which attempt it came from.
  // Only fall back to a block page if both attempts returned one.
  const best: string | null =
    (!blocked2 && html2 && len2 > 0) && (!blocked1 || len2 >= len1) ? html2 :
    (!blocked1 && html1 && len1 > 0) ? html1 :
    (len2 > len1 ? html2 : html1)  // both blocked — take the longer one as last resort

  if (best && best !== html1 && best.length > 0) {
    const newRatio = readableTextLength(best) / best.length
    const newComplexity: SiteComplexity = newRatio > 0.4 ? 'simple' : newRatio >= 0.15 ? 'medium' : 'complex'
    if (newComplexity !== complexity) {
      process.stderr.write(`[SCRAPER] complexity re-evaluated | was=${complexity} now=${newComplexity}\n`)
      complexity = newComplexity
      readableRatio = newRatio
    }
  }
  if (best && readableTextLength(best) >= 200) return { html: best, complexity, readableRatio }

  const bothBlocked = blocked1 && blocked2
  const noResponseAtAll = !html1 && !html2

  if (bothBlocked) {
    throw new Error(
      `This site's bot protection blocked the scanner (attempt1=${len1}, attempt2=${len2}). ` +
      `Retrying in a few minutes usually works.`
    )
  }
  if (noResponseAtAll) {
    throw new Error(
      `Scraper service did not return any content for ${url}. ` +
      `The Browserless request may have failed — check server logs for HTTP status.`
    )
  }
  throw new Error(
    `Could not retrieve usable content from ${url} ` +
    `(attempt1=${len1} chars, attempt2=${len2} chars). ` +
    `The site may have returned an error page or requires authentication.`
  )
  } catch (e) {
    process.stderr.write('[SCRAPER] FATAL fetchWithBrowserless: ' + (e instanceof Error ? e.stack : String(e)) + '\n')
    throw e
  }
}

// -- MAIN SCRAPE FUNCTION -----------------------------------------------
export type SiteComplexity = 'simple' | 'medium' | 'complex'

export interface ScrapeResult {
  rawHtml: string
  method: 'browserless'
  domain: string
  complexity: SiteComplexity
  readableRatio: number
}

export interface CombinedExtraction {
  rawHtml: string
  pagesAnalyzed: string[]
  pagesAttempted?: string[]
  additionalPages?: Array<{ url: string; rawHtml: string }>
  complexity?: SiteComplexity
  readableRatio?: number
}

// -- LINK EXTRACTION & SUBPAGE SELECTION --------------------------------

const NON_HTML_EXT = /\.(css|js|map|png|jpg|jpeg|gif|svg|webp|ico|pdf|woff2?|ttf)(\?|#|$)/i;
const STATIC_PATH_SEGMENT = /\/(src|assets|static|_next|cdn-cgi)(\/|$)/i;

export function extractInternalLinks(html: string, baseUrl: string): string[] {
  try {
    const base = new URL(baseUrl);
    const seen = new Set<string>();
    const links: string[] = [];
    const re = /href=["']([^"']+?)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const href = m[1];
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      try {
        const u = new URL(href, base);
        if (u.origin !== base.origin) continue;
        if (NON_HTML_EXT.test(u.pathname) || STATIC_PATH_SEGMENT.test(u.pathname)) continue;
        const path = u.pathname.replace(/\/$/, '') || '/';
        if (path === '/') continue;
        const key = `${u.origin}${path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        links.push(`${u.origin}${path}`);
      } catch { /* skip */ }
    }
    return links;
  } catch {
    return [];
  }
}

const SUBPAGE_BLOCKLIST = /\/(login|signin|logout|admin|dashboard|account|privacy|terms|policy|cookies|legal)(?:[-\/]|$)/i;

const SUBPAGE_PRIORITY: Record<string, RegExp[]> = {
  saas: [
    /\/pricing/i,
    /\/features/i,
    /\/plans?/i,
    /\/solutions/i,
    /\/platform/i,
    /\/how-it-works/i,
    /\/tour/i,
    /\/demo/i,
    /\/book-demo/i,
    /\/get-started/i,
    /\/(signup|register|trial)/i,
    /\/use-cases/i,
    /\/why-us/i,
    /\/compare/i,
    /\/about/i,
    /\/reviews/i,
    /\/testimonials/i,
    /\/faqs?/i,
    /\/press/i,
    /\/media/i,
    /\/help/i,
    /\/why/i,
  ],
  ecommerce: [
    /\/collections?\//i,
    /\/products?\//i,
    /\/collections\/?$/i,
    /\/products\/?$/i,
    /\/shop/i,
    /\/sale/i,
    /\/new-arrivals/i,
    /\/bestsellers/i,
    /\/all-products/i,
    /\/catalog/i,
    /\/store/i,
    /\/about/i,
    /\/reviews/i,
    /\/testimonials/i,
    /\/faqs?/i,
    /\/press/i,
    /\/media/i,
    /\/help/i,
    /\/why/i,
  ],
  service: [
    /\/services?/i,
    /\/membership/i,
    /\/contact/i,
    /\/booking/i,
    /\/book-a-call/i,
    /\/book/i,
    /\/schedule/i,
    /\/consultation/i,
    /\/free-consultation/i,
    /\/work-with-us/i,
    /\/hire-us/i,
    /\/portfolio/i,
    /\/our-work/i,
    /\/case-studies/i,
    /\/results/i,
    /\/team/i,
    /\/our-team/i,
    /\/process/i,
    /\/approach/i,
    /\/packages/i,
    /\/about/i,
    /\/reviews/i,
    /\/testimonials/i,
    /\/faqs?/i,
    /\/press/i,
    /\/media/i,
    /\/help/i,
    /\/why/i,
  ],
  local: [
    /\/services?/i,
    /\/contact/i,
    /\/menu/i,
    /\/gallery/i,
    /\/photos/i,
    /\/rates/i,
    /\/specials/i,
    /\/reservations/i,
    /\/about/i,
    /\/reviews/i,
    /\/testimonials/i,
    /\/faqs?/i,
    /\/press/i,
    /\/media/i,
    /\/help/i,
    /\/why/i,
  ],
  content: [
    /\/about/i,
    /\/start/i,
    /\/newsletter/i,
    /\/blog\//i,
    /\/reviews/i,
    /\/testimonials/i,
    /\/faqs?/i,
    /\/press/i,
    /\/media/i,
    /\/help/i,
    /\/why/i,
  ],
  general: [
    /\/pricing/i,
    /\/about/i,
    /\/services/i,
    /\/contact/i,
    /\/reviews/i,
    /\/testimonials/i,
    /\/faqs?/i,
    /\/press/i,
    /\/media/i,
    /\/help/i,
    /\/why/i,
  ],
  unknown: [
    /\/pricing/i,
    /\/about/i,
    /\/services/i,
    /\/contact/i,
    /\/reviews/i,
    /\/testimonials/i,
    /\/faqs?/i,
    /\/press/i,
    /\/media/i,
    /\/help/i,
    /\/why/i,
  ],
};

export function selectSubpageUrls(links: string[], siteType: string): string[] {
  const patterns = SUBPAGE_PRIORITY[siteType] ?? SUBPAGE_PRIORITY.general;
  const selected: string[] = [];
  const usedPaths = new Set<string>();

  for (const pattern of patterns) {
    if (selected.length >= 2) break;
    for (const link of links) {
      try {
        const path = new URL(link).pathname;
        if (SUBPAGE_BLOCKLIST.test(path)) continue;
        if (usedPaths.has(path)) continue;
        if (pattern.test(path)) {
          selected.push(link);
          usedPaths.add(path);
          break;
        }
      } catch { /* skip */ }
    }
  }

  // Fallback: take any non-blocklisted nav link
  if (selected.length < 2) {
    for (const link of links) {
      if (selected.length >= 2) break;
      try {
        const path = new URL(link).pathname;
        if (SUBPAGE_BLOCKLIST.test(path)) continue;
        if (usedPaths.has(path)) continue;
        selected.push(link);
        usedPaths.add(path);
      } catch { /* skip */ }
    }
  }

  return selected;
}

// Single fast attempt for subpages — no retry, complexity-adaptive abort timeout
async function fetchSubpageFast(url: string, abortMs: number, complexity?: SiteComplexity): Promise<string | null> {
  const apiKey = (process.env.BROWSERLESS_API_KEY ?? '').trim();
  if (!apiKey) return null;
  const launchParam = encodeURIComponent(JSON.stringify({ ignoreHTTPSErrors: true }));
  const endpoint =
    `https://production-sfo.browserless.io/unblock` +
    `?token=${apiKey}&launch=${launchParam}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), abortMs);
  const subpageWait = complexity === 'simple' ? 1000 : complexity === 'complex' ? 2800 : 1800
  process.stderr.write(`[SCRAPER] subpage adaptive wait | complexity=${complexity ?? 'unknown'} → waitMs=${subpageWait}ms\n`)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        bestAttempt: true,
        gotoOptions: { waitUntil: 'domcontentloaded', timeout: 12_000 },
        waitForTimeout: subpageWait,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    const json = JSON.parse(text) as Record<string, unknown>;
    const html =
      (typeof json.content === 'string' ? json.content : null) ??
      (typeof json.html === 'string' ? json.html : null) ??
      (typeof json.data === 'string' ? json.data : null);
    if (!html || isBlockPage(html)) return null;
    return html;
  } catch (err) {
    process.stderr.write('[SCRAPER] subpage fetch ERROR | ' + err + '\n')
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function scrapeSubpageSafe(url: string, complexity?: SiteComplexity): Promise<{ url: string; rawHtml: string } | null> {
  const abortMs = complexity === 'simple' ? 18_000 : complexity === 'complex' ? 18_000 : 14_000
  process.stderr.write(`[SCRAPER] subpage START | url=${url}\n`);
  try {
    const html = await fetchSubpageFast(url, abortMs, complexity);
    if (!html) {
      process.stderr.write(`[SCRAPER] subpage EMPTY | url=${url}\n`);
      return null;
    }
    const cleaned = cleanHtml(html);
    const cap = complexity === 'simple' ? 25_000 : complexity === 'complex' ? 50_000 : 35_000
    process.stderr.write(`[SCRAPER] subpage cap | complexity=${complexity ?? 'unknown'} → capChars=${cap}\n`)
    const capped =
      cleaned.length > cap
        ? cleaned.slice(0, cap) + SUBPAGE_TRUNCATION_SIGNAL
        : cleaned;
    process.stderr.write(`[SCRAPER] subpage DONE | url=${url} chars=${capped.length}\n`);
    return { url, rawHtml: capped };
  } catch (err) {
    process.stderr.write(`[SCRAPER] subpage ERROR | url=${url} | ${err instanceof Error ? err.message : String(err)}\n`);
    return null;
  }
}

export async function scrapeUrl(inputUrl: string): Promise<ScrapeResult> {
  const url = normalizeUrlPreservingPath(inputUrl)
  process.stderr.write(`[SCRAPER] scrapeUrl entered | input=${inputUrl} normalized=${url}\n`)
  let domain: string
  try {
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch (err) {
    process.stderr.write(`[SCRAPER] scrapeUrl domain parse FAILED | url=${url} err=${err}\n`)
    throw new Error(`Invalid URL after normalization: ${url}`)
  }
  process.stderr.write(`[SCRAPER] scrapeUrl domain=${domain}\n`)

  const { html: rawHtml, complexity, readableRatio } = await fetchWithBrowserless(url)
  console.log(`[SCRAPER] ${domain} | method:browserless | html_len:${rawHtml.length}`)
  return { rawHtml, method: 'browserless', domain, complexity, readableRatio }
}

// -- HTML CLEANING -------------------------------------------------------
// class= attributes are intentionally kept: extractPageData (called from
// buildPageSummary) relies heavily on class-based selectors like
// [class*='hero'], [class*='pricing'], [class*='testimonial'], etc.
// Stripping classes here silently kills all of those selectors and degrades
// the structured summary sent to Claude. Size is controlled by applySmartTruncation.
export function cleanHtml(html: string): string {
  return html
    .replace(/<script(?!\s[^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+data-[a-z][a-z0-9-]*=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+style=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+aria-[a-z-]+=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+on[a-z]+=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/(?:src|href)="data:[^"]*"/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// -- SMART TRUNCATION ---------------------------------------------------
const TRUNCATION_SEPARATOR = '\n<!-- ... content truncated ... -->\n'
const SUBPAGE_TRUNCATION_SIGNAL = '\n<!-- [WEBDOC: content truncated at scraper limit — page continues beyond this point] -->\n'

export function applySmartTruncation(html: string, complexity?: SiteComplexity): string {
  if (html.length <= 40_000) return html

  const viewportBoundary =
    complexity === 'simple' ? 12_000 :
    complexity === 'medium' ? 16_000 :
    24_000  // complex

  const headSize =
    html.length <= 80_000 ? 45_000 :
    html.length <= 120_000 ? 55_000 :
    65_000

  const headSlice = html.slice(0, headSize)

  const VIEWPORT_MARKER = '\n<!-- [WEBDOC: estimated viewport boundary — content below this line is likely below the fold on desktop] -->\n'
  const markerPos = headSlice.lastIndexOf('>', viewportBoundary - 1)
  const markedHead = markerPos >= 0
    ? headSlice.slice(0, markerPos + 1) + VIEWPORT_MARKER + headSlice.slice(markerPos + 1)
    : headSlice

  console.log(`[SCRAPER] viewport marker | complexity=${complexity ?? 'unknown'} boundary=${viewportBoundary}chars`)

  const result = markedHead + TRUNCATION_SEPARATOR + html.slice(-8_000)
  console.log(`[SCRAPER] truncation | cleaned=${html.length} → head+tail=${result.length}`)
  return result
}

export async function scrapeSite(inputUrl: string): Promise<CombinedExtraction> {
  process.stderr.write(`[PIPELINE] scrape starting ${inputUrl}\n`)
  try {
    const pageUrl = normalizeUrlPreservingPath(inputUrl)
    const scraped = await scrapeUrl(inputUrl)

    process.stderr.write('[SCRAPER] raw html chars: ' + scraped.rawHtml.length + '\n')
    process.stderr.write('[SCAN] complexity=' + scraped.complexity + ' ratio=' + scraped.readableRatio.toFixed(2) + '\n')

    let cleaned: string
    try {
      cleaned = cleanHtml(scraped.rawHtml)
    } catch (cleanErr) {
      process.stderr.write('[SCRAPER] cleanHtml THREW: ' + (cleanErr instanceof Error ? cleanErr.stack ?? cleanErr.message : String(cleanErr)) + '\n')
      throw cleanErr
    }
    process.stderr.write('[ANALYZE] cleaned html chars: ' + cleaned.length + '\n')

    console.log(
      `[SCRAPER] method:${scraped.method} raw:${scraped.rawHtml.length} clean:${cleaned.length}`
    )

    const truncated = applySmartTruncation(cleaned, scraped.complexity)
    process.stderr.write('[SCRAPER] truncated html chars: ' + truncated.length + '\n')

    return {
      rawHtml: truncated,
      pagesAnalyzed: [pageUrl],
      complexity: scraped.complexity,
      readableRatio: scraped.readableRatio,
    }
  } catch (e) {
    process.stderr.write('[SCRAPER] FATAL scrapeSite: ' + (e instanceof Error ? e.stack : String(e)) + '\n')
    throw e
  }
}

export async function scrapePreview(url: string): Promise<{
  rawHtml: string
  complexity: SiteComplexity
}> {
  // Step 1 — plain HTTP fetch, zero Browserless credits
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000)
    })
    if (res.ok) {
      const html = await res.text()
      const readable = readableTextLength(html)
      const blocked = isBlockPage(html)
      console.log(`[PREVIEW] plain fetch | chars=${html.length} readable=${readable} blocked=${blocked}`)
      if (readable >= 500 && !blocked) {
        const ratio = html.length > 0 ? readable / html.length : 0
        const complexity: SiteComplexity = ratio > 0.4 ? 'simple' : ratio >= 0.15 ? 'medium' : 'complex'
        return { rawHtml: cleanHtml(html).slice(0, 2000), complexity }
      }
    }
  } catch {
    console.log('[PREVIEW] plain fetch failed — falling back to Browserless')
  }

  // Step 2 — single Browserless request, no residential proxy
  const apiKey = process.env.BROWSERLESS_API_KEY
  if (!apiKey) return { rawHtml: '', complexity: 'medium' }

  try {
    const endpoint = `https://production-sfo.browserless.io/unblock?token=${apiKey}&launch=${encodeURIComponent(JSON.stringify({ ignoreHTTPSErrors: true }))}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        bestAttempt: true,
        gotoOptions: { waitUntil: 'domcontentloaded', timeout: 12000 },
        waitForTimeout: 1500
      }),
      signal: AbortSignal.timeout(20000)
    })
    if (res.ok) {
      const data = await res.json()
      const html = data.content ?? ''
      console.log(`[PREVIEW] browserless fallback | chars=${html.length}`)
      const cleaned = cleanHtml(html).slice(0, 2000)
      const ratio = html.length > 0 ? readableTextLength(html) / html.length : 0
      const complexity: SiteComplexity = ratio > 0.4 ? 'simple' : ratio >= 0.15 ? 'medium' : 'complex'
      return { rawHtml: cleaned, complexity }
    }
  } catch {
    console.log('[PREVIEW] browserless fallback failed')
  }

  return { rawHtml: '', complexity: 'medium' }
}
