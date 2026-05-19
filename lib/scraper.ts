
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
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function readableTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

// -- BROWSERLESS (TIER 1 — JS-rendered, stealth) -----------------------
async function fetchWithBrowserless(url: string): Promise<string | null> {
  if (!process.env.BROWSERLESS_API_KEY) {
    console.log('[SCRAPER] Browserless key not configured')
    return null
  }

  const endpoint = `https://production-sfo.browserless.io/content?token=${process.env.BROWSERLESS_API_KEY}`

  const baseBody = {
    bestAttempt: true,
    stealth: true,
    setExtraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'User-Agent': REALISTIC_UA,
    },
  }

  // Attempt 1 — fast (domcontentloaded, wait for visible text)
  const controller1 = new AbortController()
  const timer1 = setTimeout(() => controller1.abort(), 20000)
  let html1: string | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...baseBody,
        url,
        gotoOptions: { waitUntil: 'domcontentloaded', timeout: 15000 },
        waitForFunction: {
          fn: "() => document.body && document.body.innerText.trim().length > 200",
          timeout: 8000,
        },
      }),
      signal: controller1.signal,
    })
    if (res.ok) {
      html1 = await res.text() || null
      const readable = html1 ? readableTextLength(html1) : 0
      console.log(`[SCRAPER] Browserless attempt 1: readable=${readable} url=${url}`)
    } else {
      const err = await res.text()
      console.log(`[SCRAPER] Browserless attempt 1 HTTP ${res.status}: ${err.slice(0, 200)}`)
    }
  } catch (err) {
    console.log('[SCRAPER] Browserless attempt 1 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(timer1)
  }

  if (html1 && readableTextLength(html1) >= 500) return html1

  // Attempt 2 — full JS render (networkidle2, longer wait)
  console.log(`[SCRAPER] Browserless attempt 1 insufficient, trying attempt 2 for ${url}`)
  const controller2 = new AbortController()
  const timer2 = setTimeout(() => controller2.abort(), 28000)
  let html2: string | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...baseBody,
        url,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 24000 },
      }),
      signal: controller2.signal,
    })
    if (res.ok) {
      html2 = await res.text() || null
      const readable = html2 ? readableTextLength(html2) : 0
      console.log(`[SCRAPER] Browserless attempt 2: readable=${readable} url=${url}`)
    } else {
      const err = await res.text()
      console.log(`[SCRAPER] Browserless attempt 2 HTTP ${res.status}: ${err.slice(0, 200)}`)
    }
  } catch (err) {
    console.log('[SCRAPER] Browserless attempt 2 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(timer2)
  }

  // Return the better result if it has any meaningful content
  const len1 = readableTextLength(html1 ?? '')
  const len2 = readableTextLength(html2 ?? '')
  console.log(`[SCRAPER] Browserless results: attempt1=${len1} attempt2=${len2}`)
  const best = len2 > len1 ? html2 : html1
  if (best && readableTextLength(best) >= 300) return best

  console.log(`[SCRAPER] Browserless both attempts insufficient for ${url}`)
  return null
}

// -- JINA (TIER 2 — clean markdown, handles bot-protected sites) --------
async function fetchWithJina(url: string): Promise<string | null> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const headers: Record<string, string> = { Accept: 'text/markdown' }
  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
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
async function fetchWithPlainHttp(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': REALISTIC_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      console.log(`[SCRAPER] Plain HTTP ${res.status} for ${url}`)
      return null
    }
    const html = await res.text() || null
    console.log(`[SCRAPER] Plain HTTP success: length=${html?.length ?? 0} url=${url}`)
    return html
  } catch (err) {
    clearTimeout(timer)
    console.log('[SCRAPER] Plain HTTP error:', err instanceof Error ? err.message : err)
    return null
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

  // Tier 1: Browserless — JS-rendered, stealth, handles SPAs
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

  // Tier 3: Plain HTTP — simple fetch, last resort
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
