
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
function readableTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length
}

async function fetchWithBrowserless(url: string): Promise<string | null> {
  if (!process.env.BROWSERLESS_API_KEY) {
    console.log('[SCRAPER] Browserless key not configured')
    return null
  }

  // Attempt 1 — Fast scan (domcontentloaded + wait for real text)
  const controller1 = new AbortController()
  const timer1 = setTimeout(() => controller1.abort(), 40000)
  let html1: string | null = null

  try {
    const response = await fetch(
      `https://production-sfo.browserless.io/content?token=${process.env.BROWSERLESS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          bestAttempt: true,
          gotoOptions: {
            waitUntil: 'domcontentloaded',
            timeout: 25000
          },
          waitFor: {
            function: "() => document.body && document.body.innerText.trim().length > 300"
          }
        }),
        signal: controller1.signal
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.log(`[SCRAPER] Browserless attempt 1 ${response.status}:`, err.slice(0, 300))
    } else {
      html1 = await response.text() || null
      console.log(`[SCRAPER] Browserless attempt 1 success for ${url}, length: ${html1?.length ?? 0}`)
    }
  } catch (err) {
    console.log('[SCRAPER] Browserless attempt 1 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(timer1)
  }

  if (html1 && readableTextLength(html1) >= 500) {
    return html1
  }

  // Attempt 2 — Full JS render (networkidle2)
  console.log(`[SCRAPER] Browserless attempt 1 insufficient, running attempt 2 for ${url}`)
  const controller2 = new AbortController()
  const timer2 = setTimeout(() => controller2.abort(), 45000)
  let html2: string | null = null

  try {
    const response = await fetch(
      `https://production-sfo.browserless.io/content?token=${process.env.BROWSERLESS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          bestAttempt: true,
          gotoOptions: {
            waitUntil: 'networkidle2',
            timeout: 30000
          }
        }),
        signal: controller2.signal
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.log(`[SCRAPER] Browserless attempt 2 ${response.status}:`, err.slice(0, 300))
    } else {
      html2 = await response.text() || null
      console.log(`[SCRAPER] Browserless attempt 2 success for ${url}, length: ${html2?.length ?? 0}`)
    }
  } catch (err) {
    console.log('[SCRAPER] Browserless attempt 2 error:', err instanceof Error ? err.message : err)
  } finally {
    clearTimeout(timer2)
  }

  const len1 = html1 ? readableTextLength(html1) : 0
  const len2 = html2 ? readableTextLength(html2) : 0
  console.log(`[SCRAPER] Browserless readable text — attempt 1: ${len1}, attempt 2: ${len2}`)

  return len2 > len1 ? html2 : html1
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

  if (!rawHtml) {
    console.log(`[scraper] Browserless failed for ${url}`)
  } else {
    console.log(`[SCRAPER] ${domain} | method:browserless | html_len:${rawHtml.length}`)
  }

  return {
    rawHtml: rawHtml ?? '',
    method: 'browserless',
    domain,
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
  }
}
