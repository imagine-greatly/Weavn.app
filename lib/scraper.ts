
// -- URL NORMALIZATION --------------------------------------------------
export function normalizeToHomepage(input: string): string {
  try {
    const url = input.startsWith('http') ? input : `https://${input}`
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname}/`
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
// Attempt 1 (fast):   residential proxy, domcontentloaded + 2 s hydration  ≈ 20 s max
// Attempt 2 (deep):   residential proxy, networkidle2 + 2 s settle         ≈ 22 s max
// Attempt 3 (no-proxy fallback): bare request, domcontentloaded            ≈ 15 s max
// Total worst case:   57 s — leaves ≥ 28 s for Claude + Supabase under 85 s budget
//
async function fetchWithBrowserless(url: string): Promise<string> {
  process.stderr.write(`[SCRAPER] function entered, url: ${url}\n`)

  const apiKey = (process.env.BROWSERLESS_API_KEY ?? '').trim()
  process.stderr.write(`[SCRAPER] token present: ${!!apiKey} prefix: ${apiKey.slice(0, 6) || '(empty)'}\n`)

  if (!apiKey) {
    console.error('[SCRAPER] FATAL: BROWSERLESS_API_KEY env var is not set')
    throw new Error('Browserless API key not configured — set BROWSERLESS_API_KEY')
  }

  const makeEndpoint = (proxy: boolean) =>
    `https://production-sfo.browserless.io/unblock` +
    `?token=${apiKey}` +
    (proxy ? `&proxy=residential` : '')

  // Parse HTML out of a Browserless /unblock response body (text already read).
  // Checks content / html / data in case the field name varies by API version.
  const extractHtml = (text: string): string | null => {
    try {
      const json = JSON.parse(text) as Record<string, unknown>
      const topLevelKeys = Object.keys(json)
      console.error(`[SCRAPER] response keys: [${topLevelKeys.join(',')}]`)
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

  // Attempt 1 — fast path with residential proxy
  const body1 = {
    url,
    content: true,
    bestAttempt: true,
    gotoOptions: { waitUntil: 'domcontentloaded', timeout: 15000 },
    waitForTimeout: 2000,
  }
  process.stderr.write(`[SCRAPER] attempt1 START | url=${url}\n`)
  process.stderr.write(`[SCRAPER] attempt1 request | body=${JSON.stringify(body1)}\n`)

  const ctrl1 = new AbortController()
  const t1 = setTimeout(() => ctrl1.abort(), 20000)
  let html1: string | null = null
  const a1Start = Date.now()

  try {
    process.stderr.write('[SCRAPER] attempt1 sending request\n')
    const res1 = await fetch(makeEndpoint(true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body1),
      signal: ctrl1.signal,
    })
    const a1FetchMs = Date.now() - a1Start
    // Read body ONCE — res.clone() + res.json() can race on some runtimes
    const rawText1 = await res1.text()
    process.stderr.write('[SCRAPER] attempt1 response: ' + res1.status + ' chars: ' + rawText1.length + '\n')
    console.error(`[SCRAPER] attempt1 response | status=${res1.status} ${res1.statusText} | fetch_elapsed=${a1FetchMs}ms`)
    console.error(`[SCRAPER] attempt1 raw body | length=${rawText1.length} | first500: ${rawText1.slice(0, 500)}`)

    if (res1.ok) {
      html1 = extractHtml(rawText1)
      const len = readableTextLength(html1 ?? '')
      const blocked = html1 !== null && isBlockPage(html1)
      console.error(`[SCRAPER] attempt1 parsed | html_chars=${html1?.length ?? 0} readable=${len} blocked=${blocked} | total_elapsed=${Date.now() - a1Start}ms`)
    } else {
      console.error(`[SCRAPER] attempt1 FAILED | HTTP ${res1.status} | body: ${rawText1.slice(0, 300)} | elapsed=${a1FetchMs}ms`)
    }
  } catch (err) {
    const a1Elapsed = Date.now() - a1Start
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error(`[SCRAPER] attempt1 ERROR | ${isAbort ? 'ABORTED by 20s timeout' : 'threw exception'} | elapsed=${a1Elapsed}ms`)
    console.error('[SCRAPER] attempt1 exception:', err instanceof Error ? (err.stack ?? err.message) : err)
  } finally {
    clearTimeout(t1)
  }

  // Accept attempt 1 only if it has real content AND is not a bot-block page.
  const len1Early = readableTextLength(html1 ?? '')
  if (html1 && len1Early >= 500 && !isBlockPage(html1)) {
    console.error(`[SCRAPER] attempt1 ACCEPTED | readable=${len1Early} | total_elapsed=${Date.now() - a1Start}ms`)
    return html1
  }

  if (html1 && isBlockPage(html1)) {
    console.error(`[SCRAPER] attempt1 returned a block/challenge page — escalating to attempt2`)
  }

  // Attempt 2 — deep path with residential proxy
  const body2 = {
    url,
    content: true,
    bestAttempt: true,
    gotoOptions: { waitUntil: 'networkidle2', timeout: 18000 },
    waitForTimeout: 2000,
  }
  process.stderr.write(`[SCRAPER] attempt1 insufficient (${len1Early} chars), trying attempt2 for ${url}\n`)
  process.stderr.write(`[SCRAPER] attempt2 START | url=${url}\n`)
  process.stderr.write(`[SCRAPER] attempt2 request | body=${JSON.stringify(body2)}\n`)

  const ctrl2 = new AbortController()
  const t2 = setTimeout(() => ctrl2.abort(), 22000)
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
    console.error(`[SCRAPER] attempt2 response | status=${res2.status} ${res2.statusText} | fetch_elapsed=${a2FetchMs}ms`)
    console.error(`[SCRAPER] attempt2 raw body | length=${rawText2.length} | first500: ${rawText2.slice(0, 500)}`)

    if (res2.ok) {
      html2 = extractHtml(rawText2)
      const len = readableTextLength(html2 ?? '')
      const blocked = html2 !== null && isBlockPage(html2)
      console.error(`[SCRAPER] attempt2 parsed | html_chars=${html2?.length ?? 0} readable=${len} blocked=${blocked} | total_elapsed=${Date.now() - a2Start}ms`)
    } else {
      console.error(`[SCRAPER] attempt2 FAILED | HTTP ${res2.status} | body: ${rawText2.slice(0, 300)} | elapsed=${a2FetchMs}ms`)
    }
  } catch (err) {
    const a2Elapsed = Date.now() - a2Start
    const isAbort = err instanceof Error && err.name === 'AbortError'
    console.error(`[SCRAPER] attempt2 ERROR | ${isAbort ? 'ABORTED by 22s timeout' : 'threw exception'} | elapsed=${a2Elapsed}ms`)
    console.error('[SCRAPER] attempt2 exception:', err instanceof Error ? (err.stack ?? err.message) : err)
  } finally {
    clearTimeout(t2)
  }

  const len1 = readableTextLength(html1 ?? '')
  const len2 = readableTextLength(html2 ?? '')
  const blocked1 = html1 !== null && isBlockPage(html1)
  const blocked2 = html2 !== null && isBlockPage(html2)
  console.error(
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
        body: JSON.stringify({ url, content: true, bestAttempt: true }),
        signal: ctrl3.signal,
      })
      const rawText3 = await res3.text()
      process.stderr.write('[SCRAPER] attempt3 response: ' + res3.status + ' chars: ' + rawText3.length + '\n')
      console.error(`[SCRAPER] attempt3 response | status=${res3.status} | elapsed=${Date.now() - a3Start}ms`)
      console.error(`[SCRAPER] attempt3 raw body first500: ${rawText3.slice(0, 500)}`)

      if (res3.ok) {
        const html3 = extractHtml(rawText3)
        const len3 = readableTextLength(html3 ?? '')
        console.error(`[SCRAPER] attempt3 parsed | html_chars=${html3?.length ?? 0} readable=${len3}`)
        if (html3 && len3 >= 200) {
          console.error('[SCRAPER] attempt3 ACCEPTED')
          return html3
        }
      } else {
        console.error(`[SCRAPER] attempt3 FAILED | HTTP ${res3.status}`)
      }
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError'
      console.error(`[SCRAPER] attempt3 ERROR | ${isAbort ? 'ABORTED by 15s timeout' : 'threw exception'}`)
      console.error('[SCRAPER] attempt3 exception:', err instanceof Error ? err.message : err)
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

  if (best && readableTextLength(best) >= 200) return best

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
}

// -- MAIN SCRAPE FUNCTION -----------------------------------------------
export interface ScrapeResult {
  rawHtml: string
  method: 'browserless'
  domain: string
}

export interface CombinedExtraction {
  rawHtml: string
  pagesAnalyzed: string[]
}

export async function scrapeUrl(inputUrl: string): Promise<ScrapeResult> {
  const url = normalizeToHomepage(inputUrl)
  const domain = new URL(url).hostname.replace(/^www\./, '')

  const rawHtml = await fetchWithBrowserless(url)
  console.error(`[SCRAPER] ${domain} | method:browserless | html_len:${rawHtml.length}`)
  return { rawHtml, method: 'browserless', domain }
}

// -- HTML CLEANING -------------------------------------------------------
// class= attributes are intentionally kept: extractPageData (called from
// buildPageSummary) relies heavily on class-based selectors like
// [class*='hero'], [class*='pricing'], [class*='testimonial'], etc.
// Stripping classes here silently kills all of those selectors and degrades
// the structured summary sent to Claude. Size is controlled by applySmartTruncation.
export function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
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

export function applySmartTruncation(html: string): string {
  if (html.length <= 30_000) return html
  if (html.length <= 80_000) {
    return html.slice(0, 25_000) + TRUNCATION_SEPARATOR + html.slice(-8_000)
  }
  return html.slice(0, 20_000) + TRUNCATION_SEPARATOR + html.slice(-8_000)
}

export async function scrapeSite(inputUrl: string): Promise<CombinedExtraction> {
  process.stderr.write(`[PIPELINE] scrape starting ${inputUrl}\n`)
  const pageUrl = normalizeToHomepage(inputUrl)
  const scraped = await scrapeUrl(inputUrl)
  const cleaned = cleanHtml(scraped.rawHtml)

  console.error(
    `[SCRAPER] method:${scraped.method} raw:${scraped.rawHtml.length} clean:${cleaned.length}`
  )

  return {
    rawHtml: applySmartTruncation(cleaned),
    pagesAnalyzed: [pageUrl],
  }
}
