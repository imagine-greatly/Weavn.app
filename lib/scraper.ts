
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
function readableTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

// /unblock returns JSON: { content: "<html>..." }
async function extractUnblockHtml(res: Response): Promise<string | null> {
  try {
    const json = await res.json() as Record<string, unknown>
    const html = typeof json.content === 'string' ? json.content : null
    return html && html.length > 0 ? html : null
  } catch {
    return null
  }
}

// -- BROWSERLESS /unblock — highest-fidelity human browser session ------
//
// Why /unblock over /content:
//   /content is a basic headless fetch. /unblock runs the full Browserless
//   bot-detection bypass stack and returns content after CAPTCHAs and
//   Cloudflare challenges are solved.
//
// Why proxy=residential:
//   Cloudflare, Stripe, Notion, Linear, Shopify all check IP reputation.
//   Datacenter IPs (AWS, GCP, Vercel) get immediately challenged.
//   Residential IPs are indistinguishable from real user traffic and pass
//   every IP-reputation gate. This is the single most important field for
//   reaching Cloudflare-protected sites.
//
// Why waitForTimeout: 4000 on attempt 1:
//   domcontentloaded fires before React/Next.js hydration completes.
//   4 s gives JS time to render content into the DOM before we snapshot it.
//
// Attempt 1 (fast):  domcontentloaded + 4 s hydration wait   ≈ 24 s max
// Attempt 2 (deep):  networkidle2 (waits for all XHR to quiet) ≈ 38 s max
// Total worst case:  62 s — well under the 120 s scan timeout
//
async function fetchWithBrowserless(url: string): Promise<string> {
  if (!process.env.BROWSERLESS_API_KEY) {
    throw new Error('Browserless API key not configured — set BROWSERLESS_API_KEY')
  }

  // proxy=residential: routes through real home/mobile IPs, bypasses
  // Cloudflare's datacenter IP blocks that otherwise stop /unblock cold.
  const endpoint =
    `https://production-sfo.browserless.io/unblock` +
    `?token=${process.env.BROWSERLESS_API_KEY}&proxy=residential`

  // Attempt 1 — fast path -----------------------------------------------
  // domcontentloaded fires early; waitForTimeout:4000 lets React/Vue/Next
  // hydrate and fill the DOM before we snapshot. Catches most SSR + SPA sites.
  const ctrl1 = new AbortController()
  const t1 = setTimeout(() => ctrl1.abort(), 26000)
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
        waitForTimeout: 4000,
      }),
      signal: ctrl1.signal,
    })
    if (res.ok) {
      html1 = await extractUnblockHtml(res)
      console.log(`[SCRAPER] attempt1: readable=${readableTextLength(html1 ?? '')} url=${url}`)
    } else {
      const err = await res.text()
      console.log(`[SCRAPER] attempt1 HTTP ${res.status}: ${err.slice(0, 400)}`)
    }
  } catch (err) {
    console.log('[SCRAPER] attempt1 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(t1)
  }

  if (html1 && readableTextLength(html1) >= 500) return html1

  // Attempt 2 — deep path -----------------------------------------------
  // networkidle2: waits until no more than 2 in-flight XHR for 500 ms.
  // Required for heavy SPAs (Notion, Linear) that stream content via fetch
  // after initial render. No extra waitForTimeout — networkidle2 already
  // waits for JS quiet.
  console.log(`[SCRAPER] attempt1 insufficient, trying attempt2 for ${url}`)
  const ctrl2 = new AbortController()
  const t2 = setTimeout(() => ctrl2.abort(), 38000)
  let html2: string | null = null

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        content: true,
        bestAttempt: true,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 32000 },
      }),
      signal: ctrl2.signal,
    })
    if (res.ok) {
      html2 = await extractUnblockHtml(res)
      console.log(`[SCRAPER] attempt2: readable=${readableTextLength(html2 ?? '')} url=${url}`)
    } else {
      const err = await res.text()
      console.log(`[SCRAPER] attempt2 HTTP ${res.status}: ${err.slice(0, 400)}`)
    }
  } catch (err) {
    console.log('[SCRAPER] attempt2 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(t2)
  }

  const len1 = readableTextLength(html1 ?? '')
  const len2 = readableTextLength(html2 ?? '')
  console.log(`[SCRAPER] results: attempt1=${len1} attempt2=${len2} url=${url}`)
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
    .replace(/\s+class=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
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
