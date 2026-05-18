/**
 * POST /api/analyze — Full scanner pipeline.
 * Body: { url: string }
 * Phases: URL validation → site type detection → page discovery → parallel scrape → AI analysis.
 * Scrape: Tier 1 Axios + Cheerio (always first); Tier 2 Puppeteer stealth only if Axios throws or non-2xx; same ExtractedPage shape.
 * Rate limit: 3 scans/hour per IP. Paragraph truncation: 1500 chars.
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import pLimit from "p-limit";
import Anthropic from "@anthropic-ai/sdk";
import {
  validateAndNormalizeUrl,
  detectSiteType,
  discoverPages,
  extractPageData,
  truncatePageParagraphs,
  type SiteTypeLabel,
  type ExtractedPage,
} from "@/lib/analyzePipeline";
import {
  finalizeHeroHeadline,
  isInvalidMarkdownHeroHeadline,
} from "@/lib/heroHeadlineFinalize";
import DIAGNOSTIC_CHECKS, {
  type DiagnosticCheck,
} from "@/lib/diagnosticRubric";
import { calculateDimensionScores } from "@/lib/revenueDimensions";
import type { PageExtraction } from "@/lib/extractionSchema";
import {
  curateFindings,
  enrichRubricFailures,
  enrichedFindingToLeak,
  computeGrowthScoreFromRubric,
  sortByRevenuePriority,
  type RubricResultRow,
} from "@/lib/processFindings";
import { generateOverviewCopy } from "@/lib/generateOverviewCopy";
import {
  CONVERSION_INTELLIGENCE_SHORT_PROMPT_OVERVIEW,
  CONVERSION_INTELLIGENCE_USER_PROMPT_JSON_APPENDIX,
  RUBRIC_EVALUATION_SYSTEM_PROMPT,
} from "@/lib/prompts";
import type { OverviewCopy } from "@/lib/reportSchema";
import { scrapeUrl } from "@/lib/scraper";

/** Tier 2 browser handle (shape only; no puppeteer package imports). */
type Tier2Page = {
  evaluateOnNewDocument(fn: () => void): Promise<void>;
  setUserAgent(u: string): Promise<void>;
  setViewport(v: { width: number; height: number }): Promise<void>;
  setExtraHTTPHeaders(h: Record<string, string>): Promise<void>;
  goto(
    url: string,
    opts: { waitUntil: "networkidle2"; timeout: number }
  ): Promise<unknown>;
  content(): Promise<string>;
  close(): Promise<void>;
};

type Tier2Browser = {
  newPage(): Promise<Tier2Page>;
  close(): Promise<void>;
};

/** Ensures StealthPlugin is applied once (runtime only). */
let stealthPluginApplied = false;

const AI_MODEL = "claude-sonnet-4-6";

/** Vercel serverless: maxDuration + memory are set in vercel.json for this route. */
export const maxDuration = 60;

// Rate limit: 3 per hour per IP (in-memory for MVP)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfterMinutes: number } {
  const now = Date.now();
  let times = rateLimitMap.get(ip) ?? [];
  times = times.filter((t) => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_LIMIT) {
    const oldest = Math.min(...times);
    const retryAfterMs = RATE_WINDOW_MS - (now - oldest);
    return { ok: false, retryAfterMinutes: Math.ceil(retryAfterMs / 60000) };
  }
  times.push(now);
  rateLimitMap.set(ip, times);
  return { ok: true };
}

/** Tier 1: realistic desktop Chrome UA + English (no cookies). */
const TIER1_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Tier 2 stealth browser (matches user agent string). */
const STEALTH_BROWSER_UA = TIER1_BROWSER_UA;

const TIER2_VIEWPORT = { width: 1280, height: 800 } as const;
const TIER2_NAV_TIMEOUT_MS = 60_000;
const TIER2_POST_IDLE_MS = 2000;

const EXTRA_CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-blink-features=AutomationControlled",
] as const;

async function fetchPageWithAxios(
  targetUrl: string
): Promise<{ html: string; success: boolean }> {
  try {
    const res = await axios.get(targetUrl, {
      headers: {
        "User-Agent": TIER1_BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 18_000,
      maxRedirects: 5,
      responseType: "text",
      decompress: true,
      withCredentials: false,
      /** Inspect status in-handler: Tier 2 only runs on throw or non-2xx. */
      validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) {
      return { html: "", success: false };
    }
    const data = res.data;
    const html = typeof data === "string" ? data : "";
    return { html, success: true };
  } catch {
    return { html: "", success: false };
  }
}

async function fetchPageWithJina(
  targetUrl: string
): Promise<{ markdown: string; success: boolean }> {
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(jinaUrl, {
      method: "GET",
      headers: { Accept: "text/markdown" },
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await res.text();
    if (!res.ok || body.trim().length <= 200) {
      return { markdown: "", success: false };
    }
    return { markdown: body, success: true };
  } catch {
    return { markdown: "", success: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJinaScreenshot(
  targetUrl: string
): Promise<{ base64: string; mediaType: "image/png"; success: boolean }> {
  const screenshotUrl = `https://s.jina.ai/${targetUrl}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(screenshotUrl, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { base64: "", mediaType: "image/png", success: false };
    const arrayBuffer = await res.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    return { base64: base64Image, mediaType: "image/png", success: true };
  } catch {
    return { base64: "", mediaType: "image/png", success: false };
  } finally {
    clearTimeout(timeout);
  }
}

/** True if Cheerio sees any non-whitespace text (Tier 1 is usable — skip Puppeteer). */
function cheerioHasExtractableText(html: string): boolean {
  try {
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const text = $.root().text().replace(/\s+/g, " ").trim();
    return text.length > 0;
  } catch {
    return false;
  }
}

async function launchStealthBrowser(): Promise<Tier2Browser> {
  const puppeteer = (await import("puppeteer-extra")).default;
  const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default;
  const chromium = (await import("@sparticuz/chromium")).default;

  if (!stealthPluginApplied) {
    puppeteer.use(StealthPlugin());
    stealthPluginApplied = true;
  }

  if (process.env.VERCEL) {
    chromium.setGraphicsMode = false;
  }

  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (await chromium.executablePath());

  const args = [...new Set([...chromium.args, ...EXTRA_CHROMIUM_ARGS])];

  const browser = (await puppeteer.launch({
    args: puppeteer.defaultArgs({
      args,
      headless: "shell",
    }),
    defaultViewport: TIER2_VIEWPORT,
    executablePath,
    headless: "shell",
  })) as Tier2Browser;

  return browser;
}

/**
 * Tier 2: stealth Chromium, anti-automation tweaks, networkidle2 + settle wait.
 */
async function fetchPageWithStealth(
  browser: Tier2Browser,
  targetUrl: string
): Promise<{ html: string; success: boolean }> {
  const page = await browser.newPage();
  try {
    await page.evaluateOnNewDocument(() => {
      try {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
          configurable: true,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (navigator as any).webdriver;
      } catch {
        /* ignore */
      }
    });
    await page.setUserAgent(STEALTH_BROWSER_UA);
    await page.setViewport(TIER2_VIEWPORT);
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: TIER2_NAV_TIMEOUT_MS,
    });
    await new Promise((r) => setTimeout(r, TIER2_POST_IDLE_MS));
    const html = await page.content();
    if (html && html.length > 200) {
      return { html, success: true };
    }
  } catch (e) {
    console.error("[analyze] Stealth fetch failed:", targetUrl, e);
  } finally {
    await page.close().catch(() => {});
  }
  return { html: "", success: false };
}

function safeExtractLinkHrefs(html: string, url: string): string[] {
  try {
    const $ = cheerio.load(html);
    const linkHrefs: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      if (
        href &&
        !href.startsWith("#") &&
        !href.startsWith("mailto:") &&
        !href.startsWith("tel:")
      ) {
        linkHrefs.push(href);
      }
    });
    return linkHrefs;
  } catch (err) {
    console.error("Cheerio link extraction failed for", url, err);
    return [];
  }
}

/** Ancestor class/id/tag names for hero H1 scoring (substring match on joined string). */
const HERO_BAD_CONTEXT = [
  "nav",
  "header",
  "modal",
  "auth",
  "cart",
  "account",
  "login",
  "sidebar",
] as const;
const HERO_GOOD_CONTEXT = [
  "hero",
  "main",
  "landing",
  "home",
  "banner",
  "intro",
  "above-fold",
] as const;

function ancestorClassIdString($: cheerio.CheerioAPI, el: unknown): string {
  const parts: string[] = [];
  let node: any = el;
  let depth = 0;
  while (node && node.type === "tag" && depth < 32) {
    const tagName =
      typeof node.name === "string" ? node.name.toLowerCase() : "";
    const cls = node.attribs?.class ?? "";
    const id = node.attribs?.id ?? "";
    parts.push(`${tagName} ${cls} ${id}`);
    node = node.parent;
    depth++;
  }
  return parts.join(" ").toLowerCase();
}

function hasBadHeroContext(s: string): boolean {
  return HERO_BAD_CONTEXT.some((m) => s.includes(m));
}

function hasGoodHeroContext(s: string): boolean {
  return HERO_GOOD_CONTEXT.some((m) => s.includes(m));
}

/** Text in the H1's parent excluding the H1 itself (paragraphs, buttons, links nearby). */
function parentContextScore($: cheerio.CheerioAPI, el: unknown): number {
  const $h = $(el as any);
  const parent = $h.parent();
  if (!parent.length) return 0;
  const total = parent.text().replace(/\s+/g, " ").trim().length;
  const h1len = $h.text().replace(/\s+/g, " ").trim().length;
  return Math.max(0, total - h1len);
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function isPromotionalHeadline(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (wordCount(t) < 4) return true;
  if (/^(UP TO|SAVE|GET|FREE|OFF|%)/i.test(t)) return true;
  if (/\b(discount|sale|shipping|order|checkout|off)\b/i.test(t)) return true;
  return false;
}

function siblingContextScore($: cheerio.CheerioAPI, el: unknown): number {
  const $h = $(el as any);
  const parent = $h.parent();
  if (!parent.length) return 0;
  const siblingText = parent
    .children()
    .not($h)
    .text()
    .replace(/\s+/g, " ")
    .trim().length;
  const rich = parent
    .find("p, a, button, [class*='sub'], [class*='copy']")
    .text()
    .replace(/\s+/g, " ")
    .trim().length;
  return Math.min(6000, siblingText + Math.floor(rich * 0.35));
}

function elementAfterFirstNav(
  $: cheerio.CheerioAPI,
  el: unknown,
  firstNav: any | null
): boolean {
  if (!firstNav) return true;
  try {
    const rel = (firstNav as Node).compareDocumentPosition(el as Node);
    return Boolean(rel & Node.DOCUMENT_POSITION_FOLLOWING);
  } catch {
    return true;
  }
}

function nearbyParagraphForElement(
  $: cheerio.CheerioAPI,
  el: unknown
): string | null {
  const badPara = /\b(nav|header|footer|cookie|consent|popup|modal|toast|notification)\b/i;
  const $el = $(el as any);
  const buckets = [
    $el.siblings("p"),
    $el.parent().find("> p"),
    $el.parent().siblings().find("p"),
    $el.closest("section, main, article, div").find("p").slice(0, 8),
  ];
  for (const bucket of buckets) {
    for (const p of bucket.toArray()) {
      const anc = ancestorClassIdString($, p);
      if (badPara.test(anc)) continue;
      const t = $(p).text().replace(/\s+/g, " ").trim();
      if (t.length >= 20) return t;
    }
  }
  return null;
}

function directElementText($: cheerio.CheerioAPI, el: unknown): string {
  const clone = $(el as any).clone();
  clone.children().remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

/**
 * Re-score H1 candidates by ancestor context (deprioritize nav/header/auth/cart;
 * prefer hero/main/banner/…). If none are in hero-like regions, sibling density wins.
 */
function refineHeroHeadline(html: string, extracted: ExtractedPage): ExtractedPage {
  try {
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    const badContext = [
      "nav",
      "header",
      "modal",
      "auth",
      "cart",
      "account",
      "login",
      "sidebar",
      "banner",
      "announcement",
      "promo",
      "sale",
      "discount",
      "topbar",
      "top-bar",
    ] as const;
    const goodContext = [
      "hero",
      "main",
      "landing",
      "home",
      "banner",
      "intro",
      "above-fold",
      "section",
      "content",
      "wrapper",
    ] as const;
    const firstNav =
      $("nav, header nav, [role='navigation'], [class*='nav']").first().get(0) ??
      null;
    const candidates: {
      el: any;
      text: string;
      score: number;
      afterNav: boolean;
      parentClass: string;
      hasGoodContext: boolean;
      hasBadContext: boolean;
    }[] = [];
    $("h1").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (!text || isPromotionalHeadline(text)) return;
      const anc = ancestorClassIdString($, el);
      const hasBad = badContext.some((m) => anc.includes(m));
      const hasGood = goodContext.some((m) => anc.includes(m));
      const afterNav = elementAfterFirstNav($, el, firstNav);
      let score = 0;
      if (hasBad) score -= 12000;
      if (hasGood) score += 7000;
      score += Math.min(parentContextScore($, el), 3000);
      score += Math.min(siblingContextScore($, el), 6000);
      score += Math.min(text.length * 2, 500);
      if (afterNav) score += 300;
      candidates.push({
        el,
        text,
        score,
        afterNav,
        parentClass: ($(el).parent().attr("class") ?? "").toLowerCase(),
        hasGoodContext: hasGood,
        hasBadContext: hasBad,
      });
    });
    const anyGoodContainer = candidates.some((c) => c.hasGoodContext);
    const viableH1 = candidates
      .filter((c) => !c.hasBadContext)
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.afterNav) - Number(a.afterNav) ||
          b.text.length - a.text.length
      );
    const bestH1 = anyGoodContainer
      ? viableH1.find((c) => c.hasGoodContext) ?? viableH1[0]
      : viableH1[0];

    let headline = bestH1?.text ?? null;
    let winnerEl: any = bestH1?.el ?? null;
    let winnerParentClass = bestH1?.parentClass ?? "";

    if (!headline) {
      const h2Candidates = $("h2")
        .toArray()
        .map((el) => {
          const text = $(el).text().replace(/\s+/g, " ").trim();
          const anc = ancestorClassIdString($, el);
          return { el, text, anc };
        })
        .filter(
          (c) =>
            c.text &&
            !isPromotionalHeadline(c.text) &&
            !/\b(nav|header|footer)\b/i.test(c.anc)
        )
        .sort((a, b) => b.text.length - a.text.length);
      if (h2Candidates.length > 0) {
        headline = h2Candidates[0]!.text;
        winnerEl = h2Candidates[0]!.el;
        winnerParentClass = ($(winnerEl).parent().attr("class") ?? "").toLowerCase();
      }
    }

    if (!headline) {
      const fallbackEls = $(
        "[class*='hero'], [id*='hero'], [class*='headline'], [id*='headline']"
      ).toArray();
      const fallback = fallbackEls
        .map((el) => {
          const text = directElementText($, el);
          return { el, text };
        })
        .filter((c) => c.text.length >= 4 && !isPromotionalHeadline(c.text))
        .sort((a, b) => b.text.length - a.text.length)[0];
      if (fallback) {
        headline = fallback.text;
        winnerEl = fallback.el;
        winnerParentClass = ($(winnerEl).parent().attr("class") ?? "").toLowerCase();
      }
    }

    if (!headline) return extracted;
    const nearP = winnerEl ? nearbyParagraphForElement($, winnerEl) : null;
    console.log(
      "[analyze] Hero candidate winner:",
      headline,
      "| parent class:",
      winnerParentClass || "(none)"
    );
    return {
      ...extracted,
      hero: {
        ...extracted.hero,
        headline,
        subheadline: nearP ?? extracted.hero.subheadline,
        bodyText: nearP ?? extracted.hero.bodyText,
      },
    };
  } catch {
    return extracted;
  }
}

function computeLikelyNavElement(headline: string | null | undefined): boolean {
  if (headline == null || headline === "") return true;
  const h = headline.toLowerCase();
  const navLikePhrases = [
    "your cart is empty",
    "have an account",
    "log in",
    "continue shopping",
    "total items in cart",
  ];
  if (navLikePhrases.some((p) => h.includes(p))) return true;
  if (h.includes("your cart")) return true;
  if (h.includes("checkout")) return true;
  if (/\b(sign\s*in|log\s*in|login)\b/i.test(headline)) return true;
  return false;
}

/** Best H1 is nav/auth/cart language — do not treat as marketing headline. */
function isBadAuthNavHeadlineText(text: string): boolean {
  if (!text || !text.trim()) return false;
  const h = text.toLowerCase().trim();
  if (computeLikelyNavElement(text)) return true;
  if (h === "cart" || h === "checkout" || h === "account") return true;
  if (h === "my account" || /\bmy\s+account\b/.test(h)) return true;
  return false;
}

function dedupeContentFragments(frags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of frags) {
    const s = raw.replace(/\s+/g, " ").trim();
    if (s.length < 2) continue;
    const key = s.toLowerCase().slice(0, 280);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function parseMarkdownLinks(markdown: string): Array<{ text: string; href: string }> {
  const out: Array<{ text: string; href: string }> = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) != null) {
    out.push({ text: (m[1] ?? "").trim(), href: (m[2] ?? "").trim() });
  }
  return out;
}

function safeExtractLinkHrefsFromMarkdown(markdown: string): string[] {
  return parseMarkdownLinks(markdown)
    .map((x) => x.href)
    .filter(Boolean);
}

function parseJinaMeta(markdown: string, key: "Title" | "Description"): string {
  const re = new RegExp(`^\\s*${key}:\\s*(.+)$`, "im");
  const m = markdown.match(re);
  return (m?.[1] ?? "").trim();
}

function extractJinaHeading(
  lines: string[]
): { text: string | null; line: number; tag: "h1" | "h2" | null } {
  const navGuard = /\b(navigation|menu|cart|account)\b/i;
  let firstH2: { text: string; line: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      const txt = (h1[1] ?? "").trim();
      if (!txt || isPromotionalHeadline(txt)) continue;
      let blocked = false;
      for (let j = Math.max(0, i - 5); j < i; j++) {
        if (navGuard.test(lines[j] ?? "")) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return { text: txt, line: i, tag: "h1" };
    }
    if (!firstH2) {
      const h2 = line.match(/^##\s+(.+)$/);
      if (h2) {
        const txt = (h2[1] ?? "").trim();
        if (txt && !isPromotionalHeadline(txt)) firstH2 = { text: txt, line: i };
      }
    }
  }
  if (firstH2) return { text: firstH2.text, line: firstH2.line, tag: "h2" };
  return { text: null, line: -1, tag: null };
}

function extractJinaSubheadline(lines: string[], headingLine: number): string {
  if (headingLine < 0) return "";
  for (let i = headingLine + 1; i <= Math.min(lines.length - 1, headingLine + 10); i++) {
    const t = (lines[i] ?? "").replace(/\s+/g, " ").trim();
    if (!t || /^#{1,6}\s+/.test(t)) continue;
    if (t.length >= 20) return t;
  }
  return "";
}

function extractJinaNavigation(lines: string[], firstHeadingLine: number): string[] {
  const nav: string[] = [];
  const end = firstHeadingLine >= 0 ? firstHeadingLine : Math.min(lines.length, 60);
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  for (let i = 0; i < end; i++) {
    const line = (lines[i] ?? "").trim();
    if (!line) continue;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(line)) != null) {
      const text = (m[1] ?? "").replace(/\s+/g, " ").trim();
      if (text && wordCount(text) < 4) nav.push(text);
    }
  }
  return dedupeContentFragments(nav).slice(0, 20);
}

function extractJinaCta(markdown: string): { text: string; href: string } {
  const ctaWord = /\b(shop|buy|get|start|try|order|explore)\b/i;
  const head = markdown.slice(0, Math.floor(markdown.length * 0.4));
  const links = parseMarkdownLinks(head);
  const bestLink = links.find((l) => ctaWord.test(l.text));
  if (bestLink) return { text: bestLink.text, href: bestLink.href };
  const bold = head.match(/\*\*([^*]{2,80})\*\*/g) ?? [];
  const boldText = bold
    .map((s) => s.replace(/^\*\*|\*\*$/g, "").trim())
    .find((t) => ctaWord.test(t));
  if (boldText) return { text: boldText, href: "" };
  return { text: "", href: "" };
}

function extractFromJinaMarkdown(
  markdown: string,
  url: string,
  pageType: string
): ExtractedPage {
  const lines = markdown.split(/\r?\n/);
  const heading = extractJinaHeading(lines);
  const title = parseJinaMeta(markdown, "Title");
  const description = parseJinaMeta(markdown, "Description");
  const subheadline = extractJinaSubheadline(lines, heading.line);
  const cta = extractJinaCta(markdown);
  const navItems = extractJinaNavigation(lines, heading.line);
  const headings = lines
    .map((line) => line.trim())
    .filter((line) => /^#{1,4}\s+/.test(line))
    .slice(0, 50)
    .map((line) => {
      const m = line.match(/^(#{1,4})\s+(.+)$/)!;
      return { tag: `h${m[1].length}`, text: (m[2] ?? "").trim() };
    });

  const paraChunks = lines
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 15 && !/^#{1,6}\s+/.test(l));
  const paragraphs = paraChunks.join(" ").slice(0, 4000);
  const wordCountTotal = paragraphs.split(/\s+/).filter(Boolean).length;

  const reviewCount = markdown.match(/\b(\d{1,3}(?:,\d{3})*)\s+reviews?\b/i)?.[1] ?? "";
  const starRating =
    markdown.match(/★+/)?.[0] ??
    markdown.match(/\b\d(?:\.\d+)?\s*\/\s*5\b/)?.[0] ??
    "";
  const trustMentions = Array.from(
    markdown.matchAll(/\b(guarantee|certified|trusted|as seen in)\b/gi)
  ).map((m) => m[1] ?? "");
  const testimonialMatches = Array.from(markdown.matchAll(/["“]([^"”]{30,})["”]/g))
    .slice(0, 8)
    .map((m) => ({ text: (m[1] ?? "").trim(), author: "Unknown", result: "" }));

  const out: ExtractedPageWithNavFlag = {
    url,
    pageType,
    headlines: headings,
    sections: [],
    paragraphs,
    buttons: cta.text
      ? [{ text: cta.text, type: "link", href: cta.href, isAboveFold: true }]
      : [],
    hero: {
      headline: heading.text,
      subheadline,
      ctaText: cta.text,
      ctaHref: cta.href,
      bodyText: subheadline,
    },
    pricing: [],
    testimonials: testimonialMatches,
    socialProof: {
      reviewCount,
      starRating,
      clientLogos: [],
      pressLogos: [],
      certifications: [],
      customerCount: "",
    },
    navigation: navItems,
    meta: {
      title,
      description,
      ogTitle: "",
      ogDescription: "",
      canonical: "",
    },
    trust: trustMentions.map((t) => ({ text: t, type: "trust_mention" })),
    images: [],
    forms: [],
    wordCount: wordCountTotal,
    h1Count: headings.filter((h) => h.tag === "h1").length,
    ctaCount: cta.text ? 1 : 0,
    hasPhoneNumber: /\+?\d[\d\s().-]{7,}/.test(markdown),
    hasEmailAddress: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(markdown),
    hasAddress: /\b(street|st\.|ave|avenue|road|rd|suite|zip)\b/i.test(markdown),
    structured_data: [],
    likely_nav_element: computeLikelyNavElement(heading.text),
  };
  return out as ExtractedPage;
}

function applyHeroQualityGate(
  extracted: ExtractedPage,
  source: "jina" | "cheerio",
  origin: string,
  confidenceHint: "high" | "medium" | "low"
): ExtractedPage {
  let hero = extracted.hero?.headline ?? null;
  let warning: string | null = null;
  if (typeof hero === "string" && hero.trim()) {
    if (wordCount(hero) < 4) warning = "Hero headline may be incorrect (under 4 words).";
    if (isPromotionalHeadline(hero)) hero = null;
  } else {
    hero = null;
  }
  const nextBest =
    extracted.headlines?.find((h) => {
      const txt = (h?.text ?? "").trim();
      return (
        txt &&
        !isPromotionalHeadline(txt) &&
        wordCount(txt) >= 4 &&
        !isInvalidMarkdownHeroHeadline(txt)
      );
    })?.text ?? null;
  if (hero == null && nextBest) hero = nextBest;
  hero = finalizeHeroHeadline(hero, extracted.headlines);
  const finalHero = hero ?? null;
  const confidence: "high" | "medium" | "low" = finalHero ? confidenceHint : "low";
  const updated: ExtractedPageWithNavFlag = {
    ...(extracted as ExtractedPageWithNavFlag),
    hero: { ...extracted.hero, headline: finalHero },
    raw_content_fragments: warning
      ? dedupeContentFragments([...(extracted.raw_content_fragments ?? []), `[warning] ${warning}`])
      : extracted.raw_content_fragments,
  };
  console.log(
    `[analyze] source=${source} hero="${finalHero ?? "null"}" origin=${origin} confidence=${confidence}`
  );
  return updated as ExtractedPage;
}

function extractPageDataComprehensive(
  html: string,
  url: string,
  baseExtracted: ExtractedPage,
  jinaMarkdown?: string
): PageExtraction {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const domain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const fullPageText = $("body").text().replace(/\s+/g, " ").trim();
  const h1Tags = $("h1")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const h2Tags = $("h2")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const h3Tags = $("h3")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const firstH2Idx = $("h2").first().length ? $("*").index($("h2").first()) : -1;
  const firstH3Idx = $("h3").first().length ? $("*").index($("h3").first()) : -1;
  const headingHierarchyValid =
    h1Tags.length === 1 && !(firstH3Idx >= 0 && firstH2Idx >= 0 && firstH3Idx < firstH2Idx);

  let heroHeadline =
    finalizeHeroHeadline(
      baseExtracted.hero?.headline ?? null,
      baseExtracted.headlines,
      { logFinal: false }
    ) ?? "";
  const heroSubheadline = baseExtracted.hero?.subheadline ?? "";
  const heroCtaText = Array.from(
    new Set((baseExtracted.buttons ?? []).map((b) => (b?.text ?? "").trim()).filter(Boolean))
  );
  const heroContainer = $(
    "[class*='hero'], [id*='hero'], main section:first-of-type, header + section, header + div"
  ).first();
  const heroHasImage = heroContainer.find("img").length > 0;
  const heroImageAltText = (heroContainer.find("img").first().attr("alt") ?? "").trim();
  const heroText = heroContainer.text().replace(/\s+/g, " ").trim();
  const heroSocialProofText =
    heroText.match(/\d+[\s,]+reviews?|★|\d+\.\d+\s*stars?|trusted by/i)?.[0] ?? "";
  const heroHasSocialProof = Boolean(heroSocialProofText);
  const heroGuaranteeText =
    heroText.match(/guarantee|money.back|refund|return/gi)?.join(" ") ?? "";
  const heroHasGuarantee = Boolean(heroGuaranteeText);

  const actionWords = /\b(shop|buy|get|start|try|order|add|subscribe|join|claim|grab|discover)\b/i;
  const allCtaTexts = Array.from(
    new Set(
      $("button, a")
        .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
        .get()
        .filter((t) => t && actionWords.test(t))
    )
  );
  const hasStickyCta = $("[style*='position:sticky'], [style*='position:fixed']")
    .filter((_, el) => $(el).find("button, a").length > 0)
    .length > 0;
  const ctaPositions = [
    heroCtaText.length > 0 ? "hero" : "",
    (baseExtracted.testimonials?.length ?? 0) > 0 ? "after-testimonials" : "",
    (baseExtracted.pricing?.length ?? 0) > 0 ? "after-pricing" : "",
    $("footer button, footer a").length > 0 ? "footer" : "",
  ].filter(Boolean);

  const navItems = Array.from(
    new Set(
      $("nav a, header a")
        .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
        .get()
        .filter((t) => t && wordCount(t) < 5)
    )
  );
  const footerLinks = Array.from(
    new Set(
      $("footer a")
        .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
        .get()
        .filter(Boolean)
    )
  );
  const hasLiveChat = /tawk\.to|intercom|drift|crisp|tidio|gorgias|zendesk/i.test(html);

  const testimonials = (baseExtracted.testimonials ?? []).map((t) => ({
    text: t.text ?? "",
    authorName: t.author ?? "",
    authorRole: "",
    hasPhoto: false,
    hasSpecificResult: /\d+%|\d+x|in \d+ (days?|weeks?|months?)/i.test(t.text ?? ""),
    resultText: t.result ?? "",
  }));
  const hasNamedTestimonials = testimonials.some((t) => Boolean(t.authorName));
  const hasPhotoTestimonials = false;
  const hasVideoTestimonials = $("video, iframe[src*='youtube'], iframe[src*='vimeo']").length > 0;

  const pricesFound = Array.from(new Set(fullPageText.match(/\$[\d,]+\.?\d*/g) ?? []));
  const discountPercentages = Array.from(
    new Set(fullPageText.match(/\d+%\s*off/gi) ?? [])
  );
  const bnplProviders = Array.from(
    new Set((fullPageText.match(/afterpay|klarna|shop pay install|zip|sezzle|affirm/gi) ?? []).map((s) => s.toLowerCase()))
  );
  const freeShippingMatch = fullPageText.match(/[^.]*free shipping[^.]*/i)?.[0] ?? "";

  const internalLinks = Array.from(
    new Set(
      $("a[href]")
        .map((_, el) => $(el).attr("href") ?? "")
        .get()
        .filter((href) => href.startsWith("/") || href.includes(domain))
    )
  );

  const weCount = (fullPageText.match(/\b(we|our|us)\b/gi) ?? []).length;
  const youCount = (fullPageText.match(/\b(you|your)\b/gi) ?? []).length;
  const brandCentricRatio = weCount + youCount > 0 ? weCount / (weCount + youCount) : 0;
  const urgencyTexts = Array.from(
    new Set(fullPageText.match(/today only|limited time|ends (soon|sunday|monday|tonight)|only \d+ (hours?|days?) left|flash sale/gi) ?? [])
  );
  const scarcityTexts = Array.from(
    new Set(fullPageText.match(/only \d+ left|selling fast|low stock|almost gone|limited (stock|quantity|edition)/gi) ?? [])
  );
  const specificResultTexts = Array.from(
    new Set(fullPageText.match(/[A-Z][^.]*?(\d+%|\d+ (pounds?|lbs?|kg)|in \d+ (days?|weeks?|months?)|within \d+)[^.]*\./gi) ?? [])
  );
  const sentences = fullPageText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const avgWordsPerSentence =
    sentences.length > 0
      ? sentences.reduce((sum, s) => sum + wordCount(s), 0) / sentences.length
      : 0;
  const readingLevelEstimate =
    avgWordsPerSentence < 8
      ? "elementary"
      : avgWordsPerSentence < 12
        ? "middle"
        : avgWordsPerSentence < 17
          ? "high-school"
          : "college";

  const schemaTypes = $('script[type="application/ld+json"]')
    .map((_, el) => {
      try {
        const json = JSON.parse($(el).html() ?? "{}");
        const t = json?.["@type"];
        if (typeof t === "string") return [t];
        if (Array.isArray(t)) return t.filter((x) => typeof x === "string");
      } catch {
        return [];
      }
      return [];
    })
    .get()
    .flat();
  const imageSrcs = $("img")
    .map((_, el) => $(el).attr("src") ?? "")
    .get()
    .filter(Boolean);
  const imageFormats = Array.from(
    new Set(
      imageSrcs
        .map((src) => src.split("?")[0] ?? "")
        .map((src) => src.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "")
        .filter(Boolean)
    )
  );
  const thirdPartyScriptDomains = Array.from(
    new Set(
      $("script[src]")
        .map((_, el) => $(el).attr("src") ?? "")
        .get()
        .filter((src) => /^https?:\/\//i.test(src))
        .map((src) => {
          try {
            return new URL(src).hostname;
          } catch {
            return "";
          }
        })
        .filter((h) => h && !h.includes(domain))
    )
  );
  const scriptCount = $("script").length;
  const thirdPartyScriptCount = thirdPartyScriptDomains.length;
  const pageWeightSignal =
    scriptCount > 30 || thirdPartyScriptCount > 10
      ? "heavy"
      : scriptCount > 15 || thirdPartyScriptCount > 5
        ? "moderate"
        : "light";

  const majorSections = ["hero", "social-proof", "trust", "features", "how-it-works", "testimonials", "pricing", "cta", "faq", "footer"];
  const pageSectionOrder = $("section, main > div, footer")
    .map((_, el) => {
      const sig = `${$(el).attr("id") ?? ""} ${$(el).attr("class") ?? ""}`.toLowerCase();
      return majorSections.find((s) => sig.includes(s)) ?? "";
    })
    .get()
    .filter(Boolean);
  const firstCtaEl = $("button, a")
    .filter((_, el) => actionWords.test($(el).text()))
    .first();
  const ctaAppearsBeforeSection =
    firstCtaEl.length > 0
      ? pageSectionOrder.find(() => true) ?? "unknown"
      : "none";

  const extraction: PageExtraction = {
    url,
    domain,
    pageTitle: $("title").text().trim(),
    metaDescription: $('meta[name="description"]').attr("content") ?? "",
    canonicalUrl: $('link[rel="canonical"]').attr("href") ?? "",
    language: $("html").attr("lang") ?? "",
    hasSSLSignal: url.startsWith("https"),
    h1Tags,
    h2Tags,
    h3Tags,
    headingHierarchyValid,
    heroHeadline,
    heroSubheadline,
    heroCtaText,
    heroHasImage,
    heroImageAltText,
    heroHasSocialProof,
    heroSocialProofText,
    heroHasGuarantee,
    heroGuaranteeText,
    allCtaTexts,
    ctaCount: allCtaTexts.length,
    hasStickyCta,
    ctaPositions,
    navItems,
    navItemCount: navItems.length,
    hasSearchBar:
      $("input[type='search'], input[placeholder*='search' i]").length > 0,
    navHasCta: $("nav button, nav a").filter((_, el) => actionWords.test($(el).text())).length > 0,
    footerLinks,
    footerHasContact: footerLinks.some((t) => /contact/i.test(t)),
    footerHasAbout: footerLinks.some((t) => /about/i.test(t)),
    footerHasShippingPolicy: footerLinks.some((t) => /shipping/i.test(t)),
    footerHasReturnPolicy: footerLinks.some((t) => /return|refund/i.test(t)),
    footerHasPrivacyPolicy: footerLinks.some((t) => /privacy/i.test(t)),
    hasBreadcrumbs:
      $("[aria-label*='breadcrumb' i], .breadcrumb, [itemtype*='BreadcrumbList']").length > 0,
    hasLiveChat,
    hasGuarantee: /(\d+).day.*(guarantee|money.back|refund)|satisfaction.guarantee|risk.free/i.test(fullPageText),
    guaranteeText: fullPageText.match(/[^.]{0,120}(guarantee|money back|refund|risk free)[^.]{0,120}/i)?.[0] ?? "",
    guaranteeLocation: heroHasGuarantee ? "hero" : /footer/i.test(fullPageText) ? "footer" : "none",
    hasNamedTestimonials,
    hasPhotoTestimonials,
    hasVideoTestimonials,
    testimonials,
    hasPressLogos: /as seen in|featured in|press/i.test(fullPageText),
    pressLogosText: Array.from(new Set((fullPageText.match(/forbes|vogue|cnn|fox|nytimes|techcrunch/gi) ?? []))),
    hasCertifications: /certified|approved|tested|gmp|fda|organic/i.test(fullPageText),
    certificationTexts: Array.from(new Set((fullPageText.match(/certified|approved|tested|gmp|fda|organic/gi) ?? []))),
    hasFounderStory: /founded by|our founder|i created|i started|my story/i.test(fullPageText),
    hasBeforeAfter: /before|after|results/i.test(fullPageText),
    hasTrustBadgesNearCta: /secure checkout|ssl|safe checkout|trusted/i.test(fullPageText),
    hasCustomerCount: /\d[\d,]+\+?\s*(customers?|people|users?|clients?)|trusted by/i.test(fullPageText),
    customerCountText: fullPageText.match(/\d[\d,]+\+?\s*(customers?|people|users?|clients?)/i)?.[0] ?? "",
    reviewPlatforms: Array.from(new Set((fullPageText.match(/trustpilot|google reviews|yotpo|judge\.me/gi) ?? []))),
    unsubstantiatedClaims: Array.from(new Set((fullPageText.match(/clinically proven|scientifically proven|dermatologist approved|doctor recommended|fda approved/gi) ?? []))),
    aggregateRating: Number(fullPageText.match(/(\d(?:\.\d+)?)\s*\/\s*5/)?.[1] ?? "0"),
    reviewCount: Number((fullPageText.match(/(\d[\d,]*)\s+reviews?/i)?.[1] ?? "0").replace(/,/g, "")),
    hasReviewCount: /\d[\d,]*\s+reviews?/i.test(fullPageText),
    hasUGC: /customer photo|ugc|tag us|real customer/i.test(fullPageText),
    hasCaseStudies: /case study|success story|transformation/i.test(fullPageText),
    socialFollowerCount: fullPageText.match(/\d[\d,]+\s*(followers|subscribers)/i)?.[0] ?? "",
    hasInfluencerMentions: /influencer|celebrity|creator/i.test(fullPageText),
    pricesFound,
    hasPricing: pricesFound.length > 0,
    hasOriginalPriceStrikethrough: /<s>|\bwas\s+\$/i.test(html),
    discountPercentages,
    hasSubscriptionOption: /subscribe|auto.ship|recurring|subscription/i.test(fullPageText),
    hasBundleOption: /bundle|kit|pack|set|combo/i.test(fullPageText),
    hasFreeShippingMention: /free shipping/i.test(fullPageText),
    freeShippingThreshold: freeShippingMatch,
    hasBnpl: bnplProviders.length > 0,
    bnplProviders,
    hasFirstOrderIncentive: /welcome|first order|new customer|first purchase/i.test(fullPageText),
    firstOrderIncentiveText: fullPageText.match(/[^.]{0,120}(welcome|first order|new customer|first purchase)[^.]{0,120}/i)?.[0] ?? "",
    hasEmailCapture: $("input[type='email'], form").length > 0 || /subscribe|sign up|join|newsletter/i.test(fullPageText),
    emailCaptureIncentive: fullPageText.match(/[^.]{0,120}(subscribe|sign up|newsletter)[^.]{0,120}/i)?.[0] ?? "",
    hasExitIntent: /exit.intent|exit_intent|popup/i.test(html),
    hasSmsCapture: /text|sms|mobile number|phone number/i.test(fullPageText),
    hasLoyaltyProgram: /loyalty|rewards|points|earn/i.test(fullPageText),
    hasReferralProgram: /refer|referral|tell a friend/i.test(fullPageText),
    hasPostPurchaseUpsell: /frequently bought|order bump|you may also/i.test(fullPageText),
    internalLinks,
    hasReviewsPage: internalLinks.some((p) => /review|testimonial|results/i.test(p)),
    hasWhyUsPage: internalLinks.some((p) => /why-us|compare|versus|difference/i.test(p)),
    hasFaqPage: internalLinks.some((p) => /faq|questions/i.test(p)),
    hasHowItWorksPage: internalLinks.some((p) => /how-it-works|ingredients|science|formula/i.test(p)),
    hasAboutPage: internalLinks.some((p) => /about/i.test(p)),
    hasBlogOrContent: internalLinks.some((p) => /blog|journal|articles|learn|education/i.test(p)),
    hasResultsGallery: internalLinks.some((p) => /results|before|after|gallery/i.test(p)),
    hasQuizOrFinder: internalLinks.some((p) => /quiz|finder|match|recommend/i.test(p)),
    hasBundlePage: internalLinks.some((p) => /bundle|kit|pack/i.test(p)),
    hasLoyaltyPage: internalLinks.some((p) => /loyalty|rewards/i.test(p)),
    hasPressPage: internalLinks.some((p) => /press|media/i.test(p)),
    hasCommunityPage: internalLinks.some((p) => /community|group|forum/i.test(p)),
    fullPageText: jinaMarkdown?.trim() ? jinaMarkdown : fullPageText,
    firstFoldText: $("main, section, div")
      .slice(0, 3)
      .text()
      .replace(/\s+/g, " ")
      .trim(),
    weCount,
    youCount,
    brandCentricRatio,
    hasUrgencyLanguage: urgencyTexts.length > 0,
    urgencyTexts,
    hasScarcityLanguage: scarcityTexts.length > 0,
    scarcityTexts,
    hasCountdownTimer: /countdown|timer|data-countdown/i.test(html),
    hasProblemStatement: /struggling with|tired of|frustrated by|if you have|do you suffer/i.test(fullPageText),
    problemStatementText: fullPageText.match(/[^.]{0,120}(struggling with|tired of|frustrated by|if you have|do you suffer)[^.]{0,120}/i)?.[0] ?? "",
    hasAspirationLanguage: /imagine|future|become|transform|confidence|better/i.test(fullPageText),
    hasLossAversionLanguage: /don't miss|stop (losing|struggling|suffering)|risk of|without (treatment|help)/i.test(fullPageText),
    hasUniqueaMechanism: /[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+(complex|method|formula|system)/.test(fullPageText),
    uniqueMechanismText: fullPageText.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s+(complex|method|formula|system)/)?.[0] ?? "",
    hasComparisonLanguage: /unlike (other|most|traditional)|compared to|better than|versus/i.test(fullPageText),
    hasSpecificResultClaims: specificResultTexts.length > 0,
    specificResultTexts,
    readingLevelEstimate,
    hasFeaturesWithoutBenefits: /contains|includes|features|specifications/i.test(fullPageText) && !/helps|so you can|so that you/i.test(fullPageText),
    hasObjectionHandling: /what if|not sure|skeptical|doesn't work|worried about|safe to use|side effects/i.test(fullPageText),
    objectionHandlingTexts: Array.from(new Set((fullPageText.match(/[^.]{0,100}(what if|not sure|skeptical|doesn't work|worried about|safe to use|side effects)[^.]{0,100}/gi) ?? []))),
    hasSchemaMarkup: $('script[type="application/ld+json"]').length > 0,
    schemaTypes: Array.from(new Set(schemaTypes as string[])),
    imageCount: $("img").length,
    imagesWithAltText: $("img[alt]")
      .filter((_, el) => (($(el).attr("alt") ?? "").trim().length > 0))
      .length,
    imagesWithoutAltText: 0,
    imageFormats,
    hasLazyLoading: $("img[loading='lazy']").length > 0,
    scriptCount,
    thirdPartyScriptCount,
    thirdPartyScriptDomains,
    hasCdnSignals: /cdn|cloudfront|fastly|akamai|imgix|cdn\.shopify/i.test(html),
    hasWebpImages: imageSrcs.some((s) => /\.webp(\?|$)/i.test(s)),
    hasRenderBlockingSignals:
      $("head script[src]:not([async]):not([defer])").length > 0,
    viewportMetaPresent: $("meta[name='viewport']").length > 0,
    pageWeightSignal,
    hasProductDescription: /description|product-desc|ingredients|benefits/i.test(fullPageText),
    productDescriptionText: fullPageText.slice(0, 800),
    descriptionLeadsWithBenefit: /\byou\b|helps|so you can|reduce|improve/i.test(fullPageText.split(/[.!?]/)[0] ?? ""),
    hasUsageInstructions: /how to use|directions|apply|usage|step \d/i.test(fullPageText),
    hasResultsTimeline: /see results in|within \d+ (days?|weeks?)|expect results/i.test(fullPageText),
    hasComparisonTable: $("table").length > 0,
    hasComplementaryProducts: /frequently bought|pairs well|complete (the|your)|you may also/i.test(fullPageText),
    hasProductReviews: /review|testimonial/i.test(fullPageText),
    productImageCount: $("img").length,
    hasLifestyleImages: /lifestyle|model|real life|in use/i.test(fullPageText),
    hasProductVideo: $("video, iframe[src*='youtube'], iframe[src*='vimeo']").length > 0,
    hasProductFaq: /faq|frequently asked/i.test(fullPageText),
    paymentMethodsVisible: Array.from(new Set((fullPageText.match(/visa|mastercard|amex|paypal|apple pay|google pay|shop pay/gi) ?? []))),
    hasGuestCheckoutSignal: /guest checkout|continue as guest|no account/i.test(fullPageText),
    hasSecureCheckoutBadge: /secure checkout|ssl|256.bit|safe checkout/i.test(fullPageText),
    checkoutStepCount: /\bstep\s+\d\b/gi.test(fullPageText) ? (fullPageText.match(/\bstep\s+\d\b/gi) ?? []).length : 0,
    hasProgressIndicator: /progress|step \d of \d|checkout progress/i.test(fullPageText),
    hasOrderSummary: /order summary|subtotal|total/i.test(fullPageText),
    hasMobileViewport: /width=device-width/i.test($("meta[name='viewport']").attr("content") ?? ""),
    hasHorizontalScroll: /overflow-x\s*:\s*(auto|scroll)/i.test(html),
    mobileNavType: /hamburger|menu-toggle|menu icon|three lines/i.test(html) ? "hamburger" : $("nav").length > 0 ? "full" : "none",
    hasAmpVersion: /<html[^>]+amp|rel=["']amphtml["']/i.test(html),
    estimatedMobileFriendly:
      /width=device-width/i.test($("meta[name='viewport']").attr("content") ?? "") &&
      !/overflow-x\s*:\s*(auto|scroll)/i.test(html),
    formFieldsWithLabels: $("input:not([type='hidden'])")
      .filter((_, el) => {
        const id = $(el).attr("id");
        return Boolean(id && $(`label[for='${id}']`).length > 0);
      })
      .length,
    formFieldsWithoutLabels: 0,
    hasAriaLabels: $("[aria-label], [aria-labelledby]").length > 0,
    colorOnlyInformation: /required.*red|sale.*color/i.test(fullPageText),
    pageSectionOrder,
    ctaAppearsBeforeSection,
    pageEndsWithCta: /cta|button|shop now|buy now|get started/i.test(($("footer").prev().text() ?? "").toLowerCase()),
    hasSectionWhitespace: /margin-top|margin-bottom|padding-top|padding-bottom/i.test(html),
  };
  extraction.imagesWithoutAltText = extraction.imageCount - extraction.imagesWithAltText;
  extraction.formFieldsWithoutLabels =
    $("input:not([type='hidden'])").length - extraction.formFieldsWithLabels;
  return extraction;
}

function formatExtractionForClaude(data: PageExtraction): string {
  return `
PAGE IDENTITY
URL: ${data.url}
Title: ${data.pageTitle}
Meta Description: ${data.metaDescription}
Language: ${data.language}
SSL: ${data.hasSSLSignal}

HEADINGS
H1 Tags: ${data.h1Tags.join(" | ")}
H2 Tags: ${data.h2Tags.slice(0, 10).join(" | ")}
Heading hierarchy valid: ${data.headingHierarchyValid}

HERO SECTION
Hero Headline: ${data.heroHeadline}
Hero Subheadline: ${data.heroSubheadline}
Hero CTA Texts: ${data.heroCtaText.join(", ")}
Hero Has Image: ${data.heroHasImage}
Hero Image Alt: ${data.heroImageAltText}
Hero Has Social Proof: ${data.heroHasSocialProof} — ${data.heroSocialProofText}
Hero Has Guarantee: ${data.heroHasGuarantee} — ${data.heroGuaranteeText}

ALL CTA BUTTONS (${data.ctaCount} found)
${data.allCtaTexts.join(", ")}
Has Sticky CTA: ${data.hasStickyCta}
CTA Positions: ${data.ctaPositions.join(", ")}

NAVIGATION
Nav Items (${data.navItemCount}): ${data.navItems.join(", ")}
Has Search: ${data.hasSearchBar}
Footer Has: Contact=${data.footerHasContact} About=${data.footerHasAbout} Shipping=${data.footerHasShippingPolicy} Returns=${data.footerHasReturnPolicy} Privacy=${data.footerHasPrivacyPolicy}
Has Breadcrumbs: ${data.hasBreadcrumbs}
Has Live Chat: ${data.hasLiveChat}

TRUST SIGNALS
Has Guarantee: ${data.hasGuarantee} — Location: ${data.guaranteeLocation}
Guarantee Text: ${data.guaranteeText}
Has Named Testimonials: ${data.hasNamedTestimonials}
Has Photo Testimonials: ${data.hasPhotoTestimonials}
Has Video Testimonials: ${data.hasVideoTestimonials}
Testimonials Found: ${data.testimonials.length}
${data.testimonials
    .slice(0, 5)
    .map(
      (t) =>
        `  - "${t.text.slice(0, 120)}" — ${t.authorName || "Anonymous"} | Specific result: ${t.hasSpecificResult} | ${t.resultText}`
    )
    .join("\n")}
Has Press Logos: ${data.hasPressLogos} — ${data.pressLogosText.join(", ")}
Has Certifications: ${data.hasCertifications} — ${data.certificationTexts.join(", ")}
Has Founder Story: ${data.hasFounderStory}
Has Before/After: ${data.hasBeforeAfter}
Trust Badges Near CTA: ${data.hasTrustBadgesNearCta}
Customer Count: ${data.hasCustomerCount} — ${data.customerCountText}
Review Platforms: ${data.reviewPlatforms.join(", ")}
Aggregate Rating: ${data.aggregateRating} from ${data.reviewCount} reviews
Review Count Visible: ${data.hasReviewCount}
Unsubstantiated Claims: ${data.unsubstantiatedClaims.join(" | ")}

PRICING & OFFER
Prices Found: ${data.pricesFound.join(", ")}
Has Pricing Visible: ${data.hasPricing}
Has Strikethrough Price: ${data.hasOriginalPriceStrikethrough}
Discount Percentages: ${data.discountPercentages.join(", ")}
Has Subscription Option: ${data.hasSubscriptionOption}
Has Bundle Option: ${data.hasBundleOption}
Free Shipping: ${data.hasFreeShippingMention} — ${data.freeShippingThreshold}
Has BNPL: ${data.hasBnpl} — ${data.bnplProviders.join(", ")}
Has First Order Incentive: ${data.hasFirstOrderIncentive} — ${data.firstOrderIncentiveText}

EMAIL & RETENTION
Has Email Capture: ${data.hasEmailCapture} — Incentive: ${data.emailCaptureIncentive}
Has Exit Intent: ${data.hasExitIntent}
Has SMS Capture: ${data.hasSmsCapture}
Has Loyalty Program: ${data.hasLoyaltyProgram}
Has Referral Program: ${data.hasReferralProgram}

PAGE INVENTORY
Internal Pages Detected: ${data.internalLinks.slice(0, 20).join(", ")}
Has Reviews Page: ${data.hasReviewsPage}
Has Why Us Page: ${data.hasWhyUsPage}
Has FAQ Page: ${data.hasFaqPage}
Has How It Works Page: ${data.hasHowItWorksPage}
Has About Page: ${data.hasAboutPage}
Has Blog: ${data.hasBlogOrContent}
Has Results Gallery: ${data.hasResultsGallery}
Has Quiz: ${data.hasQuizOrFinder}
Has Bundle Page: ${data.hasBundlePage}

COPY ANALYSIS
Brand-Centric Ratio: ${data.brandCentricRatio.toFixed(2)} (we/our/us vs you/your — above 0.6 is brand-centric)
Has Urgency Language: ${data.hasUrgencyLanguage} — ${data.urgencyTexts.join(", ")}
Has Scarcity Language: ${data.hasScarcityLanguage} — ${data.scarcityTexts.join(", ")}
Has Countdown Timer: ${data.hasCountdownTimer}
Has Problem Statement: ${data.hasProblemStatement} — ${data.problemStatementText}
Has Loss Aversion: ${data.hasLossAversionLanguage}
Has Unique Mechanism: ${data.hasUniqueaMechanism} — ${data.uniqueMechanismText}
Has Comparison Language: ${data.hasComparisonLanguage}
Has Specific Result Claims: ${data.hasSpecificResultClaims}
Specific Results: ${data.specificResultTexts.join(" | ")}
Reading Level: ${data.readingLevelEstimate}
Has Features Without Benefits: ${data.hasFeaturesWithoutBenefits}
Has Objection Handling: ${data.hasObjectionHandling} — ${data.objectionHandlingTexts.slice(0, 3).join(" | ")}
Has Aspiration Language: ${data.hasAspirationLanguage}
Page Ends With CTA: ${data.pageEndsWithCta}
Page Section Order: ${data.pageSectionOrder.join(" → ")}

SEO & TECHNICAL
Has Schema Markup: ${data.hasSchemaMarkup} — Types: ${data.schemaTypes.join(", ")}
Images: ${data.imageCount} total, ${data.imagesWithAltText} with alt text, ${data.imagesWithoutAltText} without
Image Formats: ${data.imageFormats.join(", ")}
Has Lazy Loading: ${data.hasLazyLoading}
Has WebP Images: ${data.hasWebpImages}
Script Count: ${data.scriptCount} total, ${data.thirdPartyScriptCount} third-party
Third Party Scripts: ${data.thirdPartyScriptDomains.join(", ")}
Has CDN: ${data.hasCdnSignals}
Render Blocking Scripts: ${data.hasRenderBlockingSignals}
Page Weight Signal: ${data.pageWeightSignal}
Viewport Meta: ${data.viewportMetaPresent}

PRODUCT PAGE
Has Product Description: ${data.hasProductDescription}
Description Leads With Benefit: ${data.descriptionLeadsWithBenefit}
Has Usage Instructions: ${data.hasUsageInstructions}
Has Results Timeline: ${data.hasResultsTimeline}
Has Comparison Table: ${data.hasComparisonTable}
Has Complementary Products: ${data.hasComplementaryProducts}
Has Product Reviews: ${data.hasProductReviews}
Product Image Count: ${data.productImageCount}
Has Lifestyle Images: ${data.hasLifestyleImages}
Has Product Video: ${data.hasProductVideo}

CHECKOUT & PAYMENT
Payment Methods Visible: ${data.paymentMethodsVisible.join(", ")}
Has Guest Checkout Signal: ${data.hasGuestCheckoutSignal}
Has Secure Checkout Badge: ${data.hasSecureCheckoutBadge}

MOBILE
Has Mobile Viewport: ${data.hasMobileViewport}
Mobile Nav Type: ${data.mobileNavType}
Estimated Mobile Friendly: ${data.estimatedMobileFriendly}

ACCESSIBILITY
Form Fields With Labels: ${data.formFieldsWithLabels}
Form Fields Without Labels: ${data.formFieldsWithoutLabels}
Has ARIA Labels: ${data.hasAriaLabels}

FULL PAGE TEXT (first 3000 characters for copy analysis):
${data.fullPageText.slice(0, 3000)}
  `.trim();
}

/**
 * Fallback copy when hero.headline is null (bad H1): promos, upper strong/b,
 * non-nav paragraphs, CTAs, title tag.
 */
function buildRawContentFragments(html: string, extracted: ExtractedPage): string[] {
  const frags: string[] = [];
  try {
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();

    const promoSelector = [
      "[class*='banner']",
      "[class*='promo']",
      "[class*='announcement']",
      "[class*='offer']",
      "[class*='sale']",
      "[class*='hero']",
      "[class*='above-fold']",
      "[class*='above_fold']",
    ].join(", ");
    $(promoSelector).each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length > 5 && t.length < 1200) frags.push(`[promotional/hero region] ${t}`);
    });

    const $body = $("body");
    const kids = $body.children().toArray();
    const mid = Math.max(1, Math.ceil(kids.length / 2));
    for (let i = 0; i < mid; i++) {
      $(kids[i]!)
        .find("strong, b")
        .each((_, el) => {
          const t = $(el).text().replace(/\s+/g, " ").trim();
          if (t.length > 1 && t.length < 400) frags.push(`[upper-body strong/emphasis] ${t}`);
        });
    }

    let n = 0;
    $("p").each((_, el) => {
      if (n >= 3) return false;
      const anc = ancestorClassIdString($, el);
      if (
        /(^|\s)(nav|header|footer|sidebar)(\s|$)/i.test(anc) ||
        (hasBadHeroContext(anc) && !hasGoodHeroContext(anc))
      ) {
        return;
      }
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length > 20) {
        frags.push(`[body paragraph ${n + 1}] ${t}`);
        n++;
      }
      return undefined;
    });

    for (const b of extracted.buttons ?? []) {
      const t = (b?.text ?? "").trim();
      if (t) frags.push(`[CTA] ${t}`);
    }

    const title = (extracted.meta?.title ?? $("title").first().text() ?? "").trim();
    if (title) frags.push(`[title tag] ${title}`);
  } catch {
    /* ignore */
  }
  return dedupeContentFragments(frags).slice(0, 80);
}

function applyBadAuthNavHeadlineAndFragments(
  html: string,
  extracted: ExtractedPage,
  pageType: string
): ExtractedPage {
  if (pageType !== "homepage") return extracted;
  const hl = extracted.hero.headline;
  if (hl == null) return extracted;
  if (!isBadAuthNavHeadlineText(hl)) return extracted;
  return {
    ...extracted,
    hero: { ...extracted.hero, headline: null },
    raw_content_fragments: buildRawContentFragments(html, extracted),
  };
}

type ExtractedPageWithNavFlag = ExtractedPage & { likely_nav_element?: boolean };

function safeExtract(html: string, url: string, pageType: string): ExtractedPage {
  try {
    const extracted = extractPageData(html, url, pageType);
    const refined =
      pageType === "homepage" ? refineHeroHeadline(html, extracted) : extracted;
    const withFragments =
      pageType === "homepage"
        ? applyBadAuthNavHeadlineAndFragments(html, refined, pageType)
        : refined;
    const truncated = truncatePageParagraphs(withFragments);
    if (pageType === "homepage") {
      const out: ExtractedPageWithNavFlag = {
        ...truncated,
        likely_nav_element: computeLikelyNavElement(truncated.hero.headline),
      };
      return out as ExtractedPage;
    }
    return truncated;
  } catch (err) {
    console.error("Cheerio extraction failed for", url, err);
    const fallback: ExtractedPageWithNavFlag = {
      url,
      pageType,
      headlines: [],
      sections: [],
      paragraphs: "Content extraction failed for this page.",
      buttons: [],
      hero: {
        headline: "",
        subheadline: "",
        ctaText: "",
        ctaHref: "",
        bodyText: "",
      },
      pricing: [],
      testimonials: [],
      socialProof: {
        reviewCount: "",
        starRating: "",
        clientLogos: [],
        pressLogos: [],
        certifications: [],
        customerCount: "",
      },
      navigation: [],
      meta: {
        title: "",
        description: "",
        ogTitle: "",
        ogDescription: "",
        canonical: "",
      },
      trust: [],
      images: [],
      forms: [],
      wordCount: 0,
      h1Count: 0,
      ctaCount: 0,
      hasPhoneNumber: false,
      hasEmailAddress: false,
      hasAddress: false,
      structured_data: [],
      ...(pageType === "homepage" ? { likely_nav_element: false } : {}),
    };
    return fallback as ExtractedPage;
  }
}

async function fetchPageHybrid(
  pageUrl: string,
  pageType: string,
  browserRef: { current: Tier2Browser | null }
): Promise<{
  url: string;
  html: string;
  success: boolean;
  error?: string;
  source?: "jina" | "cheerio";
  extracted?: ExtractedPage;
}> {
  const jina = await fetchPageWithJina(pageUrl);
  if (jina.success) {
    const heading = extractJinaHeading(jina.markdown.split(/\r?\n/));
    const jinaConfidence: "high" | "medium" | "low" =
      heading.tag === "h1" ? "high" : heading.tag === "h2" ? "medium" : "low";
    const extracted = applyHeroQualityGate(
      extractFromJinaMarkdown(jina.markdown, pageUrl, pageType),
      "jina",
      `markdown_line_${heading.line >= 0 ? heading.line + 1 : "n/a"}`,
      jinaConfidence
    );
    return {
      url: pageUrl,
      html: jina.markdown,
      success: true,
      source: "jina",
      extracted,
    };
  }
  console.log("[analyze] Jina failed, falling back to Cheerio");

  const ax = await fetchPageWithAxios(pageUrl);
  /**
   * Tier 1 only when HTTP 2xx AND Cheerio sees any visible text.
   * Otherwise Tier 2 (Puppeteer) — avoids long headless runs when HTML is already usable.
   */
  if (ax.success && cheerioHasExtractableText(ax.html)) {
    const extracted = applyHeroQualityGate(
      safeExtract(ax.html, pageUrl, pageType),
      "cheerio",
      "scored_dom_element",
      "medium"
    );
    return {
      url: pageUrl,
      html: ax.html,
      success: true,
      source: "cheerio",
      extracted,
    };
  }

  try {
    if (!browserRef.current) {
      browserRef.current = await launchStealthBrowser();
    }
    const st = await fetchPageWithStealth(browserRef.current, pageUrl);
    if (st.success) {
      const extracted = applyHeroQualityGate(
        safeExtract(st.html, pageUrl, pageType),
        "cheerio",
        "scored_dom_element",
        "medium"
      );
      return {
        url: pageUrl,
        html: st.html,
        success: true,
        source: "cheerio",
        extracted,
      };
    }
  } catch (e) {
    console.error("[analyze] Tier 2 pipeline failed:", pageUrl, e);
  }

  return {
    url: pageUrl,
    html: ax.html || "",
    success: false,
    error: "Could not fetch page",
  };
}

function cleanStructuredPageDataForAi(data: {
  siteType: SiteTypeLabel;
  pages: ExtractedPage[];
  scrape_failed?: boolean;
}) {
  return {
    ...data,
    pages: data.pages.map((p) => {
      const anyP = p as any;
      return {
        ...p,
        buttons:
          Array.isArray(anyP.buttons) && anyP.buttons.length > 0
            ? anyP.buttons
            : "No CTA buttons detected on this page",
        images:
          Array.isArray(anyP.images) && anyP.images.length > 0
            ? anyP.images
            : "No images with alt text detected",
        trust:
          Array.isArray(anyP.trust) && anyP.trust.length > 0
            ? anyP.trust
            : "No trust signals detected",
        testimonials:
          Array.isArray(anyP.testimonials) && anyP.testimonials.length > 0
            ? anyP.testimonials
            : "No testimonials detected — critical trust gap",
        pricing:
          Array.isArray(anyP.pricing) && anyP.pricing.length > 0
            ? anyP.pricing
            : "No pricing information detected",
        paragraphs:
          typeof anyP.paragraphs === "string" &&
          anyP.paragraphs.trim().length > 0
            ? anyP.paragraphs
            : "Minimal text content detected",
      };
    }),
  };
}

function calculateMaxTokens(
  pages: ExtractedPage[],
  scrapeFailed?: boolean
): number {
  if (scrapeFailed) return 1200;
  if (!pages || pages.length === 0) return 2500;
  const totalWords = pages.reduce(
    (sum, p) => sum + (p.wordCount ?? 0),
    0
  );
  // Each finding needs ~200 tokens when concise
  // 15 findings = 3000 tokens + 1500 for other fields
  // Add more for content-rich sites
  if (totalWords > 3000) return 5500;
  if (totalWords > 1000) return 4500;
  return 3500;
}

function parseRubricResponse(raw: string): RubricResultRow[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned) as RubricResultRow[];
  } catch {
    /* continue recovery */
  }

  try {
    const start = cleaned.indexOf("[");
    if (start === -1) throw new Error("No array found");

    let jsonStr = cleaned.slice(start);

    if (!jsonStr.trimEnd().endsWith("]")) {
      const lastComplete = jsonStr.lastIndexOf("},");
      if (lastComplete > -1) {
        jsonStr = jsonStr.slice(0, lastComplete + 1) + "]";
      } else {
        const lastBrace = jsonStr.lastIndexOf("}");
        if (lastBrace > -1) {
          jsonStr = jsonStr.slice(0, lastBrace + 1) + "]";
        }
      }
    }

    const parsed = JSON.parse(jsonStr) as RubricResultRow[];
    console.log(`[analyze] Recovered truncated JSON: ${parsed.length} checks parsed`);
    return parsed;
  } catch {
    /* continue recovery */
  }

  try {
    const objects: RubricResultRow[] = [];
    const objectPattern = /\{[^{}]*"id"\s*:\s*"[^"]+"\s*,[^{}]*\}/g;
    const matches = cleaned.match(objectPattern) || [];
    for (const match of matches) {
      try {
        objects.push(JSON.parse(match) as RubricResultRow);
      } catch {
        /* skip malformed fragment */
      }
    }
    if (objects.length > 0) {
      console.log(`[analyze] Regex-recovered ${objects.length} check objects`);
      return objects;
    }
  } catch {
    /* continue */
  }

  console.log("[analyze] All JSON parse attempts failed, returning empty array");
  return [];
}

const EVALUATE_CHECKS_TIMEOUT_MS = 120_000;

async function evaluateChecks(
  anthropic: Anthropic,
  content: string,
  checks: DiagnosticCheck[],
  vision: {
    used: boolean;
    base64: string;
    mediaType: "image/png";
  },
  batchLabel: string
): Promise<RubricResultRow[]> {
  console.log(
    `[analyze] evaluateChecks START batch=${batchLabel} checksInThisBatch=${checks.length}`
  );
  const rubricText = checks
    .map(
      (c) =>
        `${c.id} | ${c.severity} | ${c.mode} | ${c.title}\nFail condition: ${c.failCondition}${
          c.requiresEvidence ? "\nRequires: quote exact evidence from page." : ""
        }`
    )
    .join("\n\n");

  const systemPrompt = RUBRIC_EVALUATION_SYSTEM_PROMPT;

  const visionNote = vision.used
    ? "A screenshot of the page has been provided for visual analysis.\n\n"
    : "No screenshot available — evaluate based on text content only.\n\n";

  const userPrompt = `${visionNote}PAGE CONTENT:\n${content}\n\nCHECKS TO EVALUATE:\n${rubricText}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    EVALUATE_CHECKS_TIMEOUT_MS
  );

  try {
    const response = await anthropic.messages.create(
      {
        model: AI_MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        messages: vision.used
          ? ([
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: vision.mediaType,
                      data: vision.base64,
                    },
                  },
                  { type: "text", text: userPrompt },
                ],
              },
            ] as any)
          : [{ role: "user", content: userPrompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const block = response.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      console.error(
        `[analyze] evaluateChecks batch=${batchLabel}: no text block in response`
      );
      return [];
    }

    const text = block.text;
    const parsed = parseRubricResponse(text);
    console.log(
      `[analyze] evaluateChecks OK batch=${batchLabel} parsedChecks=${parsed.length}`
    );
    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[analyze] evaluateChecks FAILED batch=${batchLabel} error=${msg}`,
      err
    );
    return [];
  }
}

function buildTrimmedData(
  data: any,
  pages: ExtractedPage[]
): any {
  const totalWords = pages.reduce(
    (sum, p) => sum + (p.wordCount ?? 0),
    0
  );

  // How much body text to send per page
  const paragraphLimit =
    totalWords > 2000 ? 3000 : totalWords > 800 ? 1500 : 600;

  // How many sections to include
  const sectionLimit =
    totalWords > 2000 ? 8 : totalWords > 800 ? 5 : 3;

  return {
    ...data,
    pages: data.pages?.map((p: any, i: number) => ({
      ...p,
      paragraphs:
        typeof p.paragraphs === "string"
          ? p.paragraphs.slice(0, i === 0 ? paragraphLimit : 400)
          : p.paragraphs,
      sections: Array.isArray(p.sections)
        ? p.sections.slice(0, i === 0 ? sectionLimit : 2)
        : p.sections,
      // Always keep these complete regardless of size
      hero: p.hero,
      meta: p.meta,
      buttons: p.buttons,
      headlines: p.headlines,
      testimonials: p.testimonials,
      pricing: p.pricing,
      socialProof: p.socialProof,
      trust: p.trust,
      forms: p.forms,
      // Trim images on additional pages
      images:
        i === 0
          ? p.images
          : Array.isArray(p.images)
            ? p.images.slice(0, 3)
            : p.images,
    })),
  };
}

const SYSTEM_PROMPT_SHORT = `You are Dr. Maya Chen,
a conversion psychologist with 20 years experience.
Your job is to diagnose exactly what is wrong with
a website and why it is costing the owner money.

You are a diagnostician, not a copywriter.
You do not write replacement headlines or copy.
You identify the psychological mechanism that is
failing and explain it with precision.

Think like a doctor reading a patient chart:
- What is the symptom? (what we found)
- What is the diagnosis? (why it fails psychologically)
- What is the treatment category? (what type of fix is needed)

You never write "your new headline should say X."
You write "your headline fails because it triggers
cognitive load before establishing value — the fix
requires leading with the visitor's pain state,
not your product category."

howToFixIt must be a structural or psychological
directive — never finished copy.
Good: 'Rewrite the hero using outcome framing —
name the transformation, not the product.'
Bad: 'Change your headline to: Finally Clear Skin'

exampleFix: Provide a psychological framework
or formula the user can apply in their own brand
voice. Never write finished copy. Never write an
actual headline, CTA, or sentence they should
publish. Instead write:
- A fill-in-the-blank formula:
  '[Pain state] + [qualifier] + [outcome]'
- A named principle to apply:
  'Apply loss aversion framing — lead with what
  the visitor loses by NOT acting before presenting
  your solution'
- A structural directive:
  'Move social proof above the CTA. Position
  guarantee statement within 100px of buy button'
- A diagnostic question that guides the fix:
  'What does your customer lose every day they
  do not have this? Lead with that.'

Maximum 2 frameworks per finding.
Each framework max 2 sentences.
Never write brand-specific copy for them.

Every finding must quote specific text from this page.
Never write generic findings.
Cite named psychological principles with researcher and year.

${CONVERSION_INTELLIGENCE_SHORT_PROMPT_OVERVIEW}`;

const SYSTEM_PROMPT = `You are Dr. Maya Chen — a senior 
conversion psychologist and website growth strategist 
with 20 years of experience. PhD in behavioral economics. 
You have analyzed over 10,000 websites for Fortune 500 
companies, funded startups, and solo founders.

You think in human psychology first, tactics second.
You are direct, specific, and never generic.
You cite named principles with researcher name and year.
You quote actual page content as evidence in every finding.
You write like a $500/hour consultant — confident, 
precise, immediately actionable.

PRIME DIRECTIVE: Every finding must quote specific text 
from THIS page. Never write a finding that could apply 
to any website. No evidence = no finding.

---

PAGE ACCURACY RULE:
If the scraped content shows signs of being
a cart, login, or account page (signals like
'have an account', 'your cart is empty',
'sign in', 'forgot password'), then:

1. Do NOT report cart/login text as the
   hero headline
2. Note in your verdict that the homepage
   could not be fully scraped
3. Base your analysis on what IS available:
   - Meta title and description
   - Any product/brand information visible
   - Navigation structure
   - Any non-cart content found

Never identify 'Have an account?' or similar
login prompts as hero headlines.
Never confuse cart status messages with
value proposition copy.

---

HEADLINE VERIFICATION RULE:
The hero headline detector is imperfect.
Before reporting any headline as the hero:

REJECT these as hero headlines:
- Single words that are navigation items
  (Shop, Accessories, Catalog, Contact, Home,
  About, Blog, Products, Collections, Cart)
- Brand name alone (PawLuxe, Acme, etc)
- Any text under 4 words that matches a
  nav item pattern
- Price text ($49, $99/mo)
- Button text (Buy Now, Add to Cart)

ACCEPT these as hero headline:
- Emotionally resonant statements (4+ words)
- Benefit or outcome statements
- Pain-led or identity statements
- Anything that reads like a marketing headline

If the detected hero.headline is a nav item
or brand name, look through ALL headlines
provided and find the most emotionally
resonant statement 4+ words long.
That is the real hero headline.

In the PawLuxe example:
- 'Accessories' = NAV ITEM, reject
- 'PawLuxe' = BRAND NAME, reject  
- 'Because they deserve the Extraordinary' 
  = HERO HEADLINE, accept

Apply this logic to every site analyzed.

NULL HERO HEADLINE (SCRAPER):
When the user prompt lists hero.headline as null and includes raw_content_fragments,
the scraper deliberately withheld a hero H1 (nav/auth/cart UI). Do NOT describe a
"weak headline," "broken headline," or missing value prop as if a headline string
existed. Derive messaging and verdict from raw_content_fragments, the title tag,
the full headlines list, and CTAs.

HERO CANDIDATE UNCERTAINTY:
The hero headline provided is the best candidate extracted from the page.
If it appears to be navigation or UI chrome rather than marketing copy,
note this uncertainty but still analyze the provided content — do not
assume a technical display error unless there is clear evidence.

When likely_nav_element is true (passed in the user prompt), do not base
your entire diagnosis on the hero headline. Look at the broader page
content provided and analyze what the site actually sells.

---

NO RAW DATA RULE:
Never include raw data, arrays, or JSON in any field.
whyItMatters must be a 2-3 sentence psychological explanation only.

BEFORE WRITING ANY FINDINGS — REASON THROUGH THIS:
(Do not output this reasoning. Use it to sharpen findings.)

1. What is the visitor's emotional state on arrival?
2. What is the single most important action the site wants?
3. Does the hero headline name a pain, outcome, or feature?
4. Is there a clear primary CTA or is the visitor left guessing?
5. What anxiety is the visitor absorbing alone right now?

---

WEAK VS EXCEPTIONAL FINDINGS:

When analyzing, note both:
PROBLEMS: What is failing and why
STRENGTHS: What is working well

For passing findings, be specific about what
the site does well — this earns positive score
contribution.

Examples of passing findings:
- Strong trust signals (money-back guarantee)
- Clear pricing structure
- Good product photography
- Mobile-responsive design
- Fast page load signals
- Specific testimonials with photos/names
- Clear contact information

WEAK (never produce):
"The headline is not very engaging. Headlines are 
important for conversion. Write a better headline."

EXCEPTIONAL (always produce):
"The hero headline reads 'Professional Accounting 
Software for Small Business' — pure feature language 
describing what the product IS, not what the customer 
BECOMES. The subheadline reinforces this with 'Powerful 
features to manage your finances.' Both sentences speak 
to the product, not the visitor's desired transformation.

Visitors arrive with a pain — the anxiety of messy books, 
the fear of tax season. When your headline speaks to 
features instead of that pain, you create a psychological 
mismatch before they read a single sentence. CXL Institute 
research shows outcome-led headlines convert 2.3x better 
than feature-led ones. With an 8-second decision window 
(D'Angelo, 2018), this mismatch ends most visits before 
they begin."

---

7 ANALYSIS CATEGORIES:

PSYCHOLOGY — 8 to 12 findings:
PSY-01: Hero acknowledges visitor pain before solution?
PSY-02: Loss aversion framing present? What do they 
  lose by NOT acting? (Kahneman & Tversky, 1979)
PSY-03: Feature vs outcome language throughout — 
  outcome converts 2.3x better (CXL Institute)
PSY-04: Emotional trigger word density — count words 
  like: finally, stop, avoid, imagine, proven, transform
PSY-05: We/our vs you/your ratio — brand or visitor focus?
PSY-06: Cognitive load — competing CTAs, too many choices
  (Hick's Law — decision time increases with options)
PSY-07: Curiosity gaps — open loops compelling scrolling
  (Zeigarnik Effect — open loops demand completion)
PSY-08: Reciprocity — value given before action asked?
  (Cialdini, Influence, 1984)
PSY-09: Scarcity/urgency — any reason to act now?
  Without urgency, deferred = forgotten
PSY-10: Social identity — specific tribe named?
  Identity-specific copy creates instant belonging

MESSAGING — 6 to 10 findings:
MSG-01: Headline classification — outcome/problem/
  feature/generic. Quote the exact headline found.
MSG-02: 5-second value prop test — clear to a stranger?
MSG-03: Vague superlative audit — quote every 
  "best/premium/world-class/innovative/trusted" found
MSG-04: Subheadline — extends headline or just repeats?
MSG-05: Differentiation — why this over alternatives?
MSG-06: Audience specificity — who exactly is this for?
MSG-07: Benefit hierarchy — best benefits listed first?
MSG-08: Proof of claims — evidence or bare assertions?
MSG-09: Urgency in copy — reason to act now vs later?
MSG-10: Section headlines — selling or just labeling?

CONVERSION — 8 to 12 findings:
CON-01: Primary CTA — quote exact text, assess strength
CON-02: CTA above fold — visible without scrolling?
CON-03: CTA copy — communicates what happens after click?
CON-04: CTA frequency — repeated at decision points?
CON-05: Friction — steps between interest and conversion
  Each extra step costs ~10% conversion (Forrester)
CON-06: Risk reversal — guarantee/free trial near CTA?
  Risk reversal lifts conversion 30-80% (ConversionXL)
CON-07: Offer clarity — 100% clear what they get?
CON-08: Secondary CTA — lower-commitment option present?
CON-09: Pricing transparency — clear or hidden?
  76% of B2B buyers want pricing before contacting
CON-10: Form friction — quote field names, count fields
  Each extra field costs ~5% completion (HubSpot)
CON-11: Mobile conversion path signals
CON-12: Exit intent — any mechanism to capture leavers?

TRUST — 6 to 10 findings:
TRU-01: Social proof density AND proximity to CTAs
  Proof only works proximate to decisions
TRU-02: Proof specificity — quote actual testimonials
  Specific proof converts 3x better than generic
TRU-03: Authority signals — certs, press, awards
TRU-04: Risk reversal mechanisms present?
TRU-05: Contact transparency — phone, address, humans?
  Anonymity is the #1 conversion killer for services
TRU-06: Recency — dated testimonials signal stale business
TRU-07: Trust proximity to each CTA
TRU-08: Client logos for B2B — even one transfers credibility
  (Halo Effect, Thorndike, 1920)
TRU-09: Human visibility — founder/team photos?
  Faces activate the evolved human trust circuit
TRU-10: Security signals near forms and CTAs

SEO — 5 to 7 findings:
SEO-01: Meta title — quote it, assess length and appeal
SEO-02: Meta description — quote it, assess as click ad
SEO-03: H1 search intent alignment — quote the H1
SEO-04: Heading hierarchy — list H1 and H2s found
SEO-05: Content depth — word count assessment
SEO-06: Keyword intent gaps — problem/solution/comparison
SEO-07: Image alt text — cite specific missing alts

UX — 5 to 7 findings:
UX-01: Visual hierarchy — clear focal point above fold?
UX-02: Above-fold real estate — what's visible, enough?
UX-03: Text scannability — paragraph length and bullets
  73% of visitors scan before reading (Nielsen Norman)
UX-04: Navigation cognitive load — count items
  More than 7 triggers choice paralysis (Hick's Law)
UX-05: Persuasive sequence — Problem→Solution→Proof→CTA?
UX-06: White space and section breathing room
UX-07: Mobile structure signals

STRATEGY — 3 to 5 findings:
STR-01: Positioning — quote closest positioning statement
STR-02: Ideal customer specificity — how targeted?
STR-03: Content gaps — name 3 specific content pieces
STR-04: Competitive differentiation — what's defensible?
STR-05: Brand voice consistency across sections

---

ABSENCE = CRITICAL EVIDENCE:

Missing meta description = mandatory SEO WARNING
Zero testimonials = CRITICAL trust finding
Zero CTAs = MULTIPLE critical conversion findings
No trust signals = CRITICAL trust finding
No phone/email for service business = CRITICAL finding
Multiple H1s or missing H1 = WARNING SEO finding

---

WHY IT MATTERS — 4 HARD RULES:

1. ALWAYS name principle + researcher + year
2. ALWAYS explain the psychological mechanism
3. ALWAYS quantify the cost in lost conversions
4. NEVER reference arrays, raw data, or tech fields

---

HERO REWRITE — PSYCHOLOGICAL BRIEF (NOT REPLACEMENT COPY):

The heroRewrite is NOT replacement copy.
It is a psychological brief for the user to
rewrite their own hero section.

currentHeadline: exact quote from page
currentSubheadline: exact quote or 'Not found'
currentCta: exact CTA text or 'No CTA found'

suggestedHeadline: NOT a replacement headline.
Instead write: "3 psychological angles to explore,
each as a framework not final copy:"
Format as:
"1. PAIN-LED: Lead with [specific pain you identified
from their page content]. Open loop that names what
the visitor is trying to escape.
2. OUTCOME-LED: Lead with [specific transformation
their product creates]. Name the after state.
3. IDENTITY-LED: Speak to [specific identity their
customer wants to inhabit based on page signals]."

suggestedSubheadline: A brief that explains what
the subheadline needs to accomplish psychologically,
not the actual copy.

suggestedCta: The psychological principle the CTA
should apply, not the actual words. Example:
"CTA should communicate the immediate next step
and reduce perceived risk — avoid action words
that sound like commitment."

psychologistsNote: 3-4 sentences explaining the
psychological principles at play in their current
hero and what the rewrite needs to achieve.
No actual copy. Pure diagnosis.

---

GROWTH STRATEGY quickWins format:
"[Specific change TYPE] on [specific page location]
— psychological principle: [named principle] —
estimated time: [time]"

Example:
"Add loss aversion framing to hero headline —
Loss Aversion (Kahneman, 1979) — 30 min"

NOT:
"Change your headline to 'Stop losing customers'"

thirtyDayPlan format — week by week:
Week 1: 3 highest-impact quick wins
Week 2: Messaging and copy improvements  
Week 3: Trust and social proof additions
Week 4: SEO and traffic optimizations + measure results

---

SCORING PRECISION RULES:

healthScore must be a precise integer from
0 to 100 that is uniquely calculated for
this specific site.

ANTI-BIAS RULES — READ CAREFULLY:
- Do NOT round to nearest 5 or 10
- Do NOT default to 42, 52, 28, 65, 70
- Do NOT use the same score you used before
- The score must reflect exact site quality
- Two different sites should almost never
  get the same score

HOW TO CALCULATE THE SCORE:

Start at 100. Deduct points for each issue:

CRITICAL ISSUES:
- Missing hero value proposition: -12
- No clear CTA above fold: -10
- Zero social proof/testimonials: -10
- No trust signals: -8
- Hero headline is brand name only: -8
- Broken or misleading navigation: -7

WARNING ISSUES:
- Weak CTA language: -4
- Generic subheadline: -4
- Missing meta description: -5
- No H1 tag: -6
- Anonymous testimonials only: -4
- No pricing clarity: -4
- Missing contact information: -3

POSITIVE ADDITIONS (add these back):
- Clear emotional headline: +5
- Strong trust signals (guarantee, etc): +4
- Real testimonials with names/photos: +5
- Clear pricing: +4
- Fast visible social proof: +4
- Professional product photography: +3
- Clear navigation structure: +3
- Mobile-optimized signals: +3
- Strong meta description: +3
- Logical page flow: +3

Calculate the exact score by:
1. Starting at 100
2. Subtracting each critical issue deduction
3. Subtracting each warning deduction
4. Adding back positive signals found
5. Clamping between 0-100

This produces naturally varied scores:
- A site with 3 critical and 4 warnings
  but good trust signals might score 63
- A site with 1 critical and 2 warnings
  with strong positives might score 74
- A site with 6 criticals and many warnings
  might score 31 or 37 or 44 depending on
  exact deductions

DO NOT ROUND. If calculation gives 67, use 67.
If calculation gives 43, use 43.
If calculation gives 71, use 71.

The score must feel earned and precise —
not estimated or guessed.

categoryScores must also be precise integers:
- Calculate each category independently
- Use the same deduction/addition method
- Category scores should vary from each other
- Never give all categories similar scores
- A site can score 75 trust but 23 conversion
  if trust signals are strong but CTAs are weak

SCORE CALCULATION (WEIGHTS):
Use the category evidence below with these weights:
psychology 20%, messaging 20%, conversion 25%,
trust 15%, seo 10%, ux 10%.

---

MISSING SECTION ANALYSIS:

After analyzing existing content, evaluate the site
against the ideal blueprint for its detected site type
(\`siteType\` / ecommerce, saas, service, local, content).
Any missing high-impact section is a finding with
\`type: "missing"\` and must follow the exact same JSON
structure as other findings (same keys as existing leaks).

Ideal blueprints by site type:

SAAS: hero, value proposition, feature breakdown,
social proof/testimonials, pricing page, FAQ,
case studies, live chat or support CTA, trust badges,
free trial CTA, integration showcase

ECOMMERCE: hero, featured products, reviews/ratings page,
trust badges, return policy, shipping info, size guides,
loyalty program, abandoned cart messaging,
upsell/cross-sell sections

SERVICE: hero, service breakdown, about/team page,
testimonials, case studies, process explanation,
pricing or quote CTA, certifications/awards,
local trust signals, contact/booking page

LOCAL: hero, hours and location, Google reviews integration,
photo gallery, menu or service list,
booking/reservation CTA, local trust signals, staff/team page

CONTENT: hero, featured content, newsletter signup,
author bio/about, category navigation,
social proof (subscriber count), sponsorship/monetization CTA,
search functionality

For each missing section (only if genuinely not detected
anywhere in scraped pages — never fabricate presence):

- id: prefix \`MSN-\` then number (e.g. MSN-01, MSN-02)
- category: assign to the most relevant category
  (CONVERSION, TRUST, PSYCHOLOGY, MESSAGING, SEO, UX, STRATEGY)
- severity: critical if absence directly costs conversions or sales;
  warning if it would meaningfully improve trust or engagement;
  passing only if it is a minor enhancement
- type: \`"missing"\`
- title: \`Missing: [Section Name]\`
- whatWeFound: state clearly this section was not detected
  anywhere on the site (nav, sections, or linked pages in data).
  No fabricated quotes of nonexistent content.
- whyItMatters: psychological and revenue impact of absence;
  cite a named principle (researcher + year where applicable).
- howToFixIt: specific actionable instruction to add or build
  this section.
- exampleFix: copy-paste ready example headline or short block
  illustrating what the section could say (ONLY for type missing;
  this overrides the usual "no finished copy" rule for exampleFix).
- psychologyPrinciple: the named principle this section would leverage
- revenueImpact: 1-10 (impact of this gap)
- effortToFix: low | medium | high
- timeToFix: estimated time string
- page_location: \`"Missing from site entirely"\`

Every non-missing finding must have \`type: "existing"\`.

Minimum 3 missing-section findings per scan. Maximum 8.
Never fabricate that a section exists. Only mark missing if
genuinely not detected from the scraped evidence.

The goal is a complete diagnosis: a perfect score path requires
fixing existing flaws AND addressing high-impact missing sections
for this site type.

Exception to PRIME DIRECTIVE for missing findings only:
whatWeFound must describe absence; do not invent quoted on-page
text for content that does not exist.

---

EXECUTIVE SUMMARY REQUIREMENT:
Write an executiveSummary object with these fields:

verdict: One sentence. The single most important
thing wrong with this site right now. Direct,
specific, no hedging. Quote actual page content.
Example: 'Your hero headline reads only your
brand name — every visitor arrives and immediately
faces a value proposition void.'

diagnosis: 2-3 sentences. The core psychological
and conversion problem in plain English. Name the
mechanisms. Be specific to this site.
No generic advice. No platitudes.

priorityAction: The single highest-leverage thing
to fix first. One sentence. Specific location on
the page. Specific psychological principle.
Example: 'Fix your hero headline first — it is
the only element every visitor sees, and currently
it communicates nothing about what you offer or
why it matters.'

estimatedImpact: A realistic estimate of what
fixing the top 3 critical issues could improve.
Frame as a range. Be honest not optimistic.
Example: 'Addressing your 4 critical findings
could meaningfully improve conversion rate —
industry data suggests fixing value proposition
clarity alone typically lifts conversion 15-35%.'

weekOneActions: An array of exactly 3 specific
actions the user should take this week.
Each action: specific, actionable, references
actual page content found, includes the
psychological principle being applied.
Each action max 2 sentences.
Format: 'Fix [specific element found on page]
using [specific psychological principle] —
this addresses [specific conversion problem].'

NOT generic advice like 'improve your headline.'
MUST reference actual content found on the page.

---

OUTPUT (FINDINGS COUNT):
Generate as many findings as the site genuinely 
warrants. A simple 2-page site may produce 12 focused 
findings. A complex multi-page site may produce 35. 
Never pad findings to hit a number. Never truncate 
findings because of a limit. Write exactly what 
the evidence supports — no more, no less.

RESPONSE LENGTH DISCIPLINE:
You are writing JSON that must fit within a token 
budget. Every field has a strict character limit.
Violating these limits causes JSON truncation which
means the user gets NOTHING.

The hierarchy of priorities:
1. Valid complete JSON (non-negotiable)
2. Accurate specific findings (essential)  
3. Detailed explanations (sacrificed if needed)

Write like a telegram, not an essay. Every word
must earn its place. "Loss aversion absent —
copy never frames cost of inaction" is better
than a 3-sentence explanation of loss aversion.

howToFixIt: Describe the TYPE of fix needed and
the psychological principle it must apply.
Never write the actual copy or content.
howToFixIt must be a structural or psychological
directive — never finished copy.
Good: 'Rewrite the hero using outcome framing —
name the transformation, not the product.'
Bad: 'Change your headline to: Finally Clear Skin'
Example: "Rewrite the hero headline using
loss aversion framing — lead with what the
visitor loses by not acting, not what the
product does."

exampleFix: Provide a psychological framework
or formula the user can apply in their own brand
voice. Never write finished copy. Never write an
actual headline, CTA, or sentence they should
publish. Instead write:
- A fill-in-the-blank formula:
  '[Pain state] + [qualifier] + [outcome]'
- A named principle to apply:
  'Apply loss aversion framing — lead with what
  the visitor loses by NOT acting before presenting
  your solution'
- A structural directive:
  'Move social proof above the CTA. Position
  guarantee statement within 100px of buy button'
- A diagnostic question that guides the fix:
  'What does your customer lose every day they
  do not have this? Lead with that.'

Maximum 2 frameworks per finding.
Each framework max 2 sentences.
Never write brand-specific copy for them.

Findings budget: include 3-8 missing-section findings
(MSN-01 … MSN-08) plus existing flaw findings.
Total leaks: practical maximum 26 (8 missing + 18 existing).
Max 3 findings per category per type (existing vs missing combined).

All string values: concise, specific, under 200 chars unless
the MISSING SECTION rules require a longer exampleFix for
type missing.
Never start a JSON string you cannot finish.

Every finding with type "existing" must quote actual page
content in whatWeFound. type "missing" follows the MISSING
SECTION ANALYSIS rules instead.
Return valid JSON only.
No markdown. No preamble. Start with {
`;

function getSystemPrompt(totalWords: number, scrapeFailed?: boolean): string {
  if (scrapeFailed) {
    return `${SYSTEM_PROMPT_SHORT}

SCRAPE FAILURE MODE:
scrape_failed is true. The URL could not be scraped with enough usable content after HTTP and browser attempts.
You MUST return valid JSON only. Set healthScore to null (or 0 if null is invalid for your schema).
Set leaks to an empty array []. Omit categoryScores or set all to null.
executiveSummary must state clearly that the site could not be analyzed due to scraping failure (bot protection, blocking, or empty response).
Produce ZERO findings. Do not invent page quotes or scores.`;
  }
  // For very simple sites use a focused shorter prompt
  if (totalWords < 500) {
    return SYSTEM_PROMPT_SHORT;
  }
  return SYSTEM_PROMPT;
}

function buildUserPrompt(
  siteType: string,
  pagesAnalyzed: string[],
  data: any,
  limitedContentNote?: string,
  scrapeFailed?: boolean,
  includeVision?: boolean
): string {
  if (scrapeFailed) {
    return `
CRITICAL — SCRAPE FAILED (scrape_failed: true):
Automated fetching did not return enough usable page content (under 300 characters of extractable copy after Tier 1 HTTP and Tier 2 headless browser attempts), or the homepage matched a navigation/login/cart headline heuristic.

Respond with JSON only. Requirements:
- healthScore: null (or 0 if your parser requires a number)
- leaks: []
- executiveSummary.verdict: one clear sentence that the site could not be analyzed because content could not be retrieved reliably.
- executiveSummary.diagnosis: brief explanation (bot protection, empty response, or auth wall) — do not invent specific on-page quotes.
- Do NOT output findings, category scores, or growth benchmarks. No invented data.

URL attempted: ${pagesAnalyzed[0] ?? "unknown"}
Site type guess: ${siteType}
`;
  }

  const homepage = data.pages?.[0] as ExtractedPage | undefined;
  const pageHeadlines = homepage?.headlines ?? [];
  const hero = homepage?.hero;
  const socialProof = homepage?.socialProof;
  const rawFragments = homepage?.raw_content_fragments;

  const contextBlock = homepage
    ? `
SITE OVERVIEW:
- Site type: ${siteType}
- Pages analyzed: ${pagesAnalyzed.join(", ")}
- Word count (homepage): ${homepage.wordCount ?? "unknown"}
- H1 count: ${homepage.h1Count ?? "unknown"} (should be exactly 1)
- CTA count detected: ${homepage.ctaCount ?? "unknown"}
- Has phone number: ${homepage.hasPhoneNumber ?? false}
- Has email address: ${homepage.hasEmailAddress ?? false}
- Has physical address: ${homepage.hasAddress ?? false}

HERO SECTION (above the fold — most important):
- Hero headline detected: ${
    hero?.headline === null
      ? "NULL (no reliable hero H1 — the best candidate was nav/auth/cart UI)"
      : `"${hero?.headline ?? "NOT DETECTED"}"`
  }
- raw_content_fragments (only when headline is NULL — use these as primary evidence for messaging/verdict; do NOT invent or criticize a "broken headline"):
${
  Array.isArray(rawFragments) && rawFragments.length > 0
    ? rawFragments.map((f: string, i: number) => `  ${i + 1}. ${f}`).join("\n")
    : "  (none — headline was extracted normally)"
}
- likely_nav_element (heuristic): ${String((homepage as ExtractedPageWithNavFlag)?.likely_nav_element ?? false)}

When hero.headline is NULL: there is no usable hero H1 string. Base your diagnosis on
raw_content_fragments, title tag, other headlines, CTAs, and body copy — never claim the
"hero headline" is weak or broken (it was intentionally withheld as unreliable).

When hero.headline is a non-null string: it is the best candidate extracted from the page.
If it appears to be navigation or UI chrome rather than marketing copy,
note this uncertainty but still analyze the provided content.

If likely_nav_element is true, do not base your entire diagnosis on the
hero headline. Look at the broader page content provided and analyze what
the site actually sells.

ALL headlines found on page (these are ALL 
the text headings scraped — the AI should
use these to understand the REAL content,
not just the detected hero):
${pageHeadlines.slice(0, 20).map((h: any) => `  [${h.tag}] "${h.text}"`).join("\n")}

IMPORTANT: The hero headline detector may
be inaccurate for JavaScript-rendered sites.
Use the full headlines list above to identify
the ACTUAL main value proposition headline.
Do not report the brand name or logo text
as the hero headline if there are other
longer, more descriptive headings present.

- Subheadline: "${hero?.subheadline || "NOT DETECTED"}"
- Primary CTA text: "${hero?.ctaText || "NO CTA DETECTED"}"
- Primary CTA href: "${hero?.ctaHref || "none"}"
- Hero body copy: "${hero?.bodyText || "none"}"

META DATA:
- Title tag: "${homepage.meta?.title || "MISSING"}"
- Meta description: "${
        homepage.meta?.description ||
        "MISSING — generate a mandatory SEO finding"
      }"
- OG Title: "${homepage.meta?.ogTitle || "not set"}"
- Canonical: "${homepage.meta?.canonical || "not set"}"

ALL HEADLINES FOUND (with HTML tag):
${
  homepage.headlines
    ?.map((h: any) =>
      typeof h === "object" ? `[${h.tag}] ${h.text}` : h
    )
    .join("\n") || "none"
}

CTA BUTTONS AND LINKS FOUND:
${
  Array.isArray(homepage.buttons)
    ? homepage.buttons
        .map((b: any) =>
          typeof b === "object"
            ? `- "${b.text}" (${b.type}${
                b.href ? `, links to: ${b.href}` : ""
              })`
            : `- "${b}"`
        )
        .join("\n")
    : homepage.buttons
}

PRICING DETECTED:
${
  Array.isArray(homepage.pricing) && homepage.pricing.length > 0
    ? homepage.pricing
        .map(
          (p: any) =>
            `- ${p.planName}: ${p.price}${
              p.features?.length
                ? "\n  Features: " + p.features.join(", ")
                : ""
            }`
        )
        .join("\n")
    : "No pricing detected on homepage"
}

TESTIMONIALS FOUND:
${
  Array.isArray(homepage.testimonials) &&
  homepage.testimonials.length > 0
    ? homepage.testimonials
        .map(
          (t: any) =>
            `- "${t.text}" — ${t.author}${
              t.result ? ` (result mentioned: ${t.result})` : ""
            }`
        )
        .join("\n")
    : "NO TESTIMONIALS DETECTED — write a CRITICAL trust finding"
}

SOCIAL PROOF SIGNALS:
- Review count: ${socialProof?.reviewCount || "none detected"}
- Star rating: ${socialProof?.starRating || "none detected"}
- Customer count: ${socialProof?.customerCount || "none detected"}
- Client logos detected: ${
        socialProof?.clientLogos?.join(", ") || "none detected"
      }
- Press/media logos: ${
        socialProof?.pressLogos?.join(", ") || "none detected"
      }
- Certifications: ${
        socialProof?.certifications?.join(", ") || "none detected"
      }

TRUST SIGNALS DETECTED:
${
  Array.isArray(homepage.trust) && homepage.trust.length > 0
    ? homepage.trust
        .map((t: any) =>
          typeof t === "object"
            ? `- [${t.type}] "${t.text}"`
            : `- "${t}"`
        )
        .join("\n")
    : "NO TRUST SIGNALS DETECTED — write CRITICAL trust findings"
}

NAVIGATION ITEMS:
${homepage.navigation?.join(", ") || "none"}

FORMS FOUND:
${
  Array.isArray(homepage.forms) && homepage.forms.length > 0
    ? homepage.forms
        .map(
          (f: any) =>
            `- Form with ${f.fieldCount} fields: [${f.fields.join(
              ", "
            )}], submit button: "${f.submitText}"`
        )
        .join("\n")
    : "No forms detected"
}

IMAGES — ALT TEXT AUDIT:
${
  Array.isArray(homepage.images)
    ? homepage.images
        .slice(0, 12)
        .map((img: any) =>
          typeof img === "object"
            ? img.hasAlt
              ? `✓ "${img.alt}"`
              : "✗ MISSING ALT TEXT"
            : `"${img}"`
        )
        .join("\n")
    : "none"
}

PAGE SECTIONS DETECTED:
${
  Array.isArray(homepage.sections)
    ? homepage.sections
        .slice(0, 8)
        .map(
          (s: any, i: number) =>
            `Section ${i + 1} — "${s.label}":\n${s.text}`
        )
        .join("\n\n")
    : "No sections detected"
}

FULL BODY COPY SAMPLE:
${homepage.paragraphs || "No body text extracted"}
`
    : `No homepage data available. Site type: ${siteType}. 
       Analyze based on site type conventions and note 
       that content could not be extracted.`;

  const additionalPagesContext =
    data.pages
      ?.slice(1)
      .map(
        (p: any, i: number) => `
--- ADDITIONAL PAGE ${i + 1}: ${p.url} (${p.pageType}) ---
Headlines: ${
          p.headlines
            ?.map((h: any) =>
              typeof h === "object" ? h.text : h
            )
            .join(" | ") || "none"
        }
CTAs: ${
          Array.isArray(p.buttons)
            ? p.buttons
                .map((b: any) =>
                  typeof b === "object" ? b.text : b
                )
                .join(", ")
            : p.buttons
        }
Pricing: ${
          Array.isArray(p.pricing) && p.pricing.length > 0
            ? p.pricing
                .map((pr: any) => pr.planName + ": " + pr.price)
                .join(", ")
            : "none"
        }
Testimonials: ${
          Array.isArray(p.testimonials) && p.testimonials.length > 0
            ? p.testimonials.length + " found"
            : "none"
        }
Trust signals: ${
          Array.isArray(p.trust) && p.trust.length > 0
            ? p.trust.map((t: any) =>
                typeof t === "object" ? t.text : t
              ).join(", ")
            : "none"
        }
Word count: ${p.wordCount}
Body copy: ${(p.paragraphs || "").slice(0, 800)}
`
      )
      .join("\n") || "";

  const prompt = `${
    limitedContentNote ? limitedContentNote + "\n\n" : ""
  }${contextBlock}
${additionalPagesContext}

CRITICAL INSTRUCTIONS:
1. For type "existing" leaks: quote EXACT text from the data above in whatWeFound. For type "missing": describe absence only.
2. Evidence priority: if hero.headline is null, use raw_content_fragments, title tag, headlines list, and hero.ctaText — never cite a "hero headline" quote. If hero.headline is a string, it and hero.ctaText are primary evidence.
3. If meta description MISSING: mandatory SEO finding
4. If no testimonials: CRITICAL trust finding
5. If no CTAs: MULTIPLE critical conversion findings
6. Include 3-8 missing-section findings (MSN- ids) per site type blueprint; never fabricate that a section exists

STRICT LENGTH LIMITS — NEVER EXCEED THESE:
- whatWeFound: MAX 2 sentences, MAX 150 characters
- whyItMatters: MAX 2 sentences, MAX 200 characters  
- howToFixIt: MAX 1 sentence, MAX 120 characters
- exampleFix: For type "existing": MAX 2 frameworks (numbered 1. 2.), MAX 2 sentences each; formulas, principles, structural directives, or diagnostic questions only — never finished headline, CTA, or publishable sentence. For type "missing": copy-paste ready example per MISSING SECTION ANALYSIS.
- psychologyPrinciple: MAX 50 characters
- biggestOpportunity: MAX 150 characters
- trafficOpportunity: MAX 100 characters
- conversionOpportunity: MAX 100 characters
- trustOpportunity: MAX 100 characters
- quickWins: exactly 5 items, MAX 80 chars each
- thirtyDayPlan: MAX 200 characters total
- summary: MAX 150 characters

FINDINGS COUNT:
Include at least 3 and at most 8 missing-section findings
(MSN- prefix, type "missing") per the system prompt, plus
existing flaw findings (type "existing"). Never exceed
26 total leaks.

MOST IMPORTANT: Every string value must be SHORT.
A complete valid JSON response is worth more than
a detailed truncated one. If in doubt, write less.

${CONVERSION_INTELLIGENCE_USER_PROMPT_JSON_APPENDIX}`;

  if (!includeVision) return prompt;
  return `${prompt}

You have been provided a screenshot of the website alongside the extracted text content. Use the screenshot to analyze visual elements that text alone cannot capture:

- Visual hierarchy: Is the headline the most visually dominant element? Does the eye flow naturally to the CTA?
- CTA visibility: Is the primary call-to-action button immediately visible above the fold? What is its color contrast against the background?
- Trust signal placement: Are reviews, badges, or guarantees visible without scrolling?
- Image quality and relevance: Do hero images clearly show the product? Are they high quality?
- Whitespace and clutter: Is the above-fold area clean or overwhelming?
- Mobile readiness signals: Does the layout appear responsive and uncluttered?
- Color and contrast issues: Is any text difficult to read due to low contrast?
- Above the fold audit: List exactly what a visitor sees in the first viewport before scrolling.

Incorporate these visual findings into the relevant diagnostic categories. If the screenshot reveals issues not detectable from text alone, include them as additional findings. If the screenshot contradicts the extracted text (for example, a hero headline exists visually but was not detected in the text scrape), trust the screenshot and note the discrepancy.`;
}

// Anonymous IPs that have used their one free scan (in-memory MVP; resets on deploy).
const anonScannedIps = new Set<string>();

/**
 * Profiles need scan_count — run in Supabase SQL editor:
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS scan_count integer default 0;
 */
function normalizeDomainForEntitlement(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

async function checkScanEntitlement(
  req: NextRequest,
  domainToScan: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (token) {
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, scan_count")
        .eq("id", user.id)
        .maybeSingle();

      const normalizedRequestedDomain = normalizeDomainForEntitlement(domainToScan);
      const { data: userReports } = await supabase
        .from("reports")
        .select("domain")
        .eq("user_id", user.id);
      const existingDomains = new Set(
        (userReports ?? []).map((r) =>
          normalizeDomainForEntitlement(String((r as { domain?: unknown }).domain ?? ""))
        )
      );
      const isRescanOfExistingDomain = existingDomains.has(normalizedRequestedDomain);
      if (isRescanOfExistingDomain) {
        return { allowed: true };
      }

      // If profile not found, allow scan
      // (prevents blocking users with profile issues)
      if (!profile) {
        return { allowed: true };
      }

      if (typeof profile?.plan === "string") {
        const planLower = profile.plan.toLowerCase();
        const siteLimit = planLower === "agency" ? 10 : planLower === "pro" ? 5 : null;
        if (siteLimit !== null) {
          if (existingDomains.size >= siteLimit) {
            return {
              allowed: false,
              reason: planLower === "agency" ? "agency_site_limit_reached" : "pro_site_limit_reached",
            };
          }
          return { allowed: true };
        }
      }

      const scanCount = profile?.scan_count ?? 0;
      if (scanCount >= 1) {
        return {
          allowed: false,
          reason: "free_limit_reached",
        };
      }

      if (profile) {
        await supabase
          .from("profiles")
          .update({ scan_count: scanCount + 1 })
          .eq("id", user.id);
      } else {
        await supabase.from("profiles").insert({
          id: user.id,
          plan: "free",
          scan_count: 1,
        });
      }

      return { allowed: true };
    }
  }

  const ip = getClientIp(req);
  if (anonScannedIps.has(ip)) {
    return {
      allowed: false,
      reason: "anonymous_limit_reached",
    };
  }

  anonScannedIps.add(ip);
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(ip);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Scan limit reached. Try again in ${rate.retryAfterMinutes} minutes.`,
        partialSuccess: false,
        pagesAnalyzed: 0,
        suggestion: "Try a simpler URL or check the site is publicly accessible",
      },
      { status: 429 }
    );
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        partialSuccess: false,
        pagesAnalyzed: 0,
        suggestion: "Try a simpler URL or check the site is publicly accessible",
      },
      { status: 400 }
    );
  }
  const urlInput = typeof body?.url === "string" ? body.url : "";
  const validated = validateAndNormalizeUrl(urlInput);
  if ("error" in validated) {
    return NextResponse.json(
      {
        error: validated.error,
        partialSuccess: false,
        pagesAnalyzed: 0,
        suggestion: "Try a simpler URL or check the site is publicly accessible",
      },
      { status: 400 }
    );
  }
  const { url, domain } = validated;

  const entitlement = await checkScanEntitlement(req, domain);
  if (!entitlement.allowed) {
        return NextResponse.json(
      {
        error: "upgrade_required",
        reason: entitlement.reason,
        message:
          entitlement.reason === "free_limit_reached"
            ? "You have used your free scan. Upgrade to Pro for unlimited scans."
            : entitlement.reason === "agency_site_limit_reached"
              ? "10-site limit reached. Remove a site to continue adding new sites."
              : entitlement.reason === "pro_site_limit_reached"
                ? "5-site limit reached. Remove a site or upgrade to Agency to continue adding new sites."
            : "You have used your free scan. Create an account or upgrade to Pro for more scans.",
      },
      { status: 403 }
    );
  }

  const runPipeline = async (): Promise<NextResponse> => {
    const limit = pLimit(3);
    const scrapeResult = await scrapeUrl(urlInput);

    // Phase 2: Tier 1 Axios + Cheerio (always first); Tier 2 stealth only if Axios throws or non-2xx.
    const browserRef: { current: Tier2Browser | null } = { current: null };
    let homepageFetch: Awaited<ReturnType<typeof fetchPageHybrid>> = {
      url,
      html: "",
      success: false,
      error: "Could not fetch page",
    };
    let extraUrls: string[] = [];
    let extraFetchResults: Awaited<ReturnType<typeof fetchPageHybrid>>[] = [];
    let siteType: SiteTypeLabel = detectSiteType(domain, []);

    try {
      homepageFetch = await fetchPageHybrid(url, "homepage", browserRef);
      const homepageHtml = homepageFetch.success ? homepageFetch.html : "";
      const linkHrefs = homepageFetch.success
        ? homepageFetch.source === "jina"
          ? safeExtractLinkHrefsFromMarkdown(homepageHtml)
          : safeExtractLinkHrefs(homepageHtml, url)
        : [];
      siteType = homepageFetch.success
        ? detectSiteType(homepageHtml, linkHrefs)
        : detectSiteType(domain, []);

      const maxAdditionalPages =
        homepageFetch.success && homepageHtml.length > 500 * 1024 ? 2 : 3;
      extraUrls = discoverPages(linkHrefs, url, siteType).slice(0, maxAdditionalPages);

      extraFetchResults = await Promise.all(
        extraUrls.map((pageUrl) =>
          limit(() =>
            fetchPageHybrid(
              pageUrl,
              new URL(pageUrl).pathname || "page",
              browserRef
            )
          )
        )
      );
    } finally {
      if (browserRef.current) {
        await browserRef.current.close().catch(() => {});
        browserRef.current = null;
      }
    }

    const successCount =
      (homepageFetch.success ? 1 : 0) + extraFetchResults.filter((r) => r.success).length;
    const totalAttempted = 1 + extraUrls.length;
    console.log(`Pages successfully fetched: ${successCount}/${totalAttempted}`);

    const scrape_failed = !homepageFetch.success;

    const pages: ExtractedPage[] = [];
    if (homepageFetch.success) {
      pages.push(
        homepageFetch.extracted ??
          applyHeroQualityGate(
            safeExtract(homepageFetch.html, url, "homepage"),
            "cheerio",
            "scored_dom_element",
            "medium"
          )
      );
    } else {
      pages.push(safeExtract("", url, "homepage"));
    }
    for (const r of extraFetchResults) {
      if (!r.success) continue;
      const pageType =
        r.url === url ? "homepage" : new URL(r.url).pathname || "page";
      pages.push(
        r.extracted ??
          applyHeroQualityGate(
            safeExtract(r.html, r.url, pageType),
            "cheerio",
            "scored_dom_element",
            "medium"
          )
      );
    }
    const combinedData = { siteType, pages, scrape_failed };
    const jina_used =
      homepageFetch.source === "jina" ||
      extraFetchResults.some((r) => r.source === "jina");
    const hasAnyButtons = pages.some(
      (p) => Array.isArray((p as any).buttons) && (p as any).buttons.length > 0
    );
    const cleanedData = cleanStructuredPageDataForAi(combinedData);
    const homepageStructuredExtraction = extractPageDataComprehensive(
      homepageFetch.source === "cheerio" ? homepageFetch.html : "",
      url,
      pages[0] ?? safeExtract("", url, "homepage"),
      homepageFetch.source === "jina" ? homepageFetch.html : undefined
    );
    const populatedFields = Object.values(homepageStructuredExtraction).filter((v) => {
      if (v == null) return false;
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "number") return !Number.isNaN(v) && v !== 0;
      if (typeof v === "boolean") return v;
      if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
      return false;
    }).length;
    console.log(
      `[analyze] extraction populated=${populatedFields}/${Object.keys(homepageStructuredExtraction).length}; ` +
        `pageWeightSignal=${homepageStructuredExtraction.pageWeightSignal}; ` +
        `scriptCount=${homepageStructuredExtraction.scriptCount}; ` +
        `thirdPartyScriptCount=${homepageStructuredExtraction.thirdPartyScriptCount}; ` +
        `heroHeadline="${homepageStructuredExtraction.heroHeadline || "none"}"; ` +
        `testimonials=${homepageStructuredExtraction.testimonials.length}; ` +
        `hasEmailCapture=${homepageStructuredExtraction.hasEmailCapture}; ` +
        `pageSectionOrder=${homepageStructuredExtraction.pageSectionOrder.join(" -> ")}`
    );

    const totalExtractedChars = pages.reduce(
      (sum, p) => sum + (typeof p.paragraphs === "string" ? p.paragraphs.length : 0),
      0
    );
    const limitedContentNote =
      scrape_failed
        ? undefined
        : totalExtractedChars < 2000
          ? "NOTE: Limited page content was extractable from this site (likely due to JavaScript rendering or bot protection). Analyze what is available and note in findings that some checks could not be fully completed due to technical constraints. Still provide the full finding structure with actionable recommendations based on what IS visible."
          : undefined;

    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[analyze] Extracted page data:",
        JSON.stringify(combinedData, null, 2).slice(0, 5000)
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const maxTokensHeuristic = calculateMaxTokens(pages, scrape_failed);

    console.log(
      `[analyze] Pages: ${pages.length}, ` +
        `Total words: ${pages.reduce((s, p) => s + (p.wordCount ?? 0), 0)}, ` +
        `Max tokens: 16000 (heuristic was ${maxTokensHeuristic}), scrape_failed: ${scrape_failed}`
    );

    const trimmedData = buildTrimmedData(cleanedData, pages);

    const userPrompt = buildUserPrompt(
      siteType,
      pages.map((p) => p.url),
      trimmedData,
      limitedContentNote,
      scrape_failed,
      false
    );

    let visionBase64 = "";
    let visionMediaType: "image/png" = "image/png";
    let vision_used = false;
    let screenshotAnalysis = false;
    const screenshot = await fetchJinaScreenshot(url);
    if (!screenshot.success) {
      console.log("[analyze] Screenshot failed, proceeding with text-only analysis");
    } else if (screenshot.base64.length > 6_800_000) {
      console.log(
        "[analyze] Screenshot too large for vision analysis, proceeding text-only."
      );
    } else {
      visionBase64 = screenshot.base64;
      visionMediaType = screenshot.mediaType;
      vision_used = true;
      screenshotAnalysis = true;
    }

    const finalPrompt = vision_used
      ? buildUserPrompt(
          siteType,
          pages.map((p) => p.url),
          trimmedData,
          limitedContentNote,
          scrape_failed,
          true
        )
      : userPrompt;

    const callAi = async (): Promise<Record<string, unknown>> => {
      const extractedPageContent = formatExtractionForClaude(
        homepageStructuredExtraction
      );
      const firstHalf = DIAGNOSTIC_CHECKS.slice(0, 83);
      const secondHalf = DIAGNOSTIC_CHECKS.slice(83);
      const visionCtx = {
        used: vision_used,
        base64: visionBase64,
        mediaType: visionMediaType,
      };

      console.log(
        "[analyze] Starting parallel rubric evaluation: 2 batches (checks per batch:",
        firstHalf.length,
        "+",
        secondHalf.length,
        "=",
        firstHalf.length + secondHalf.length,
        "total)"
      );
      const [firstResults, secondResults] = await Promise.all([
        evaluateChecks(
          anthropic,
          extractedPageContent,
          firstHalf,
          visionCtx,
          "first"
        ),
        evaluateChecks(
          anthropic,
          extractedPageContent,
          secondHalf,
          visionCtx,
          "second"
        ),
      ]);
      const allResults = [...firstResults, ...secondResults];
      console.log("[DIMENSIONS] total results passed:", allResults.length);
      const rawResults = allResults;
      const dimensionScores = calculateDimensionScores(
        rawResults.map((row: { id: string; status: string }) => ({
          id: row.id,
          status: row.status,
        }))
      );
      console.log(
        "[analyze] dimensionScores (rubric, before persist):",
        dimensionScores.map((d) => `${d.label}=${d.score}`).join(" | ")
      );
      console.log(
        "[analyze] Rubric evaluation complete:",
        rawResults.length,
        "checks returned"
      );
      if (rawResults.length < 100) {
        console.warn(
          `[analyze] Incomplete rubric evaluation — only ${rawResults.length} checks returned`
        );
      }
      const byId = new Map(DIAGNOSTIC_CHECKS.map((c) => [c.id, c]));
      const enriched = enrichRubricFailures(rawResults, byId);
      const findings = sortByRevenuePriority(enriched);

      const curated = curateFindings(enriched);
      const toLeak = (f: (typeof enriched)[number]) => enrichedFindingToLeak(f);
      const curation = {
        moneyLeaks: curated.moneyLeaks.map(toLeak),
        quickWins: curated.quickWins.map(toLeak),
        growthRoadmap: curated.growthRoadmap.map(toLeak),
        priorityFindings: curated.priorityFindings.map(toLeak),
        primaryFindings: curated.primaryFindings.map(toLeak),
        secondaryFindings: curated.secondaryFindings.map(toLeak),
        opportunityFindings: curated.opportunityFindings.map(toLeak),
        totalFailed: curated.totalFailed,
        totalChecked: curated.totalChecked,
        hiddenFindingsCount: curated.hiddenCount,
        hiddenCount: curated.hiddenCount,
      };
      const allFailedLeaks = enriched.map(toLeak);
      const allFindings = allFailedLeaks;
      const heroHeadlineForScore = String(
        (homepageStructuredExtraction as { heroHeadline?: string })?.heroHeadline ??
          pages[0]?.hero?.headline ??
          ""
      );
      const { growthScore } = computeGrowthScoreFromRubric(
        rawResults,
        DIAGNOSTIC_CHECKS,
        heroHeadlineForScore
      );

      const totalChecks = DIAGNOSTIC_CHECKS.length;
      const totalFails = curation.totalFailed;
      const totalPasses = rawResults.filter((r) => r.status === "PASS").length;
      const totalSkipped = rawResults.filter((r) => r.status === "SKIP").length;
      const criticalCount = enriched.filter((f) => f.severity === "Critical").length;
      const highCount = enriched.filter((f) => f.severity === "High").length;
      const flawCount = enriched.filter((f) => f.mode === "FLAW").length;
      const gapCount = enriched.filter((f) => f.mode === "GAP").length;
      const categorySummary = enriched.reduce<Record<string, number>>((acc, f) => {
        acc[f.category] = (acc[f.category] ?? 0) + 1;
        return acc;
      }, {});
      const rubricCompleteness = (rawResults.length / totalChecks) * 100;

      const heroHeadlineForOverview = String(
        (homepageStructuredExtraction as { heroHeadline?: string })?.heroHeadline ??
          pages[0]?.hero?.headline ??
          "Not found"
      );
      const heroForOverviewPrompt: string | null =
        heroHeadlineForOverview && heroHeadlineForOverview !== "Not found"
          ? heroHeadlineForOverview
          : null;

      let overviewCopy: OverviewCopy | null = null;
      try {
        overviewCopy = await generateOverviewCopy(
          anthropic,
          {
            domain,
            siteType: String(siteType),
            heroHeadline: heroForOverviewPrompt,
            topFindings: curated.moneyLeaks,
            totalFailed: totalFails,
            criticalCount,
          },
          { model: AI_MODEL }
        );
      } catch (overviewErr) {
        console.error("[analyze] overview copy failed:", overviewErr);
      }

      const defaultExec = {
        verdict: "Structured rubric audit completed.",
        diagnosis: `Failed ${totalFails} of ${totalChecks} checks with ${criticalCount} critical and ${highCount} high-severity failures.`,
        priorityAction:
          "Start with Critical failures in Hero, Trust, and CTA-related categories.",
        estimatedImpact:
          "Addressing high-severity rubric failures can materially improve conversion.",
        weekOneActions: [
          "Resolve top 3 critical rubric failures.",
          "Fix above-the-fold clarity and CTA issues.",
          "Add trust elements where purchase decisions happen.",
        ],
      };

      const executiveSummary = overviewCopy
        ? {
            verdict: overviewCopy.verdict ?? defaultExec.verdict,
            diagnosis: overviewCopy.diagnosis ?? "",
            priorityAction:
              overviewCopy.biggestOpportunity ?? defaultExec.priorityAction,
            estimatedImpact:
              overviewCopy.estimatedImpact ?? defaultExec.estimatedImpact,
            weekOneActions: defaultExec.weekOneActions,
          }
        : defaultExec;

      return {
        siteType,
        pagesAnalyzed: pages.map((p) => p.url),
        rubricEvaluation: true,
        dimensionScores,
        growthScore,
        healthScore: growthScore,
        leaks: curation.priorityFindings,
        moneyLeaks: curation.moneyLeaks,
        quickWins: curation.quickWins,
        growthRoadmap: curation.growthRoadmap,
        priorityFindings: curation.priorityFindings,
        primaryFindings: curation.primaryFindings,
        secondaryFindings: curation.secondaryFindings,
        opportunityFindings: curation.opportunityFindings,
        allFailedLeaks,
        allFindings,
        totalFailed: curation.totalFailed,
        totalPassed: totalPasses,
        totalChecked: curation.totalChecked,
        criticalCount,
        highCount,
        hiddenFindingsCount: curation.hiddenFindingsCount,
        hiddenCount: curation.hiddenCount,
        overviewCopy,
        heroRewrite: {
          currentHeadline: pages[0]?.hero?.headline ?? "Not found",
          currentSubheadline: pages[0]?.hero?.subheadline ?? "Not found",
          currentCta: pages[0]?.hero?.ctaText ?? "No CTA found",
          suggestedHeadline: "Outcome-led hero brief required",
          suggestedSubheadline: "Clarify value proposition and reduce ambiguity",
          suggestedCta: "Use specific action with clear next step",
          psychologistsNote: "Generated via structured rubric evaluation.",
        },
        growthStrategy: {
          biggestOpportunity:
            overviewCopy?.biggestOpportunity ??
            "Fix highest-severity rubric failures first.",
          trafficOpportunity: "Address SEO and metadata rubric failures.",
          conversionOpportunity: "Address Hero, CTA, and Trust failures first.",
          trustOpportunity: "Close trust signal gaps nearest purchase actions.",
          quickWins: [
            "Fix top critical check",
            "Improve hero clarity",
            "Strengthen CTA visibility",
            "Add trust proof near CTA",
            "Resolve metadata gaps",
          ],
          thirtyDayPlan:
            "Week 1 critical fixes; Week 2 trust/CTA; Week 3 SEO/UX; Week 4 validation and rescan.",
        },
        summary: `Rubric evaluation complete: ${totalFails} failed checks.`,
        executiveSummary,
        metadata: {
          rubric: {
            totalChecks,
            totalFails,
            totalPasses,
            totalSkipped,
            criticalCount,
            highCount,
            flawCount,
            gapCount,
            categorySummary,
            rubricCompleteness,
            hiddenFindingsCount: curation.hiddenFindingsCount,
            hiddenCount: curation.hiddenCount,
            totalChecked: curation.totalChecked,
            totalPassed: totalPasses,
          },
        },
        rubricResults: rawResults,
        rubricFindings: findings,
      } as Record<string, unknown>;
    };

    let result: Record<string, unknown>;
    try {
      result = await callAi();
    } catch (err) {
      console.error("[analyze] Analysis failed:", err);
      return NextResponse.json(
        {
          error: "Analysis failed. Try again.",
          partialSuccess: pages.length > 0,
          pagesAnalyzed: pages.length,
          suggestion:
            "Try a simpler URL or check the site is publicly accessible",
        },
        { status: 500 }
      );
    }

    const whyItMattersFallback =
      "This issue directly impacts visitor trust and conversion. Psychological research shows users make snap judgments within 50ms — missing or weak elements here cost you credibility before a single word is read.";

    const containsDebugMarkers = (s: string) =>
      s.includes("[") || s.includes("Images:") || s.includes("Buttons:");

    const sanitizeAiResult = (value: any): any => {
      if (typeof value === "string" && containsDebugMarkers(value)) {
        return whyItMattersFallback;
      }
      if (Array.isArray(value)) {
        return value.map((v) => sanitizeAiResult(v));
      }
      if (value && typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
          if (
            k === "overviewCopy" ||
            k === "executiveSummary" ||
            k === "intelligenceBrief"
          ) {
            out[k] = v;
            continue;
          }
          out[k] = sanitizeAiResult(v);
        }
        return out;
      }
      return value;
    };

    result = sanitizeAiResult(result) as Record<string, unknown>;

    const r = result as any;
    if (!Array.isArray(r.visualFindings)) r.visualFindings = [];
    if (!r.metadata || typeof r.metadata !== "object") r.metadata = {};
    r.metadata.screenshotAnalysis = screenshotAnalysis;

    if (scrape_failed) {
      r.leaks = [];
      r.healthScore = 0;
      r.categoryScores = {
        psychology: 0,
        messaging: 0,
        conversion: 0,
        seo: 0,
        ux: 0,
        trust: 0,
      };
      r.dimensionScores = calculateDimensionScores([]);
    }

    const clampInt = (n: unknown, min: number, max: number) => {
      if (typeof n !== "number" || !Number.isFinite(n)) return null;
      const v = Math.round(n);
      return Math.max(min, Math.min(max, v));
    };

    /** Same weights as SCORE CALCULATION (WEIGHTS) in SYSTEM_PROMPT */
    const CATEGORY_KEYS = [
      "psychology",
      "messaging",
      "conversion",
      "seo",
      "ux",
      "trust",
    ] as const;
    type CategoryScoreKey = (typeof CATEGORY_KEYS)[number];

    const CATEGORY_WEIGHTS: Record<CategoryScoreKey, number> = {
      psychology: 0.2,
      messaging: 0.2,
      conversion: 0.25,
      trust: 0.15,
      seo: 0.1,
      ux: 0.1,
    };

    const normalizeLeakCategoryKey = (
      category: string
    ): CategoryScoreKey | null => {
      const c = (category ?? "").toUpperCase();
      if (c.includes("PSYCHOLOGY")) return "psychology";
      if (c.includes("MESSAGING")) return "messaging";
      if (c.includes("CONVERSION")) return "conversion";
      if (c.includes("TRUST")) return "trust";
      if (c.includes("SEO")) return "seo";
      if (c.includes("UX")) return "ux";
      if (c.includes("STRATEGY")) return "messaging";
      return null;
    };

    /**
     * Per-category score from all findings (existing + missing): same severity
     * weights as the prior conversion-only helper (−18 critical, −9 warning).
     */
    const computeCategoryScoresFromLeaks = (
      leaks: any[]
    ): Record<CategoryScoreKey, number> => {
      const counts: Record<
        CategoryScoreKey,
        { critical: number; warning: number }
      > = {
        psychology: { critical: 0, warning: 0 },
        messaging: { critical: 0, warning: 0 },
        conversion: { critical: 0, warning: 0 },
        seo: { critical: 0, warning: 0 },
        ux: { critical: 0, warning: 0 },
        trust: { critical: 0, warning: 0 },
      };

      for (const leak of leaks) {
        const key = normalizeLeakCategoryKey(leak?.category);
        if (!key) continue;
        const sev =
          typeof leak?.severity === "string"
            ? leak.severity.toLowerCase()
            : "";
        if (sev === "critical") counts[key].critical += 1;
        else if (sev === "warning") counts[key].warning += 1;
      }

      const out = {} as Record<CategoryScoreKey, number>;
      for (const k of CATEGORY_KEYS) {
        const { critical, warning } = counts[k];
        const score = 100 - critical * 18 - warning * 9;
        out[k] = Math.max(1, Math.min(100, Math.round(score)));
      }
      return out;
    };

    const computeHealthScoreFromCategories = (
      categories: Record<CategoryScoreKey, number>
    ): number => {
      let sum = 0;
      for (const k of CATEGORY_KEYS) {
        sum += (categories[k] ?? 50) * CATEGORY_WEIGHTS[k];
      }
      return Math.max(1, Math.min(100, Math.round(sum)));
    };

    const normalizeLeakBatch = (leaks: any[]) =>
      leaks.map((leak: any) => {
        const id =
          typeof leak?.id === "string" ? leak.id.trim().toUpperCase() : "";
        const isMissing =
          leak?.type === "missing" || id.startsWith("MSN-");
        const pageLoc =
          typeof leak?.page_location === "string"
            ? leak.page_location
            : "";
        return {
          ...leak,
          type: isMissing ? "missing" : "existing",
          page_location: isMissing
            ? pageLoc || "Missing from site entirely"
            : pageLoc,
        };
      });

    if (r?.rubricEvaluation) {
      if (Array.isArray(r.leaks)) r.leaks = normalizeLeakBatch(r.leaks);
      if (Array.isArray(r.priorityFindings))
        r.priorityFindings = normalizeLeakBatch(r.priorityFindings);
      if (Array.isArray(r.primaryFindings))
        r.primaryFindings = normalizeLeakBatch(r.primaryFindings);
      if (Array.isArray(r.secondaryFindings))
        r.secondaryFindings = normalizeLeakBatch(r.secondaryFindings);
      if (Array.isArray(r.opportunityFindings))
        r.opportunityFindings = normalizeLeakBatch(r.opportunityFindings);
      if (Array.isArray(r.allFindings)) r.allFindings = normalizeLeakBatch(r.allFindings);
      const catSource =
        Array.isArray(r.allFailedLeaks) && r.allFailedLeaks.length > 0
          ? r.allFailedLeaks
          : r.leaks;
      if (Array.isArray(catSource) && catSource.length > 0) {
        const mapped = normalizeLeakBatch(catSource);
        if (Array.isArray(r.allFailedLeaks)) r.allFailedLeaks = mapped;
        r.categoryScores = computeCategoryScoresFromLeaks(mapped);
      }
      if (typeof r.growthScore === "number") {
        r.healthScore = r.growthScore;
      }
    } else if (r && Array.isArray(r.leaks) && r.leaks.length > 0) {
      r.leaks = normalizeLeakBatch(r.leaks);
      const computed = computeCategoryScoresFromLeaks(r.leaks);
      r.categoryScores = computed;
      r.healthScore = computeHealthScoreFromCategories(computed);
    }

    // Floor: never allow 0 for any category score (breaks score ring display).
    if (
      !scrape_failed &&
      r?.categoryScores &&
      typeof r.categoryScores === "object"
    ) {
      for (const [k, v] of Object.entries(r.categoryScores)) {
        const clamped = clampInt(v, 1, 100);
        if (clamped != null) (r.categoryScores as any)[k] = clamped;
      }
    }

    if (!scrape_failed && typeof r?.healthScore === "number") {
      const minScore = r?.rubricEvaluation ? 8 : 1;
      const hs = clampInt(r.healthScore, minScore, 100);
      if (hs != null) r.healthScore = hs;
    }
    if (!scrape_failed && r?.rubricEvaluation && typeof r?.growthScore === "number") {
      const gs = clampInt(r.growthScore, 5, 100);
      if (gs != null) {
        r.growthScore = gs;
        r.healthScore = gs;
      }
    }

    return NextResponse.json({
      ...result,
      domain,
      pagesAnalyzed: pages.map((p) => p.url),
      scrape_failed,
      jina_used,
      vision_used,
      extractionData: homepageStructuredExtraction,
    });
  };

  try {
    return await runPipeline();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed.";
    return NextResponse.json(
      {
        error: message,
        code: "ANALYZE_PIPELINE_FAILED",
        partialSuccess: false,
        pagesAnalyzed: 0,
        suggestion: "Try a simpler URL or check the site is publicly accessible",
      },
      { status: 500 }
    );
  }
}
