
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
    'your cart is empty',
    'have an account',
    'log in',
    'continue shopping',
    'total items in cart',
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
const REALISTIC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const FETCH_HEADERS = {
  'User-Agent': REALISTIC_UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
} as const

// Browserless base body — mirrors a real incognito Chrome browser.
// userAgent + viewport + setExtraHTTPHeaders + stealth + ignoreHTTPSErrors closes every gap
// between Browserless and a real browser in incognito mode.
const BL_BASE = {
  bestAttempt: true,
  stealth: true,
  ignoreHTTPSErrors: true,      // handles goldcare.com-type broken/missing-chain SSL certs
  userAgent: REALISTIC_UA,       // sets the browser UA string (correct Browserless v2 field)
  viewport: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false },
  setExtraHTTPHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
}

// -- SSL-BYPASS FETCH ---------------------------------------------------
// Uses node:https directly with rejectUnauthorized:false for sites whose TLS cert chain
// is broken, self-signed, or expired. Follows up to 3 redirects manually.
// Safe for reading public content — no credentials are ever sent.
async function fetchInsecureHtml(url: string, hopsLeft = 3): Promise<string | null> {
  if (hopsLeft <= 0) return null
  const [{ default: httpsLib }, { default: httpLib }] = await Promise.all([
    import('node:https'),
    import('node:http'),
  ])
  return new Promise((resolve) => {
    let parsed: URL
    try { parsed = new URL(url) } catch { resolve(null); return }
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? httpsLib : httpLib
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          'User-Agent': REALISTIC_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          try {
            fetchInsecureHtml(new URL(res.headers.location, url).href, hopsLeft - 1).then(resolve)
          } catch { resolve(null) }
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8') || null))
        res.on('error', () => resolve(null))
      }
    )
    req.setTimeout(12000, () => { req.destroy(); resolve(null) })
    req.on('error', () => resolve(null))
    req.end()
  })
}

function readableTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

// -- BROWSERLESS (TIER 1 — JS-rendered, stealth, full Chrome) -----------
// Standard: identical capabilities to a human in incognito Chrome.
// Two attempts: fast (domcontentloaded) then thorough (networkidle2).
async function fetchWithBrowserless(url: string): Promise<string | null> {
  if (!process.env.BROWSERLESS_API_KEY) {
    console.log('[SCRAPER] Browserless key not configured — skipping tier 1')
    return null
  }

  const endpoint = `https://production-sfo.browserless.io/content?token=${process.env.BROWSERLESS_API_KEY}`

  // Attempt 1 — fast path: domcontentloaded + 2 s JS execution window.
  // Handles SSR sites, simple SPAs, and most marketing pages.
  const controller1 = new AbortController()
  const timer1 = setTimeout(() => controller1.abort(), 22000)
  let html1: string | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...BL_BASE,
        url,
        gotoOptions: { waitUntil: 'domcontentloaded', timeout: 18000 },
        waitForTimeout: 2000,
      }),
      signal: controller1.signal,
    })
    if (res.ok) {
      html1 = await res.text() || null
      const readable = html1 ? readableTextLength(html1) : 0
      console.log(`[SCRAPER] Browserless attempt 1: readable=${readable} url=${url}`)
    } else {
      const err = await res.text()
      console.log(`[SCRAPER] Browserless attempt 1 HTTP ${res.status}: ${err.slice(0, 300)}`)
    }
  } catch (err) {
    console.log('[SCRAPER] Browserless attempt 1 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(timer1)
  }

  if (html1 && readableTextLength(html1) >= 500) return html1

  // Attempt 2 — thorough path: networkidle2 waits for all async JS to finish.
  // Required for heavy SPAs (React, Next.js, Vue) that render content after hydration.
  console.log(`[SCRAPER] Browserless attempt 1 insufficient, trying attempt 2 for ${url}`)
  const controller2 = new AbortController()
  const timer2 = setTimeout(() => controller2.abort(), 30000)
  let html2: string | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...BL_BASE,
        url,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 25000 },
      }),
      signal: controller2.signal,
    })
    if (res.ok) {
      html2 = await res.text() || null
      const readable = html2 ? readableTextLength(html2) : 0
      console.log(`[SCRAPER] Browserless attempt 2: readable=${readable} url=${url}`)
    } else {
      const err = await res.text()
      console.log(`[SCRAPER] Browserless attempt 2 HTTP ${res.status}: ${err.slice(0, 300)}`)
    }
  } catch (err) {
    console.log('[SCRAPER] Browserless attempt 2 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(timer2)
  }

  const len1 = readableTextLength(html1 ?? '')
  const len2 = readableTextLength(html2 ?? '')
  console.log(`[SCRAPER] Browserless results: attempt1=${len1} attempt2=${len2}`)
  const best = len2 > len1 ? html2 : html1
  if (best && readableTextLength(best) >= 200) return best

  console.log(`[SCRAPER] Browserless both attempts insufficient for ${url}`)
  return null
}

// -- JINA (TIER 2 — clean markdown, bypasses many bot layers) -----------
async function fetchWithJina(url: string): Promise<string | null> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const headers: Record<string, string> = { Accept: 'text/markdown' }
  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 14000)
  try {
    const res = await fetch(jinaUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    })
    const body = await res.text()
    if (!res.ok || body.trim().length < 200) {
      console.log(`[SCRAPER] Jina HTTP ${res.status}, body length=${body.length} for ${url}`)
      return null
    }
    console.log(`[SCRAPER] Jina success: length=${body.length} url=${url}`)
    return body
  } catch (err) {
    console.log('[SCRAPER] Jina error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// -- PLAIN HTTP FALLBACK (TIER 3) --------------------------------------
// Simple fetch for static/SSR sites. Falls through to SSL-bypass path on any
// HTTPS network failure — handles sites like goldcare.com with broken cert chains.
async function fetchWithPlainHttp(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: controller.signal })
    if (!res.ok) {
      console.log(`[SCRAPER] Plain HTTP ${res.status} for ${url}`)
      return null
    }
    const html = await res.text() || null
    console.log(`[SCRAPER] Plain HTTP success: length=${html?.length ?? 0} url=${url}`)
    return html
  } catch (err) {
    // For any non-abort HTTPS network failure, try SSL-bypass (node:https with
    // rejectUnauthorized:false). This catches SSL cert errors, chain errors, and
    // similar TLS issues that fetch rejects but a real browser would accept via
    // "Proceed anyway". goldcare.com-type sites land here.
    const isAbort = err instanceof Error && err.name === 'AbortError'
    if (!isAbort && url.startsWith('https:')) {
      const causeStr = String((err as any)?.cause?.message ?? (err as any)?.cause?.code ?? '')
      const errStr = err instanceof Error ? err.message : String(err)
      console.log(`[SCRAPER] Plain HTTP HTTPS error — ${errStr}${causeStr ? ` (${causeStr})` : ''} — trying SSL bypass for ${url}`)
      return fetchInsecureHtml(url)
    }
    console.log(`[SCRAPER] Plain HTTP error: ${err instanceof Error ? err.message : err} url=${url}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// -- MAIN SCRAPE FUNCTION -----------------------------------------------
export interface ScrapeResult {
  rawHtml: string
  method: 'browserless' | 'jina' | 'fetch'
  domain: string
}

export interface CombinedExtraction {
  rawHtml: string
  pagesAnalyzed: string[]
}

export async function scrapeUrl(inputUrl: string): Promise<ScrapeResult> {
  const url = normalizeToHomepage(inputUrl)
  const domain = new URL(url).hostname.replace(/^www\./, '')

  // Tier 1: Browserless — JS-rendered, stealth, handles SPAs and Cloudflare
  let rawHtml = await fetchWithBrowserless(url)
  if (rawHtml) {
    console.log(`[SCRAPER] ${domain} | method:browserless | html_len:${rawHtml.length}`)
    return { rawHtml, method: 'browserless', domain }
  }

  // Tier 2: Jina — clean markdown, bypasses many bot-detection layers
  console.log(`[SCRAPER] Browserless failed for ${url}, trying Jina`)
  rawHtml = await fetchWithJina(url)
  if (rawHtml) {
    console.log(`[SCRAPER] ${domain} | method:jina | html_len:${rawHtml.length}`)
    return { rawHtml, method: 'jina', domain }
  }

  // Tier 3: Plain HTTP — simple fetch with SSL-bypass fallback
  console.log(`[SCRAPER] Jina failed for ${url}, trying plain HTTP`)
  rawHtml = await fetchWithPlainHttp(url)
  if (rawHtml) {
    console.log(`[SCRAPER] ${domain} | method:fetch | html_len:${rawHtml.length}`)
    return { rawHtml, method: 'fetch', domain }
  }

  console.log(`[SCRAPER] All tiers failed for ${url}`)
  return { rawHtml: '', method: 'fetch', domain }
}

// -- HTML CLEANING -------------------------------------------------------
export function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove noisy attributes — class, data-*, style, aria-*, event handlers
    .replace(/\s+class=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+data-[a-z][a-z0-9-]*=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+style=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+aria-[a-z-]+=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+on[a-z]+=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    // Strip data URIs (base64 images bloat tokens)
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
  const pageUrl = normalizeToHomepage(inputUrl)
  const scraped = await scrapeUrl(inputUrl)

  // Jina returns Markdown — skip HTML cleaning regexes, truncate directly
  const cleaned =
    scraped.method === 'jina' ? scraped.rawHtml : cleanHtml(scraped.rawHtml)

  console.log(
    `[SCRAPER] method:${scraped.method} raw:${scraped.rawHtml.length} clean:${cleaned.length}`
  )

  return {
    rawHtml: applySmartTruncation(cleaned),
    pagesAnalyzed: [pageUrl],
  }
}
