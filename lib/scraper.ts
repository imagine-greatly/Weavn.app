
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
async function fetchWithBrowserless(url: string): Promise<string | null> {
  if (!process.env.BROWSERLESS_API_KEY) {
    console.log('[SCRAPER] Browserless key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://production-sfo.browserless.io/content?token=${process.env.BROWSERLESS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000
          }
        }),
        signal: AbortSignal.timeout(35000)
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.log(`[SCRAPER] Browserless ${response.status}:`, err.slice(0, 300))
      return null
    }

    const html = await response.text()
    console.log(`[SCRAPER] Browserless success for ${url}, length: ${html.length}`)
    return html || null

  } catch (err) {
    console.log('[SCRAPER] Browserless error:', err instanceof Error ? err.message : err)
    return null
  }
}

// -- SCREENSHOT CAPTURE -------------------------------------------------
async function fetchScreenshotWithBrowserless(url: string): Promise<string | null> {
  if (!process.env.BROWSERLESS_API_KEY) return null
  try {
    const response = await fetch(
      `https://production-sfo.browserless.io/screenshot?token=${process.env.BROWSERLESS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          options: {
            fullPage: false,
            type: 'jpeg',
            quality: 80
          },
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000
          }
        }),
        signal: AbortSignal.timeout(35000)
      }
    )
    if (!response.ok) {
      console.log(`[SCRAPER] Screenshot failed: ${response.status}`)
      return null
    }
    const buffer = await response.arrayBuffer()
    if (!buffer.byteLength) return null
    console.log(`[SCRAPER] Screenshot success: ${buffer.byteLength} bytes`)
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
