/**
 * Site type detection from homepage signals.
 * Runs before analysis and gates the rest of the pipeline.
 * Classifies into: ecommerce | saas | service | local | content | unknown
 */

import type { CombinedExtraction } from "./scraper";
import type { SiteType } from "./reportSchema";

export type { SiteType };

const SITE_TYPES: SiteType[] = [
  "ecommerce",
  "saas",
  "service",
  "local",
  "content",
];

// Phrases (case-insensitive) and path patterns per type
const ECOMMERCE = {
  phrases: [
    "add to cart",
    "add to bag",
    "buy now",
    "checkout",
    "shop",
    "shop now",
    "shopping cart",
    "view cart",
    "your cart",
    "add to basket",
  ],
  paths: [/\/products?\//i, /\/collections?\//i, /\/cart\/?/i, /\/shop\/?/i],
  pricePattern: /\$\d{1,6}(\.\d{2})?|\d+\.\d{2}\s*\$/, // $XX.XX or XX.XX $
};

const SAAS = {
  phrases: [
    "free trial",
    "start free",
    "sign up",
    "signup",
    "dashboard",
    "per month",
    "per user",
    "per seat",
    "/month",
    "/user",
    "start for free",
    "try free",
    "get started free",
    "workspace",
    "integration",
    "api",
    "webhook",
    "automation",
    "workflow",
    "sync",
    "connect your",
    "team of",
    "seats",
    "users",
  ],
  paths: [/\/pricing\/?/i, /\/features\/?/i, /\/integrations?\/?/i],
};

const SERVICE = {
  phrases: [
    "book",
    "schedule",
    "consultation",
    "appointment",
    "call us",
    "request a quote",
    "get a quote",
    "contact us",
    "hire us",
  ],
  paths: [/\/services?\/?/i, /\/booking\/?/i, /\/contact\/?/i],
  phonePattern: /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
};

const LOCAL = {
  phrases: [
    "near me",
    "hours of operation",
    "open today",
    "visit us",
    "our location",
    "get directions",
    "find us",
    "hours",
    "open",
    "closed",
    "walk-in",
    "appointment",
    "location",
  ],
  paths: [], // address/city/state are in text
  addressLike: /\b\d+\s+[\w\s]+(?:street|st|ave|avenue|blvd|road|rd|drive|dr|lane|ln)\b/i,
  cityState: /\b(?:alabama|alaska|arizona|california|colorado|connecticut|delaware|florida|georgia|hawaii|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i,
  mapsEmbed: /maps\.google|google\.com\/maps|embed.*map/i,
  yelpTripAdvisor: /yelp\.com|tripadvisor\.com/i,
  localBusinessSchema: /localbusiness/i,
  areaCodePhone: /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/,
};

const CONTENT = {
  phrases: [
    "newsletter",
    "subscribe",
    "read more",
    "latest posts",
    "published",
    "author:",
    "author",
    "by ",
    "min read",
  ],
  paths: [/\/blog\/?/i, /\/articles?\/?/i, /\/guides?\/?/i, /\/resources?\/?/i],
  datePattern: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/i,
};

function collectHomepageText(extraction: CombinedExtraction): { text: string; hrefs: string } {
  if (!extraction.rawHtml) return { text: "", hrefs: "" };
  const hrefMatches = [...extraction.rawHtml.matchAll(/href=["']([^"']+)["']/gi)];
  const hrefs = hrefMatches.map((m) => m[1]).join(" ").toLowerCase();
  const text = extraction.rawHtml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return { text, hrefs };
}

function scoreType(
  type: SiteType,
  text: string,
  hrefs: string
): number {
  let score = 0;

  switch (type) {
    case "ecommerce": {
      for (const p of ECOMMERCE.phrases) {
        if (text.includes(p)) score += 2;
      }
      for (const re of ECOMMERCE.paths) {
        if (re.test(hrefs)) score += 2;
      }
      if (ECOMMERCE.pricePattern.test(text)) score += 1;
      break;
    }
    case "saas": {
      for (const p of SAAS.phrases) {
        if (text.includes(p)) score += 2;
      }
      for (const re of SAAS.paths) {
        if (re.test(hrefs)) score += 2;
      }
      break;
    }
    case "service": {
      for (const p of SERVICE.phrases) {
        if (text.includes(p)) score += 2;
      }
      for (const re of SERVICE.paths) {
        if (re.test(hrefs)) score += 2;
      }
      if (SERVICE.phonePattern.test(text)) score += 1;
      break;
    }
    case "local": {
      for (const p of LOCAL.phrases) {
        if (text.includes(p)) score += 3;
      }
      if (LOCAL.addressLike.test(text)) score += 3;
      if (LOCAL.cityState.test(text)) score += 1;
      if (LOCAL.mapsEmbed.test(text) || LOCAL.mapsEmbed.test(hrefs)) score += 3;
      if (LOCAL.yelpTripAdvisor.test(hrefs)) score += 3;
      if (LOCAL.localBusinessSchema.test(text)) score += 3;
      if (LOCAL.areaCodePhone.test(text)) score += 3;
      break;
    }
    case "content": {
      for (const p of CONTENT.phrases) {
        if (text.includes(p)) score += 2;
      }
      let contentPathHits = 0;
      for (const re of CONTENT.paths) {
        if (re.test(hrefs)) contentPathHits++;
      }
      if (contentPathHits >= 2) score += 3; // blog + articles or similar
      if (CONTENT.datePattern.test(text)) score += 1;
      // No strong product/service CTAs: if we have few ecommerce/saas/service signals, content gets a boost
      break;
    }
    default:
      return 0;
  }

  return score;
}

/** Classify site type from homepage (first page) of the extraction. Gates all downstream analysis. */
export function detectSiteType(extraction: CombinedExtraction): SiteType {
  const { text, hrefs } = collectHomepageText(extraction);
  if (!text.trim()) return "unknown";

  let best: SiteType = "unknown";
  let bestScore = 0;

  for (const type of SITE_TYPES) {
    const s = scoreType(type, text, hrefs);
    if (s > bestScore) {
      bestScore = s;
      best = type;
    }
  }

  // Content: boost when blog/articles/guides dominate and no strong product CTAs
  const contentScore = scoreType("content", text, hrefs);
  const ecomScore = scoreType("ecommerce", text, hrefs);
  const saasScore = scoreType("saas", text, hrefs);
  const serviceScore = scoreType("service", text, hrefs);
  if (
    contentScore >= 2 &&
    ecomScore < 2 &&
    saasScore < 2 &&
    serviceScore < 2 &&
    contentScore >= bestScore
  ) {
    best = "content";
    bestScore = contentScore;
  }

  // Force local when all three hard signals are present, regardless of other scores
  if (LOCAL.addressLike.test(text) && SERVICE.phonePattern.test(text) && /\bhours\b/.test(text)) {
    return "local";
  }

  return bestScore > 0 ? best : "unknown";
}
