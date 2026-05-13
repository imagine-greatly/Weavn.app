import * as cheerio from 'cheerio'

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

// -- EXTRACT FROM HTML WITH CHEERIO ------------------------------------
function extractFromHtml(html: string): {
  h1Tags: string[]
  h2Tags: string[]
  h3Tags: string[]
  metaTitle: string
  metaDescription: string
  ogTitle: string
  ogDescription: string
  allText: string
} {
  const $ = cheerio.load(html)

  const h1Tags = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean)
  const h2Tags = $('h2').map((_, el) => $(el).text().trim()).get().filter(Boolean)
  const h3Tags = $('h3').map((_, el) => $(el).text().trim()).get().filter(Boolean)
  const metaTitle = $('title').text().trim()
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() ?? ''
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() ?? ''
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() ?? ''
  const allText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)

  return { h1Tags, h2Tags, h3Tags, metaTitle, metaDescription, ogTitle, ogDescription, allText }
}

// -- SELECT BEST HEADLINE FROM HTML ------------------------------------
function selectHeadlineFromHtml(extracted: ReturnType<typeof extractFromHtml>, domain: string): string | null {
  const { h1Tags, h2Tags, h3Tags, ogTitle, ogDescription, metaTitle } = extracted

  // Try H1, H2, H3 in order
  for (const tags of [h1Tags, h2Tags, h3Tags]) {
    for (const tag of tags) {
      const clean = stripMarkdown(tag)
      if (!isInvalidHeadline(clean)) return clean
    }
  }

  // OG title ? only if meaningfully different from bare domain name
  if (ogTitle) {
    const domainBase = domain.replace(/\.(com|store|co|io|net|org).*/i, '').replace(/-/g, ' ').toLowerCase()
    if (ogTitle.toLowerCase().trim() !== domainBase) {
      const clean = stripMarkdown(ogTitle)
      if (!isInvalidHeadline(clean) && clean.split(' ').length > 2) return clean
    }
  }

  // First sentence of OG description or meta description
  for (const desc of [ogDescription, metaTitle]) {
    if (!desc) continue
    const first = desc.split(/[.!?]/)[0].trim()
    if (first.length > 15 && first.length < 120) return first
  }

  return null
}

// -- MAIN SCRAPE FUNCTION -----------------------------------------------
export interface ScrapeResult {
  heroHeadline: string | null
  metaTitle: string
  metaDescription: string
  ogTitle: string
  ogDescription: string
  h1Tags: string[]
  h2Tags: string[]
  h3Tags: string[]
  allText: string
  rawHtml: string
  method: 'browserless'
  domain: string
}

export interface CombinedExtraction {
  pages: Array<{
    url: string
    title: string
    metaDescription: string
    headings: { level: string; text: string }[]
    buttons: string[]
    navLabels: string[]
    sectionParagraphs: string[]
    paragraphs: string[]
    links: { text: string; href: string }[]
    wordCount: number
  }>
  pagesAnalyzed: string[]
}

export async function scrapeUrl(inputUrl: string): Promise<ScrapeResult> {
  const url = normalizeToHomepage(inputUrl)
  const domain = new URL(url).hostname.replace(/^www\./, '')

  const rawHtml = await fetchWithBrowserless(url)

  if (!rawHtml) {
    console.log(`[scraper] Browserless failed for ${url}`)
    return {
      heroHeadline: null,
      metaTitle: '',
      metaDescription: '',
      ogTitle: '',
      ogDescription: '',
      h1Tags: [],
      h2Tags: [],
      h3Tags: [],
      allText: '',
      rawHtml: '',
      method: 'browserless',
      domain,
    }
  }

  const extracted = extractFromHtml(rawHtml)
  let heroHeadline = selectHeadlineFromHtml(extracted, domain)
  console.log('[SCRAPER] Browserless headline:', heroHeadline)

  if (heroHeadline && isInvalidHeadline(heroHeadline)) {
    console.log('[SCRAPER] Final validation rejected:', heroHeadline)
    heroHeadline = null
  }

  console.log(`[SCRAPER] ${domain} | method:browserless | headline:"${heroHeadline ?? 'NONE'}" | h1:${extracted.h1Tags.length} | h3:${extracted.h3Tags.length}`)

  return {
    heroHeadline,
    metaTitle: extracted.metaTitle,
    metaDescription: extracted.metaDescription,
    ogTitle: extracted.ogTitle,
    ogDescription: extracted.ogDescription,
    h1Tags: extracted.h1Tags,
    h2Tags: extracted.h2Tags,
    h3Tags: extracted.h3Tags,
    allText: extracted.allText,
    rawHtml,
    method: 'browserless',
    domain,
  }
}

export async function scrapeSite(inputUrl: string): Promise<CombinedExtraction> {
  const scraped = await scrapeUrl(inputUrl)
  const pageUrl = normalizeToHomepage(inputUrl)

  if (!scraped.rawHtml) {
    return {
      pages: [
        {
          url: pageUrl,
          title: scraped.metaTitle,
          metaDescription: scraped.metaDescription,
          headings: [],
          buttons: [],
          navLabels: [],
          sectionParagraphs: scraped.allText ? [scraped.allText.slice(0, 1200)] : [],
          paragraphs: scraped.allText ? [scraped.allText] : [],
          links: [],
          wordCount: scraped.allText ? scraped.allText.split(/\s+/).filter(Boolean).length : 0,
        },
      ],
      pagesAnalyzed: [pageUrl],
    }
  }

  const $ = cheerio.load(scraped.rawHtml)
  const headings = $('h1, h2, h3')
    .map((_, el) => ({
      level: (el.tagName ?? 'h2').toUpperCase(),
      text: stripMarkdown($(el).text().trim()),
    }))
    .get()
    .filter((h) => h.text.length > 0)
    .slice(0, 40)
  const buttons = $('button, a')
    .map((_, el) => stripMarkdown($(el).text().trim()))
    .get()
    .filter(Boolean)
    .slice(0, 30)
  const navLabels = $('nav a, header a')
    .map((_, el) => stripMarkdown($(el).text().trim()))
    .get()
    .filter(Boolean)
    .slice(0, 20)
  const links = $('a[href]')
    .map((_, el) => ({
      text: stripMarkdown($(el).text().trim()),
      href: $(el).attr('href') ?? '',
    }))
    .get()
    .filter((x) => Boolean(x.text && x.href))
    .slice(0, 30)

  const paragraphs = scraped.allText ? [scraped.allText] : []
  const sectionParagraphs = scraped.allText
    ? scraped.allText
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.trim().length > 20)
        .slice(0, 15)
    : []

  return {
    pages: [
      {
        url: pageUrl,
        title: scraped.metaTitle,
        metaDescription: scraped.metaDescription,
        headings,
        buttons,
        navLabels,
        sectionParagraphs,
        paragraphs,
        links,
        wordCount: scraped.allText ? scraped.allText.split(/\s+/).filter(Boolean).length : 0,
      },
    ],
    pagesAnalyzed: [pageUrl],
  }
}
