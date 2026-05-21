
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
function readableTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

// Extract HTML from a Browserless /unblock response.
// /unblock returns JSON: { content: "<!DOCTYPE html>..." }
async function extractUnblockHtml(res: Response): Promise<string | null> {
  try {
    const json = await res.json() as Record<string, unknown>
    const html = typeof json.content === 'string' ? json.content : null
    return html || null
  } catch {
    return null
  }
}

// -- BROWSERLESS /unblock (bot-detection bypass, JS-rendered) -----------
// /unblock is the correct endpoint for bypassing Cloudflare, DataDome, etc.
// It returns JSON { content: "<html>..." } instead of raw HTML.
// stealth, userAgent, viewport, setExtraHTTPHeaders are NOT valid body fields
// for /content or /unblock — they were silently ignored before this fix.
// ignoreHTTPSErrors is passed as a launch query param (browser-level flag).
// Two attempts: fast (domcontentloaded) then thorough (networkidle2).
// Max wall time: 22 s + 30 s = 52 s.
async function fetchWithBrowserless(url: string): Promise<string> {
  if (!process.env.BROWSERLESS_API_KEY) {
    throw new Error('Browserless API key not configured — set BROWSERLESS_API_KEY')
  }

  // ignoreHTTPSErrors as a launch param handles goldcare.com-style broken SSL certs
  const launchParam = encodeURIComponent(JSON.stringify({ ignoreHTTPSErrors: true }))
  const endpoint =
    `https://production-sfo.browserless.io/unblock` +
    `?token=${process.env.BROWSERLESS_API_KEY}&launch=${launchParam}`

  // Attempt 1 — fast path: domcontentloaded + 2 s JS execution window.
  const controller1 = new AbortController()
  const timer1 = setTimeout(() => controller1.abort(), 22000)
  let html1: string | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        content: true,
        bestAttempt: true,
        gotoOptions: { waitUntil: 'domcontentloaded', timeout: 18000 },
        waitForTimeout: 2000,
      }),
      signal: controller1.signal,
    })
    if (res.ok) {
      html1 = await extractUnblockHtml(res)
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
  console.log(`[SCRAPER] Browserless attempt 1 insufficient, trying attempt 2 for ${url}`)
  const controller2 = new AbortController()
  const timer2 = setTimeout(() => controller2.abort(), 30000)
  let html2: string | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        content: true,
        bestAttempt: true,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 25000 },
      }),
      signal: controller2.signal,
    })
    if (res.ok) {
      html2 = await extractUnblockHtml(res)
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

  throw new Error(
    `Browserless could not retrieve sufficient content from ${url} ` +
    `(attempt1=${len1} chars, attempt2=${len2} chars). ` +
    `The site may be blocking automated access or returned a login/CAPTCHA wall.`
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
  console.log(`[SCRAPER] ${domain} | method:browserless | html_len:${rawHtml.length}`)
  return { rawHtml, method: 'browserless', domain }
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
  const cleaned = cleanHtml(scraped.rawHtml)

  console.log(
    `[SCRAPER] method:${scraped.method} raw:${scraped.rawHtml.length} clean:${cleaned.length}`
  )

  return {
    rawHtml: applySmartTruncation(cleaned),
    pagesAnalyzed: [pageUrl],
  }
}
