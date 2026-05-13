
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

// -- BROWSERLESS (PRIMARY JS RENDERER) --------------------------------
const BROWSERLESS_TIMEOUT_MS = 45_000

// Strips script tags and HTML tags, returns remaining readable text length
function readableTextLength(html: string): number {
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  return noScripts.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length
}

async function fetchWithBrowserless(url: string): Promise<string | null> {
  if (!process.env.BROWSERLESS_API_KEY) {
    console.log('[SCRAPER] Browserless key not configured')
    return null
  }
  console.log('[BROWSERLESS] API key present:', !!process.env.BROWSERLESS_API_KEY, 'Key prefix:', process.env.BROWSERLESS_API_KEY?.slice(0, 8))
  console.log('[SCRAPER] Browserless request:', { url })

  const ENDPOINT = `https://production-sfo.browserless.io/content?token=${process.env.BROWSERLESS_API_KEY}`
  const BASE_BODY = {
    url,
    bestAttempt: true,
    rejectRequestPattern: ['.*\\.(png|jpg|jpeg|gif|webp|svg|mp4|woff|woff2|ttf|eot).*'],
    setExtraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    gotoOptions: { waitUntil: 'networkidle0', timeout: 30000 },
  }

  try {
    // -- FIRST ATTEMPT: 8s JS wait --
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), BROWSERLESS_TIMEOUT_MS)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...BASE_BODY, waitFor: { timeout: 8000 } }),
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errBody = await res.text()
      console.log(`[scraper] Browserless for ${url}: status=${res.status}, length=${errBody.length}, result=null`)
      console.log('[SCRAPER] Browserless failed body:', errBody.slice(0, 500))
      return null
    }

    const html = await res.text()
    if (!html) {
      console.log(`[scraper] Browserless for ${url}: status=${res.status}, length=0, result=null`)
      return null
    }

    // -- JS-SHELL CHECK: retry with 12s wait if readable text < 500 chars --
    if (readableTextLength(html) < 500) {
      console.log(`[scraper] Browserless for ${url}: JS shell detected (readable<500), retrying with 12s wait`)
      try {
        const retryController = new AbortController()
        const retryTimeout = setTimeout(() => retryController.abort(), 50_000)
        const retryRes = await fetch(ENDPOINT, {
          method: 'POST',
          signal: retryController.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...BASE_BODY, waitFor: { timeout: 12000 } }),
        })
        clearTimeout(retryTimeout)

        if (retryRes.ok) {
          const retryHtml = await retryRes.text()
          if (retryHtml) {
            console.log(`[scraper] Browserless retry for ${url}: status=${retryRes.status}, length=${retryHtml.length}, result=success`)
            return retryHtml
          }
        } else {
          const retryErr = await retryRes.text()
          console.log(`[scraper] Browserless retry for ${url}: status=${retryRes.status}, body=${retryErr.slice(0, 200)}`)
        }
      } catch (retryErr) {
        console.log('[SCRAPER] Browserless retry error:', retryErr instanceof Error ? retryErr.message : retryErr)
      }
      // Return original even if still a JS shell — let downstream decide
      return html
    }

    console.log(`[scraper] Browserless for ${url}: status=${res.status}, length=${html.length}, result=success`)
    return html
  } catch (err) {
    console.log(`[scraper] Browserless for ${url}: status=error, length=0, result=null`)
    console.log('[SCRAPER] Browserless error:', err instanceof Error ? err.message : err)
    return null
  }
}

// -- SCREENSHOT CAPTURE -------------------------------------------------
async function fetchScreenshotWithBrowserless(url: string): Promise<string | null> {
  if (!process.env.BROWSERLESS_API_KEY) return null
  const ENDPOINT = `https://production-sfo.browserless.io/screenshot?token=${process.env.BROWSERLESS_API_KEY}`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 40_000)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        options: { fullPage: false, type: 'jpeg', quality: 80 },
        gotoOptions: { waitUntil: 'domcontentloaded', timeout: 30000 },
        waitFor: { timeout: 5000 },
      }),
    })
    clearTimeout(timeout)
    if (!res.ok) {
      console.log(`[scraper] Screenshot for ${url}: status=${res.status}, result=null`)
      return null
    }
    const buffer = await res.arrayBuffer()
    if (!buffer.byteLength) return null
    console.log(`[scraper] Screenshot for ${url}: size=${buffer.byteLength}, result=success`)
    return Buffer.from(buffer).toString('base64')
  } catch (err) {
    console.log('[SCRAPER] Screenshot error:', err instanceof Error ? err.message : err)
    return null
  }
}

// -- MAIN SCRAPE FUNCTION -----------------------------------------------
export interface ScrapeResult {
  rawHtml: string
  method: 'browserless'
  domain: string
  screenshot: string | null
}

export interface CombinedExtraction {
  rawHtml: string
  pagesAnalyzed: string[]
  screenshot?: string | null
}

export async function scrapeUrl(inputUrl: string): Promise<ScrapeResult> {
  const url = normalizeToHomepage(inputUrl)
  const domain = new URL(url).hostname.replace(/^www\./, '')

  const rawHtml = await fetchWithBrowserless(url)

  if (!rawHtml) {
    console.log(`[scraper] Browserless failed for ${url}`)
  } else {
    console.log(`[SCRAPER] ${domain} | method:browserless | html_len:${rawHtml.length}`)
  }

  const screenshot = rawHtml ? await fetchScreenshotWithBrowserless(url) : null

  return {
    rawHtml: rawHtml ?? '',
    method: 'browserless',
    domain,
    screenshot,
  }
}

// -- HTML CLEANING -------------------------------------------------------
export function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+class=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
    .replace(/\s+data-[a-z][a-z0-9-]*=(?:"[^"]*"|'[^']*'|[^\s/>]*)/gi, '')
}

// -- SMART TRUNCATION ----------------------------------------------------
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
  console.log(`[SCRAPER] clean html_len:${cleaned.length} (raw:${scraped.rawHtml.length})`)
  return {
    rawHtml: applySmartTruncation(cleaned),
    pagesAnalyzed: [pageUrl],
    screenshot: scraped.screenshot,
  }
}
