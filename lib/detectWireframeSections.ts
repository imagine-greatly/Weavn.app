/**
 * Maps homepage HTML to wireframe section keys for /analyze diagnostic UI.
 * Falls back to a full default stack when detection is thin.
 */

export type WireSectionKey = "nav" | "hero" | "features" | "testimonials" | "pricing" | "cta" | "footer";

export const WIREFRAME_SECTION_HEIGHTS: Record<WireSectionKey, number> = {
  nav: 32,
  hero: 160,
  features: 100,
  testimonials: 80,
  pricing: 120,
  cta: 70,
  footer: 28,
};

export const DEFAULT_STACK: WireSectionKey[] = [
  "nav",
  "hero",
  "features",
  "testimonials",
  "pricing",
  "cta",
  "footer",
];

/**
 * Heuristic section detection from raw HTML (no cheerio required on client).
 */
export function detectSectionsFromHtml(html: string): WireSectionKey[] {
  const lower = html.toLowerCase();
  const found = new Set<WireSectionKey>();

  found.add("nav");
  found.add("hero");

  if (
    /(class|id)=["'][^"']*(feature|benefits?|services?-grid|value-prop)[^"']*["']/i.test(html) ||
    lower.includes("our services") ||
    lower.includes("why choose")
  ) {
    found.add("features");
  }

  if (
    /(class|id)=["'][^"']*(testimonial|review|quote|social-proof)[^"']*["']/i.test(html) ||
    /(testimonial|customer review|what (our )?clients say)/i.test(lower)
  ) {
    found.add("testimonials");
  }

  if (
    /(class|id)=["'][^"']*(pricing|plans?|pricelist)[^"']*["']/i.test(html) ||
    /\b(pricing|plans? & pricing|choose your plan)\b/i.test(lower)
  ) {
    found.add("pricing");
  }

  if (
    /(class|id)=["'][^"']*(cta|call-to-action|get-started)[^"']*["']/i.test(html) ||
    /\b(book a call|schedule|get started|contact us|request quote)\b/i.test(lower)
  ) {
    found.add("cta");
  }

  found.add("footer");

  const ordered = DEFAULT_STACK.filter((k) => found.has(k));
  return ordered.length >= 4 ? ordered : DEFAULT_STACK;
}

export function totalWireframeHeight(sections: WireSectionKey[]): number {
  return sections.reduce((sum, k) => sum + WIREFRAME_SECTION_HEIGHTS[k], 0);
}
