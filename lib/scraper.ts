import axios from 'axios'
import * as cheerio from 'cheerio'

const SCRAPING_FISH_KEY = process.env.SCRAPING_FISH_API_KEY
const ZENROWS_KEY = process.env.ZENROWS_API_KEY

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

// -- HEADLINE EXTRACTION FROM JINA MARKDOWN ----------------------------
export function extractHeadlineFromMarkdown(markdown: string): string | null {
  if (!markdown) return null
  const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean)
  const start = lines.findIndex(l => l.startsWith('#') || (l.length > 20 && !l.match(/^(Title|URL|Source|Published):/)))
  const content = start >= 0 ? lines.slice(start) : lines

  for (const prefix of ['# ', '## ', '### ']) {
    for (const line of content) {
      if (line.startsWith(prefix)) {
        const text = stripMarkdown(line)
        if (!isInvalidHeadline(text) && text.length > 4) {
          console.log(`[SCRAPER] headline from ${prefix.trim()}:`, text)
          return text
        }
      }
    }
  }

  for (const line of content.slice(0, 60)) {
    const text = stripMarkdown(line)
    if (text.length > 15 && text.length < 150 && !isInvalidHeadline(text)) {
      console.log('[SCRAPER] headline from body:', text)
      return text
    }
  }
  return null
}

// -- SCRAPING FISH (PRIMARY JS RENDERER) -------------------------------
const SCRAPING_FISH_BASE = 'https://scraping.narf.ai/api/v1/'
const SCRAPING_FISH_TIMEOUT_MS = 45_000

async function fetchWithScrapingFish(url: string, waitTimeout: number = 3000): Promise<string | null> {
  if (!SCRAPING_FISH_KEY) {
    console.log('[SCRAPER] ScrapingFish key not configured')
    return null
  }
  const endpoint = `${SCRAPING_FISH_BASE}?api_key=${encodeURIComponent(SCRAPING_FISH_KEY)}&url=${encodeURIComponent(url)}&render_js=true&wait_for_timeout=${waitTimeout}`
  console.log('[SCRAPER] ScrapingFish request:', {
    requestUrl: `${SCRAPING_FISH_BASE}?api_key=(redacted)&url=${encodeURIComponent(url)}&render_js=true&wait_for_timeout=${waitTimeout}`,
  })
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SCRAPING_FISH_TIMEOUT_MS)
    const res = await fetch(endpoint, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      const errBody = await res.text()
      console.log(
        '[SCRAPER] ScrapingFish failed:',
        res.status,
        'body:',
        errBody.slice(0, 800)
      )
      return null
    }
    const html = await res.text()
    if (html.length < 200) { console.log('[SCRAPER] ScrapingFish returned too little'); return null }
    console.log('[SCRAPER] ScrapingFish success:', html.length, 'chars')
    return html
  } catch (err) {
    console.log('[SCRAPER] ScrapingFish error:', err instanceof Error ? err.message : err)
    return null
  }
}

// -- JINA READER (MARKDOWN FALLBACK) -----------------------------------
async function fetchWithJina(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(`https://r.jina.ai/${url}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/markdown',
        'X-Timeout': '12',
        'X-Remove-Selector': 'nav,footer,.cart,.cart-drawer,[class*="cart"],[class*="drawer"]',
      }
    })
    clearTimeout(timeout)
    if (!res.ok || res.status !== 200) return null
    const text = await res.text()
    if (text.length < 500) return null
    console.log('[SCRAPER] Jina success:', text.length, 'chars')
    return text
  } catch {
    console.log('[SCRAPER] Jina failed')
    return null
  }
}

// -- RAW HTML FALLBACK --------------------------------------------------
async function fetchRawHtml(url: string): Promise<string | null> {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebDocBot/1.0)' }
    })
    return typeof res.data === 'string' ? res.data : null
  } catch {
    console.log('[SCRAPER] Raw HTML fetch failed')
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
  jinaMarkdown: string | null
  method: 'scrapingfish' | 'jina' | 'raw'
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
  
  let heroHeadline: string | null = null
  let jinaMarkdown: string | null = null
  let rawHtml = ''
  let method: ScrapeResult['method'] = 'raw'
  let htmlExtracted: ReturnType<typeof extractFromHtml> | null = null

  // -- ATTEMPT 1: ScrapingFish (JS rendered, 3s wait) --
  let fishHtml = await fetchWithScrapingFish(url, 3000)

  // -- ATTEMPT 1b: ScrapingFish retry (5s wait for slower JS apps) --
  if (!fishHtml) {
    fishHtml = await fetchWithScrapingFish(url, 5000)
    if (fishHtml) console.log('[SCRAPER] ScrapingFish retry (5s) succeeded')
  }

  if (fishHtml) {
    rawHtml = fishHtml
    method = 'scrapingfish'
    htmlExtracted = extractFromHtml(fishHtml)
    heroHeadline = selectHeadlineFromHtml(htmlExtracted, domain)
    console.log('[SCRAPER] ScrapingFish headline:', heroHeadline)
  }

  // -- ATTEMPT 2: Jina (markdown, good for text extraction) --
  if (!heroHeadline) {
    jinaMarkdown = await fetchWithJina(url)
    if (jinaMarkdown) {
      if (method === 'raw') method = 'jina'
      const jinaHeadline = extractHeadlineFromMarkdown(jinaMarkdown)
      if (jinaHeadline) heroHeadline = jinaHeadline
      console.log('[SCRAPER] Jina headline:', heroHeadline)
    }
  }

  // -- ATTEMPT 3: Raw HTML --
  if (!rawHtml) {
    const raw = await fetchRawHtml(url)
    if (raw) {
      rawHtml = raw
      htmlExtracted = extractFromHtml(raw)
      if (!heroHeadline) {
        heroHeadline = selectHeadlineFromHtml(htmlExtracted, domain)
      }
    }
  }

  // -- FINAL VALIDATION --
  if (heroHeadline && isInvalidHeadline(heroHeadline)) {
    console.log('[SCRAPER] Final validation rejected:', heroHeadline)
    heroHeadline = null
  }

  const extracted = htmlExtracted ?? (rawHtml ? extractFromHtml(rawHtml) : {
    h1Tags: [], h2Tags: [], h3Tags: [],
    metaTitle: '', metaDescription: '', ogTitle: '', ogDescription: '', allText: ''
  })

  console.log(`[SCRAPER] ${domain} | method:${method} | headline:"${heroHeadline ?? 'NONE'}" | h1:${extracted.h1Tags.length} | h3:${extracted.h3Tags.length}`)

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
    jinaMarkdown,
    method,
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
