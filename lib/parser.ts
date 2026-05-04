import * as cheerio from "cheerio";
import type { SiteType } from "./reportSchema";
import { finalizeHeroHeadline } from "@/lib/heroHeadlineFinalize";

export interface ParsedPage {
  url: string;
  title: string;
  metaDescription: string;
  heroHeadline?: string | null;
  headings: { level: string; text: string }[];
  buttons: string[];
  paragraphs: string[];
  /** First 200 words per section (section = block between H2/H3) */
  sectionParagraphs: string[];
  /** Navigation link labels (from header/nav) */
  navLabels: string[];
  links: { text: string; href: string }[];
  wordCount: number;
}

type ParseOptions = {
  shopifySectionTexts?: string[];
  /** Raw Jina markdown — headline extracted inside parsePage via extractHeadlineFromJinaMarkdown */
  jinaMarkdown?: string | null;
  /** @deprecated Prefer jinaMarkdown; ignored when jinaMarkdown is set */
  jinaHeadline?: string | null;
  ogTitle?: string;
  ogDescription?: string;
  metaDescription?: string;
};

/** Paths we look for when discovering additional pages (first 4 matches) */
const INTERNAL_LINK_PATTERNS = [
  /^\/pricing\/?$/i,
  /^\/about\/?$/i,
  /^\/product\/?$/i,
  /^\/services\/?$/i,
  /^\/faq\/?$/i,
  /^\/features\/?$/i,
];

/**
 * From homepage HTML and base URL, discover internal links matching
 * /pricing, /about, /product, /services, /faq, /features. Returns up to 4 full URLs.
 */
export function discoverInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const out: string[] = [];

  $("a[href]").each((_, el) => {
    if (out.length >= 4) return false; // stop iteration
    const href = $(el).attr("href")?.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const url = new URL(href, base);
      if (url.origin !== base.origin) return;
      const path = url.pathname.replace(/\/$/, "") || "/";
      const matches = INTERNAL_LINK_PATTERNS.some((re) => re.test(path));
      if (!matches) return;
      const key = url.origin + path;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(url.href);
    } catch {
      // ignore invalid URLs
    }
  });

  return out.slice(0, 4);
}

/**
 * Type-specific path patterns (in priority order). We fill slots by matching links.
 * Each entry is a list of regexes; first link matching any wins that slot.
 */
const DISCOVERY_BY_TYPE: Record<SiteType, Array<RegExp[]>> = {
  ecommerce: [
    [/\/products?\/?$/i, /\/collections?\/?$/i],
    [/\/products?\/[^/]+/i, /\/collections?\/[^/]+/i, /\/p\/[^/]+/i],
    [/\/cart\/?/i],
    [/\/checkout\/?/i],
    [/\/about\/?/i],
  ],
  saas: [
    [/\/pricing\/?/i],
    [/\/features\/?/i],
    [/\/about\/?/i, /\/team\/?/i],
    [/\/blog\/?/i, /\/docs\/?/i],
  ],
  service: [
    [/\/services?\/?/i],
    [/\/about\/?/i],
    [/\/contact\/?/i, /\/booking\/?/i],
    [/\/testimonials?\/?/i, /\/results\/?/i],
  ],
  local: [
    [/\/services?\/?/i, /\/menu\/?/i],
    [/\/about\/?/i],
    [/\/contact\/?/i],
    [/\/reviews?\/?/i, /\/gallery\/?/i],
  ],
  content: [
    [/\/blog\/[^/]+/i, /\/articles?\/[^/]+/i, /\/posts?\/[^/]+/i],
    [/\/blog\/[^/]+/i, /\/articles?\/[^/]+/i, /\/posts?\/[^/]+/i],
    [/\/blog\/[^/]+/i, /\/articles?\/[^/]+/i, /\/posts?\/[^/]+/i],
    [/\/about\/?/i],
    [/\/newsletter\/?/i, /\/subscribe\/?/i, /\/subscription\/?/i],
  ],
  unknown: [
    [/\/pricing\/?/i],
    [/\/about\/?/i],
    [/\/product\/?/i, /\/services\/?/i],
    [/\/faq\/?/i, /\/features\/?/i],
  ],
};

/**
 * Discover internal links by site type. Returns full URLs in priority order.
 * ECOMMERCE: /products or /collections, product detail, /cart or /checkout, /about
 * SAAS: /pricing, /features, /about or /team, blog or /docs
 * SERVICE: /services, /about, /contact or /booking, testimonials or /results
 * LOCAL: /services or /menu, /about, /contact, /reviews or /gallery
 * CONTENT: 3 blog/post links, /about, /newsletter or subscription
 */
export function discoverInternalLinksByType(
  html: string,
  baseUrl: string,
  siteType: SiteType
): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  const slots = DISCOVERY_BY_TYPE[siteType];

  const tryPush = (href: string): boolean => {
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    try {
      const url = new URL(href, base);
      if (url.origin !== base.origin) return false;
      const path = url.pathname.replace(/\/$/, "") || "/";
      const key = url.origin + path;
      if (seen.has(key)) return false;
      seen.add(key);
      out.push(url.href);
      return true;
    } catch {
      return false;
    }
  };

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (href) links.push(href);
  });

  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    for (const href of links) {
      let path: string;
      try {
        path = new URL(href, base).pathname.replace(/\/$/, "") || "/";
      } catch {
        continue;
      }
      if (path && slots[slotIndex].some((re) => re.test(path))) {
        if (tryPush(href)) break;
      }
    }
  }

  return out;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; WebDocBot/1.0; +https://webdoc.ai)";

const BLOCKED_EXTENSIONS = /\.(pdf|zip|png|jpg|jpeg|gif|svg|mp4|mp3|exe|dmg)$/i;

export async function fetchAndParsePage(url: string): Promise<ParsedPage> {
  if (BLOCKED_EXTENSIONS.test(url)) {
    throw new Error("URL points to a file, not a web page.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let html: string;
  let finalUrl = url;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    finalUrl = res.url ?? url;

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — page could not be fetched.`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      throw new Error("URL does not return an HTML page.");
    }

    html = await res.text();
  } finally {
    clearTimeout(timeoutId);
  }

  return parsePage(html, finalUrl, {});
}

/** Parse HTML string when you already have the response body. */
export function parseHtml(html: string, url: string, options: ParseOptions = {}): ParsedPage {
  return parsePage(html, url, options);
}

const WORDS_PER_SECTION = 200;

function firstNWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, n).join(" ");
}

function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*_(.+?)_\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#+\s*/, "")
    .trim();
}

function isInvalidHeadline(text: string): boolean {
  if (!text || text.length < 4) return true;
  if (text.includes("![")) return true;
  if (text.includes("](http")) return true;
  if (text.startsWith("[![")) return true;
  if (text.startsWith("[!")) return true;
  if (/^\[.+\]\(.+\)$/.test(text)) return true;
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico)/i.test(text)) return true;
  if (text.includes("cdn/shop")) return true;
  if (text.includes("http://") || text.includes("https://")) return true;
  const bad = [
    /^your cart/i,
    /^collection:/i,
    /^\d+\s*products?/i,
    /^filter/i,
    /^sort by/i,
    /^estimated total/i,
    /^country\/region/i,
    /^have an account/i,
    /^sign in/i,
    /^log in/i,
    /^search/i,
    /^404/i,
    /^page not found/i,
    /^item added/i,
    /^skip to/i,
    /^continue shopping/i,
    /^united states/i,
    /^usd/i,
    /^(home|menu|navigation)$/i,
    /^ascend labs$/i,
  ];
  if (bad.some((p) => p.test(text.trim()))) return true;
  const navLikePhrases = [
    "your cart is empty",
    "have an account",
    "log in",
    "continue shopping",
    "total items in cart",
  ];
  const lower = text.toLowerCase();
  if (navLikePhrases.some((p) => lower.includes(p))) return true;
  return false;
}

export function extractHeadlineFromJinaMarkdown(markdown: string): string | null {
  if (!markdown) return null;
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const contentStart = lines.findIndex(
    (l) =>
      l.startsWith("#") ||
      (l.length > 20 && !l.match(/^(Title|URL|Source|Published):/)),
  );
  const content = contentStart >= 0 ? lines.slice(contentStart) : lines;

  for (const line of content) {
    if (line.startsWith("# ")) {
      const text = stripMarkdownFormatting(line);
      if (!isInvalidHeadline(text)) {
        console.log("[PARSER] H1 winner:", text);
        return text;
      }
    }
  }
  for (const line of content) {
    if (line.startsWith("## ")) {
      const text = stripMarkdownFormatting(line);
      if (!isInvalidHeadline(text)) {
        console.log("[PARSER] H2 winner:", text);
        return text;
      }
    }
  }
  for (const line of content) {
    if (line.startsWith("### ")) {
      const text = stripMarkdownFormatting(line);
      if (!isInvalidHeadline(text)) {
        console.log("[PARSER] H3 winner:", text);
        return text;
      }
    }
  }
  for (const line of content.slice(0, 60)) {
    const text = stripMarkdownFormatting(line);
    if (text.length > 15 && text.length < 150 && !isInvalidHeadline(text)) {
      console.log("[PARSER] body line winner:", text);
      return text;
    }
  }
  console.log("[PARSER] no valid headline found");
  return null;
}

function parsePage(html: string, url: string, options: ParseOptions): ParsedPage {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const ogDescription =
    options.ogDescription?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";
  const metaDescription =
    options.metaDescription?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    ogDescription;

  // Nav labels — from header/nav before removing
  const navLabels: string[] = [];
  const navSeen = new Set<string>();
  $("nav a[href], header a[href], [role=navigation] a[href], .nav a[href], .header a[href]").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50 && !navSeen.has(text.toLowerCase())) {
      navSeen.add(text.toLowerCase());
      navLabels.push(text);
    }
  });
  if (navLabels.length === 0) {
    $("a[href]").each((_, el) => {
      if (navLabels.length >= 15) return false;
      const text = $(el).text().trim();
      if (text && text.length < 40 && !navSeen.has(text.toLowerCase())) {
        navSeen.add(text.toLowerCase());
        navLabels.push(text);
      }
    });
  }

  // Remove non-content elements for body parsing
  $("script, style, noscript, svg, img, [aria-hidden=true]").remove();

  // Headings
  const headings: ParsedPage["headings"] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      headings.push({ level: el.tagName.toUpperCase(), text });
    }
  });

  const h1Tags = $("h1")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h2Tags = $("h2")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const h3Tags = $("h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  // Section paragraphs: split by h2/h3 and take first 200 words per section
  const sectionParagraphs: string[] = [];
  const bodyHtml = $("body").html() ?? "";
  const sections = bodyHtml.split(/\s*<h[23][^>]*>/i).filter(Boolean);
  for (const chunk of sections) {
    const text = chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 20) {
      sectionParagraphs.push(firstNWords(text, WORDS_PER_SECTION));
    }
  }
  if (sectionParagraphs.length === 0) {
    const full = $("body").text().replace(/\s+/g, " ").trim();
    if (full.length > 20) {
      sectionParagraphs.push(firstNWords(full, WORDS_PER_SECTION));
    }
  }

  // Buttons and CTAs
  const buttons: string[] = [];
  const seen = new Set<string>();
  $("button, [role=button], a.btn, a.button, .cta a, a[class*='btn'], a[class*='button'], a[class*='cta']").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 80 && !seen.has(text)) {
      seen.add(text);
      buttons.push(text);
    }
  });
  $("a").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50 && text.split(" ").length <= 6 && !seen.has(text)) {
      seen.add(text);
      buttons.push(text);
    }
  });

  // Paragraphs — meaningful text blocks
  const paragraphs: string[] = [];
  $("p, li").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 40 && text.length < 600) {
      paragraphs.push(text);
    }
  });
  const seen2 = new Set<string>();
  const uniqueParagraphs = paragraphs.filter((p) => {
    if (seen2.has(p)) return false;
    seen2.add(p);
    return true;
  }).slice(0, 20);

  // Links
  const links: ParsedPage["links"] = [];
  $("a[href]").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") ?? "";
    if (text && href && !href.startsWith("#") && links.length < 30) {
      links.push({ text, href });
    }
  });

  const allText = $("body").text().replace(/\s+/g, " ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  const jinaMarkdown =
    options.jinaMarkdown && String(options.jinaMarkdown).trim()
      ? String(options.jinaMarkdown)
      : null;
  const jinaHeadline = jinaMarkdown
    ? extractHeadlineFromJinaMarkdown(jinaMarkdown)
    : null;

  const domH1Candidates = h1Tags
    .map((t) => stripMarkdownFormatting(t))
    .filter((t) => !isInvalidHeadline(t));
  const domH2Candidates = h2Tags
    .map((t) => stripMarkdownFormatting(t))
    .filter((t) => !isInvalidHeadline(t));
  const domH3Candidates = h3Tags
    .map((t) => stripMarkdownFormatting(t))
    .filter((t) => !isInvalidHeadline(t));

  let heroHeadline: string | null =
    jinaHeadline ||
    domH1Candidates[0] ||
    domH2Candidates[0] ||
    domH3Candidates[0] ||
    null;

  const headlinesForFinalize = headings.map((x) => ({
    tag: x.level.toLowerCase(),
    text: x.text,
  }));
  heroHeadline = finalizeHeroHeadline(heroHeadline, headlinesForFinalize);

  return {
    url,
    title,
    metaDescription,
    heroHeadline,
    headings: headings.slice(0, 30),
    buttons: buttons.slice(0, 20),
    paragraphs: uniqueParagraphs,
    sectionParagraphs: sectionParagraphs.slice(0, 15),
    navLabels: navLabels.slice(0, 20),
    links: links.slice(0, 20),
    wordCount,
  };
}
