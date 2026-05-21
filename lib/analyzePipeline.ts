import * as cheerio from "cheerio";
import { finalizeHeroHeadline } from "@/lib/heroHeadlineFinalize";

const BLOCKED_HOSTS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i;
const BLOCKED_IP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|0\.)/;
const BLOCKED_PROTOCOL = /^(file|ftp|data|javascript):/i;

export function validateAndNormalizeUrl(
  input: string
): { url: string; domain: string } | { error: string } {
  console.error('[PIPELINE] validateAndNormalizeUrl called — analyzePipeline.ts is in the call chain')
  const raw = (input || "").trim();
  if (!raw) return { error: "Invalid URL" };
  let urlStr = raw;
  if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`;
  try {
    const u = new URL(urlStr);
    if (BLOCKED_PROTOCOL.test(u.protocol)) return { error: "Invalid URL" };
    const host = u.hostname;
    if (BLOCKED_HOSTS.test(host)) return { error: "Invalid URL" };
    if (BLOCKED_IP.test(host)) return { error: "Invalid URL" };
    const domain = host.replace(/^www\./, "").toLowerCase();
    return { url: u.href, domain };
  } catch {
    return { error: "Invalid URL" };
  }
}

export type SiteTypeLabel =
  | "ecommerce"
  | "saas"
  | "service"
  | "local"
  | "content"
  | "general";

const SIGNALS: Record<SiteTypeLabel, { text: string[]; url: string[] }> = {
  ecommerce: {
    text: ["add to cart", "buy now", "checkout", "shop now"],
    url: ["/products", "/collections", "/cart", "/shop"],
  },
  saas: {
    text: ["free trial", "start free", "sign up", "dashboard", "integrations"],
    url: ["/pricing", "/features", "/integrations", "/docs"],
  },
  service: {
    text: ["book", "schedule", "consultation", "appointment", "get a quote"],
    url: ["/services", "/booking", "/contact", "/about"],
  },
  local: {
    text: ["located at", "serving", "near me", "call us", "open hours"],
    url: ["/location", "/directions", "/menu"],
  },
  content: {
    text: ["read more", "latest posts", "subscribe", "newsletter"],
    url: ["/blog", "/articles", "/guides", "/posts"],
  },
  general: { text: [], url: [] },
};

export function detectSiteType(
  html: string,
  linkHrefs: string[]
): SiteTypeLabel {
  const text = html.toLowerCase();
  const hrefs = linkHrefs.join(" ").toLowerCase();
  let best: SiteTypeLabel = "general";
  let bestScore = 0;
  const types: SiteTypeLabel[] = [
    "ecommerce", "saas", "service", "local", "content"
  ];
  for (const t of types) {
    const s = SIGNALS[t];
    let score = 0;
    for (const p of s.text) if (text.includes(p)) score += 2;
    for (const p of s.url) if (hrefs.includes(p)) score += 2;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

const DISCOVERY: Record<SiteTypeLabel, RegExp[]> = {
  /** Product slug before collections — pricing, reviews, CTAs. */
  ecommerce: [
    /\/products?\/[^/]+/i,
    /\/collections?\/[^/]+/i,
    /\/shop/i,
    /\/about/i,
  ],
  /** /pricing first — highest-impact page for SaaS conversion analysis. */
  saas: [
    /\/pricing/i,
    /\/features/i,
    /\/about/i,
    /\/signup|\/register|\/trial/i,
  ],
  service: [
    /\/services?\/[^/]+/i,
    /\/services?$/i,
    /\/about/i,
    /\/contact/i,
  ],
  local: [/\/services?/i, /\/about/i, /\/contact/i, /\/gallery/i],
  content: [/\/blog\/[^/]+/i, /\/about/i, /\/newsletter/i, /\/start/i],
  general: [/\/pricing/i, /\/about/i, /\/services/i, /\/contact/i],
};

export function discoverPages(
  linkHrefs: string[],
  baseUrl: string,
  siteType: SiteTypeLabel
): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  const patterns = DISCOVERY[siteType];
  for (let i = 0; i < patterns.length; i++) {
    const re = patterns[i];
    for (const href of linkHrefs) {
      try {
        const u = new URL(href, base);
        if (u.origin !== base.origin) continue;
        const path = u.pathname.replace(/\/$/, "") || "/";
        if (!re.test(path)) continue;
        const key = u.origin + path;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(u.href);
        break;
      } catch { /* skip */ }
    }
  }
  return out.slice(0, 4);
}

const CTA_WORDS = /buy|start|get|try|book|schedule|contact|sign|join|learn|see|watch/i;

export interface ExtractedPage {
  url: string;
  pageType: string;
  headlines: Array<{ tag: string; text: string }>;
  sections: Array<{ label: string; text: string }>;
  paragraphs: string;
  buttons: Array<{
    text: string;
    type: "button" | "link" | "submit";
    href?: string;
    isAboveFold: boolean;
  }>;
  hero: {
    /** Null when the best H1 match is nav/auth UI; use raw_content_fragments for diagnosis. */
    headline: string | null;
    subheadline: string;
    ctaText: string;
    ctaHref: string;
    bodyText: string;
  };
  /** Populated when hero.headline is null — fallback copy for AI (Shopify/JS shells). */
  raw_content_fragments?: string[];
  pricing: Array<{
    planName: string;
    price: string;
    features: string[];
  }>;
  testimonials: Array<{
    text: string;
    author: string;
    result: string;
  }>;
  socialProof: {
    reviewCount: string;
    starRating: string;
    clientLogos: string[];
    pressLogos: string[];
    certifications: string[];
    customerCount: string;
  };
  navigation: string[];
  meta: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    canonical: string;
  };
  trust: Array<{ text: string; type: string }>;
  images: Array<{ alt: string; hasAlt: boolean; src: string }>;
  forms: Array<{
    fields: string[];
    submitText: string;
    fieldCount: number;
  }>;
  wordCount: number;
  h1Count: number;
  ctaCount: number;
  hasPhoneNumber: boolean;
  hasEmailAddress: boolean;
  hasAddress: boolean;
  structured_data: string[];
}

export function extractPageData(
  html: string,
  url: string,
  pageType: string
): ExtractedPage {
  console.error('[PIPELINE] extractPageData called', url)
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  // ── HEADLINES ──
  const headlines: Array<{ tag: string; text: string }> = [];
  const navTexts = new Set<string>();
  $("nav a, header a, [role=navigation] a, header nav, .navigation, #navigation").each(
    (_, el) => {
      const t = $(el).text().trim().toLowerCase();
      if (t) navTexts.add(t);
    }
  );

  const NAV_WORDS = new Set<string>([
    "home",
    "about",
    "contact",
    "blog",
    "shop",
    "store",
    "products",
    "collections",
    "catalog",
    "accessories",
    "toys",
    "sale",
    "cart",
    "account",
    "login",
    "signup",
    "menu",
    "navigation",
    "search",
  ]);

  $("h1, h2, h3, h4").each((_, el) => {
    const tag = (el as any).tagName?.toLowerCase() ?? "h2";
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const lower = text.toLowerCase();
    if (
      text &&
      text.length > 2 &&
      headlines.length < 50 &&
      !navTexts.has(lower) &&
      !(
        text.split(/\s+/).length <= 2 &&
        NAV_WORDS.has(lower)
      )
    )
      headlines.push({ tag, text });
  });

  // Also capture prominent non-semantic headlines
  // common in Shopify/page builder themes
  $(
    "[class*='heading'], [class*='headline'], [class*='title']"
  ).each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (
      text &&
      text.length > 5 &&
      text.length < 200 &&
      headlines.length < 50 &&
      !headlines.some((h) => h.text === text)
    ) {
      headlines.push({ tag: "div-heading", text });
    }
  });

  const h1Count = headlines.filter((h) => h.tag === "h1").length;

  // ── HERO SECTION — smarter fallback chain ──
  const heroSelectors = [
    "[class*='hero']",
    "[class*='banner']",
    "[class*='jumbotron']",
    "[class*='slideshow']",
    "[class*='slider']",
    "[class*='masthead']",
    "[class*='intro']",
    "[class*='above-fold']",
    "[class*='above_fold']",
    "[class*='home-hero']",
    "[class*='page-hero']",
    "[class*='section-hero']",
    "[class*='featured']",
    "[class*='splash']",
    "header + section",
    "header + div",
    "main > section:first-child",
    "main > div:first-child",
    ".shopify-section:first-child",
    "[class*='shopify-section']:first-child",
    "section:first-of-type",
    "#hero",
    "#banner",
    "#home",
  ];

  let heroEl: any = null;
  for (const sel of heroSelectors) {
    const found = $(sel).first();
    if (found.length && found.text().trim().length > 50) {
      heroEl = found;
      break;
    }
  }

  // Fallback 1: use first H1 found anywhere on page
  const allH1s = headlines.filter((h) => h.tag === "h1");

  // Filter out short ones that are likely logos/nav
  const contentH1s = allH1s.filter((h) => h.text.length > 10);

  // Fallback 2: use first H2 if no H1
  const heroElH1 = heroEl
    ? heroEl
        .find("h1, h2, [class*='heading'], [class*='title']")
        .map((_: any, el: any) => $(el).text().trim())
        .get()
        .filter((t: string) => t.length > 10)
        .join(" | ")
    : "";

  // Try large/prominent text elements even without semantic tags
  // Many Shopify themes use divs with large font classes
  const prominentText = $(
    [
      "[class*='heading']",
      "[class*='title']",
      "[class*='headline']",
      "[class*='display']",
      "[class*='hero'] p",
      "[class*='hero'] div",
      "[class*='banner'] p",
      "[class*='banner'] div",
    ].join(", ")
  )
    .map((_: any, el: any) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      return text;
    })
    .get()
    .filter((t: string) => t.length > 15 && t.length < 200)
    .slice(0, 5);

  let heroHeadline: string | null =
    heroElH1 ||
    contentH1s[0]?.text ||
    prominentText[0] ||
    allH1s[0]?.text ||
    headlines[0]?.text ||
    null;

  const isNavText = (t: string) => {
    const lower = t.toLowerCase().trim();
    const words = lower.split(/\s+/);
    return (
      navTexts.has(lower) ||
      (words.length <= 2 && words.every((w) => NAV_WORDS.has(w)))
    );
  };

  if (heroHeadline && isNavText(heroHeadline)) {
    // Find the next valid headline
    const validHeadline = headlines.find(
      (h) =>
        !isNavText(h.text) && h.text.split(/\s+/).length >= 3
    );
    if (validHeadline) heroHeadline = validHeadline.text;
  }

  heroHeadline = finalizeHeroHeadline(heroHeadline, headlines, {
    logFinal: false,
  });

  // Subheadline: next headline after the hero headline,
  // or first paragraph-like text near the top
  const heroHeadlineIndex = headlines.findIndex(
    (h) => h.text === (heroHeadline ?? "")
  );
  const nextHeadline =
    heroHeadlineIndex >= 0 ? headlines[heroHeadlineIndex + 1] : null;

  // Get all paragraphs near the top of the page
  const topParagraphs = $(
    "main p, body > section p, body > div p"
  )
    .map((_: any, el: any) =>
      $(el).text().replace(/\s+/g, " ").trim()
    )
    .get()
    .filter((t: string) => t.length > 20 && t.length < 400)
    .slice(0, 5);

  const heroSubheadline =
    (heroEl &&
      heroEl.find("p").first().text().replace(/\s+/g, " ").trim()) ||
    topParagraphs[0] ||
    nextHeadline?.text ||
    "";

  // CTA: look for the most prominent action-oriented
  // link or button on the entire page
  const allCtaEls = $("a, button").filter((_: any, el: any) => {
    const t = $(el).text().trim();
    return t.length > 2 && t.length < 80 && CTA_WORDS.test(t);
  });

  const heroCtaEl = heroEl
    ? heroEl.find("a, button").filter((_: any, el: any) => {
        const t = $(el).text().trim();
        return t.length > 2 && t.length < 80;
      }).first()
    : allCtaEls.first();

  const heroCtaText =
    heroCtaEl?.text?.()?.trim() ||
    (allCtaEls.length > 0 ? $(allCtaEls[0]).text().trim() : "");
  const heroCtaHref =
    heroCtaEl?.attr?.("href") ??
    (allCtaEls.length > 0 ? $(allCtaEls[0]).attr("href") ?? "" : "");

  const heroBodyText = heroEl
    ? heroEl
        .find("p")
        .map((_: any, el: any) => $(el).text().trim())
        .get()
        .filter((t: string) => t.length > 20)
        .join(" ")
        .slice(0, 500)
    : $("p").first().text().trim().slice(0, 300);

  const hero = {
    headline: heroHeadline ?? null,
    subheadline: heroSubheadline,
    ctaText: heroCtaText,
    ctaHref: heroCtaHref,
    bodyText: heroBodyText,
  };

  // ── SECTIONS ──
  const sections: Array<{ label: string; text: string }> = [];
  $("section, [class*='section'], main > div").each((i, el) => {
    if (i > 12) return;
    const heading = $(el).find("h1, h2, h3").first().text().trim();
    const body = $(el)
      .find("p")
      .map((_: any, p: any) => $(p).text().replace(/\s+/g, " ").trim())
      .get()
      .filter((t: string) => t.length > 20)
      .join(" ")
      .slice(0, 600);
    if (body.length > 30)
      sections.push({ label: heading || `Section ${i + 1}`, text: body });
  });

  // ── PARAGRAPHS ──
  const paragraphChunks: string[] = [];
  $("p, li").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > 15) paragraphChunks.push(text.slice(0, 800));
  });
  const paragraphs = paragraphChunks.join(" ").trim().slice(0, 4000);
  const wordCount = paragraphs.split(/\s+/).filter(Boolean).length;

  // ── BUTTONS / CTAs ──
  const buttons: Array<{
    text: string;
    type: "button" | "link" | "submit";
    href?: string;
    isAboveFold: boolean;
  }> = [];
  const seenBtns = new Set<string>();
  $("button, [role=button], input[type=submit]").each((_, el) => {
    const text = $(el).attr("value") ?? $(el).text().trim();
    if (text && !seenBtns.has(text) && buttons.length < 20) {
      seenBtns.add(text);
      buttons.push({ text, type: "button", isAboveFold: false });
    }
  });
  $("a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") ?? "";
    if (
      text && text.length < 80 && CTA_WORDS.test(text) &&
      !seenBtns.has(text) && buttons.length < 30
    ) {
      seenBtns.add(text);
      buttons.push({ text, type: "link", href, isAboveFold: false });
    }
  });
  const ctaCount = buttons.length;

  // ── PRICING ──
  const pricing: Array<{
    planName: string; price: string; features: string[]
  }> = [];
  const pricingSelectors = [
    "[class*='pricing']",
    "[class*='plan']",
    "[class*='package']",
    "[class*='tier']",
  ];
  for (const sel of pricingSelectors) {
    $(sel).each((_, el) => {
      const planName = $(el)
        .find("h2, h3, h4, [class*='title'], [class*='name']")
        .first().text().trim();
      const priceText = $(el)
        .find("[class*='price'], [class*='cost'], [class*='amount']")
        .first().text().trim();
      const features = $(el)
        .find("li, [class*='feature']")
        .map((_: any, li: any) => $(li).text().trim())
        .get()
        .filter((t: string) => t.length > 3 && t.length < 100)
        .slice(0, 8);
      if ((planName || priceText) && pricing.length < 5)
        pricing.push({
          planName: planName || "Plan",
          price: priceText || "Not shown",
          features,
        });
    });
    if (pricing.length > 0) break;
  }
  if (pricing.length === 0) {
    const pricePattern = /\$[\d,]+(?:\.\d{2})?(?:\/mo|\/month|\/yr|\/year)?/gi;
    const bodyHtml = $("body").text();
    const priceMatches = bodyHtml.match(pricePattern);
    if (priceMatches)
      pricing.push({
        planName: "Detected pricing",
        price: priceMatches.slice(0, 5).join(", "),
        features: [],
      });
  }

  // ── TESTIMONIALS ──
  const testimonials: Array<{
    text: string; author: string; result: string
  }> = [];
  const testimonialSelectors = [
    "[class*='testimonial']",
    "[class*='review']",
    "[class*='quote']",
    "blockquote",
    "[class*='feedback']",
    "[class*='customer']",
  ];
  for (const sel of testimonialSelectors) {
    $(sel).each((_, el) => {
      const text =
        $(el).find("p, [class*='text'], [class*='body']").first().text().trim() ||
        $(el).text().trim();
      const author = $(el)
        .find("[class*='name'], [class*='author'], cite, strong")
        .first().text().trim();
      if (text.length > 20 && text.length < 500 && testimonials.length < 8) {
        const resultMatch = text.match(
          /(\d+%|\d+x|\d+X|increased|improved|reduced|saved|grew)/i
        );
        testimonials.push({
          text: text.slice(0, 300),
          author: author || "Anonymous",
          result: resultMatch ? resultMatch[0] : "",
        });
      }
    });
    if (testimonials.length >= 5) break;
  }

  // ── SOCIAL PROOF ──
  const bodyTextFull = $("body").text();
  const reviewCountMatch = bodyTextFull.match(
    /(\d[\d,]+)\s*(?:reviews?|ratings?|customers?|clients?|users?)/i
  );
  const starRatingMatch = bodyTextFull.match(
    /(\d\.?\d?)\s*(?:out of 5|\/5|stars?)/i
  );
  const customerCountMatch = bodyTextFull.match(
    /(\d[\d,]+\+?)\s*(?:customers?|clients?|businesses?|companies|users?|brands?)/i
  );
  const clientLogos: string[] = [];
  $(
    "[class*='logo'], [class*='client'], [class*='partner'], [class*='brand']"
  )
    .find("img")
    .each((_, el) => {
      const alt = $(el).attr("alt")?.trim();
      if (alt && alt.length > 1 && clientLogos.length < 10)
        clientLogos.push(alt);
    });
  const pressLogos: string[] = [];
  $(
    "[class*='press'], [class*='media'], [class*='featured'], [class*='as-seen']"
  )
    .find("img, a")
    .each((_, el) => {
      const text =
        $(el).attr("alt")?.trim() || $(el).text().trim();
      if (text && text.length > 1 && pressLogos.length < 8)
        pressLogos.push(text);
    });
  const certifications: string[] = [];
  $(
    "[class*='cert'], [class*='badge'], [class*='award'], [class*='accredit']"
  ).each((_, el) => {
    const text =
      $(el).text().trim() ||
      $(el).find("img").attr("alt")?.trim() || "";
    if (text && text.length > 2 && certifications.length < 5)
      certifications.push(text.slice(0, 80));
  });
  const socialProof = {
    reviewCount: reviewCountMatch?.[1] ?? "",
    starRating: starRatingMatch?.[1] ?? "",
    clientLogos,
    pressLogos,
    certifications,
    customerCount: customerCountMatch?.[1] ?? "",
  };

  // ── NAVIGATION ──
  const navigation: string[] = [];
  const seenNav = new Set<string>();
  $("nav a, header a, [role=navigation] a").each((_, el) => {
    const t = $(el).text().trim();
    if (t && t.length < 50 && !seenNav.has(t)) {
      seenNav.add(t);
      navigation.push(t);
    }
  });

  // ── META ──
  const metaTitle = $("title").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ??
    $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const canonical =
    $('link[rel="canonical"]').attr("href")?.trim() ?? "";

  // ── TRUST SIGNALS ──
  const trust: Array<{ text: string; type: string }> = [];
  const seenTrust = new Set<string>();
  const trustPatterns: Array<{ pattern: RegExp; type: string }> = [
    { pattern: /guarantee|guaranteed/i, type: "guarantee" },
    { pattern: /money.back/i, type: "money-back-guarantee" },
    { pattern: /no.risk|risk.free/i, type: "risk-reversal" },
    { pattern: /★|⭐|stars?|rated/i, type: "rating" },
    { pattern: /certified|certification/i, type: "certification" },
    { pattern: /award|winner/i, type: "award" },
    { pattern: /trusted by|as seen in|featured in/i, type: "authority" },
    { pattern: /ssl|secure|encrypted/i, type: "security" },
    { pattern: /privacy|gdpr|ccpa/i, type: "privacy" },
    { pattern: /free trial|free forever|no credit card/i, type: "low-risk-offer" },
  ];
  $("body *").each((_, el) => {
    const text =
      $(el).children().length === 0 ? $(el).text().trim() : "";
    if (!text || text.length < 5 || text.length > 300) return;
    for (const { pattern, type } of trustPatterns) {
      if (pattern.test(text) && !seenTrust.has(text)) {
        seenTrust.add(text);
        trust.push({ text: text.slice(0, 200), type });
        break;
      }
    }
  });

  // Capture announcement bars and trust tickers
  $(
    [
      "[class*='announcement']",
      "[class*='marquee']",
      "[class*='ticker']",
      "[class*='trust-bar']",
      "[class*='benefits']",
      "[class*='usp']",
      "[class*='strip']",
      ".bar",
      "#shopify-section-announcement-bar",
    ].join(", ")
  ).each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (
      text &&
      text.length > 5 &&
      text.length < 500 &&
      !seenTrust.has(text)
    ) {
      seenTrust.add(text);
      trust.push({
        text: text.slice(0, 300),
        type: "announcement-bar",
      });
    }
  });

  // ── IMAGES ──
  const images: Array<{ alt: string; hasAlt: boolean; src: string }> = [];
  $("img").each((_, el) => {
    const alt = $(el).attr("alt")?.trim() ?? "";
    const src = $(el).attr("src")?.trim() ?? "";
    if (images.length < 15)
      images.push({ alt, hasAlt: alt.length > 0, src: src.slice(0, 100) });
  });

  // ── FORMS ──
  const forms: Array<{
    fields: string[]; submitText: string; fieldCount: number
  }> = [];
  $("form").each((_, form) => {
    const fields: string[] = [];
    $(form)
      .find(
        "input:not([type=hidden]):not([type=submit]), textarea, select"
      )
      .each((_, el) => {
        const label =
          $(el).attr("placeholder") ??
          $(el).attr("name") ??
          $(el).attr("aria-label") ??
          $(el).attr("id") ?? "";
        if (label) fields.push(label);
      });
    const submitText =
      $(form)
        .find("[type=submit], button[type=submit], button:last-child")
        .first()
        .text()
        .trim() || "Submit";
    if (fields.length > 0 && forms.length < 5)
      forms.push({ fields, submitText, fieldCount: fields.length });
  });

  // ── CONTACT SIGNALS ──
  const hasPhoneNumber =
    /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/.test(bodyTextFull);
  const hasEmailAddress =
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(bodyTextFull);
  const hasAddress =
    /(street|avenue|blvd|suite|floor|\bst\b|\bave\b)/i.test(bodyTextFull);

  // ── STRUCTURED DATA ──
  const structured_data: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "{}");
      const t =
        typeof json["@type"] === "string"
          ? json["@type"]
          : json["@type"]?.[0];
      if (t) structured_data.push(t);
    } catch { /* ignore */ }
  });

  return {
    url, pageType, headlines, sections, paragraphs,
    buttons, hero, pricing, testimonials, socialProof,
    navigation,
    meta: {
      title: metaTitle,
      description: metaDescription,
      ogTitle, ogDescription, canonical,
    },
    trust, images, forms, wordCount, h1Count, ctaCount,
    hasPhoneNumber, hasEmailAddress, hasAddress, structured_data,
  };
}

const MAX_PARAGRAPH_CHARS = 4000;

export function truncatePageParagraphs(page: ExtractedPage): ExtractedPage {
  if (page.paragraphs.length <= MAX_PARAGRAPH_CHARS) return page;
  return {
    ...page,
    paragraphs: page.paragraphs.slice(0, MAX_PARAGRAPH_CHARS) + "...",
  };
}
