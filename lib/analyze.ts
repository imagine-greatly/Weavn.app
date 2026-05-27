/**
 * Send combined site extraction to Claude and return structured report.
 * Uses claude-sonnet-4-6 and the conversion psychologist system prompt.
 * Retries once on AI failure.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { CombinedExtraction } from "./scraper";
import { extractPageData } from "@/lib/analyzePipeline";
import type {
  ReportPayload,
  SiteType,
  ConversionKiller,
  ConversionTransformation,
  GrowthBlueprint,
  RevenueEffortLabel,
  EffortToFix,
  DimensionScoreRow,
} from "./reportSchema";

const SYSTEM_PROMPT_BASE = `You are a senior conversion intelligence analyst. You identify exactly why visitors are not converting on this site and what must change for them to convert. Be surgical and specific — quote actual text from the page, name exact elements by their visible label or position, and give precise directives. A founder must read each finding in 10 seconds and know exactly what to change. Never be generic.

VOICE AND TONE — READ BEFORE WRITING ANY OUTPUT:

webdoc is a precision diagnostic system. Every output is written in the voice of a world-class conversion specialist delivering a formal assessment. They have already done the analysis. They know exactly what is wrong. They present findings with the confidence of someone who has diagnosed hundreds of sites and is not here to soften the truth.

This voice is:
- AUTHORITATIVE — states findings as fact, never hedges with "may", "could", "might"
- PRECISE — names the specific element, describes exactly what is there, not what category of problem it represents
- DIRECT — gets to the point immediately, no dramatic openers, no buildup
- ZERO FLUFF — every sentence earns its place, nothing vague or generic

VOCABULARY BAN — never use these in any output field:
boost, unlock, seamless, pain points, actionable insights, revenue leak, money leak, leaks (in a conversion sense), costing you conversions. Say instead: revenue suppression, suppressing conversions, resolve / resolution, finding.

FINDING TITLES — one sentence, names the specific problem, no jargon compound nouns:
BAD: "Primary CTA Absent in Hero Viewport"
GOOD: "The Buy Button Does Not Exist on the First Screen Visitors See"
BAD: "Trust Signal Density Below Conversion Threshold"
GOOD: "Nothing on This Page Gives a First-Time Visitor a Reason to Trust You"

EVIDENCE (exitTrigger and evidence fields) — describes what exists and what the visitor experiences, observational, no interpretation yet:
BAD: "Hero section lacks primary CTA above the fold on the majority of viewport sizes"
GOOD: "The hero section contains no call to action. The first button on the page is 'Add' in the product grid, appearing after two full scroll lengths. Visitors with purchase intent have no forward path from the opening screen."

IMPLEMENTATION — state WHAT to change and WHERE, specific enough that a developer acts without a follow-up question. Start with a verb. Max 55 words. Do not write the final copy — give the directive:
BAD: "Implement above-fold CTA architecture to improve conversion path visibility"
GOOD: "Add a single primary CTA button inside the hero section — destination: the main product or signup page. The current hero has no button element. Place it directly below the headline as the visually dominant interactive element on the first screen."
BAD: "Improve trust signaling across key conversion touchpoints"
GOOD: "Add total orders shipped, your strongest customer review with a real name, and your return policy directly in the hero section — all three are absent above the fold. Insert as three short lines below the primary CTA."`;

const SITE_TYPE_INSTRUCTIONS: Record<SiteType, string> = {
  ecommerce: `Focus on purchase psychology. Every finding should relate to why someone would hesitate to buy or click away before purchasing. The goal of this site is transactions.`,
  saas: `Focus on comprehension and trial conversion. Every finding should relate to whether the visitor understands the product and feels safe trying it. The goal is signups.`,
  service: `Focus on credibility and contact conversion. Every finding should relate to whether the visitor trusts this business enough to reach out. The goal is leads/bookings.`,
  local: `Focus on local trust and findability. Every finding should relate to whether someone searching locally would choose this business. The goal is calls and visits.`,
  content: `Focus on SEO and reader conversion. Every finding should relate to whether this content attracts the right visitors and converts them into subscribers or customers.`,
  unknown: `Apply general conversion psychology across dimensions. Every finding should relate to why visitors might leave or fail to convert.`,
};

function buildSystemPrompt(siteType: SiteType): string {
  const instructions = SITE_TYPE_INSTRUCTIONS[siteType];
  return `${SYSTEM_PROMPT_BASE}

SITE TYPE: ${siteType.toUpperCase()}.

${instructions}

LANGUAGE HANDLING — If the page content is primarily in a non-English language, identify the language in the diagnosticBrief and conduct the full analysis in that context. Quote page elements in their original language. Do not translate copy and then critique the translation. Apply conversion principles universally but ground evidence in the actual language of the page. If you cannot read the language well enough to produce specific evidence-based findings, state this clearly in the diagnosticBrief rather than producing generic findings.

Return valid JSON matching this schema exactly:
{
  "diagnosticBrief": string,
  "intelligenceBrief": string,
  "conversionScore": number,
  "siteIntelligence": string,
  "siteType": string,
  "pagesAnalyzed": string[],
  "conversionTransformation": {
    "currentHeadline": string,
    "currentSubheadline": string,
    "currentCta": string,
    "rewrittenHeadline": string,
    "rewrittenSubheadline": string,
    "rewrittenCta": string,
    "rewrittenHeadlineAlternatives": string[],
    "rewrittenSubheadlineAlternatives": string[],
    "rewrittenCtaAlternatives": string[],
    "trustArchitecture": string,
    "pageFlowNote": string
  },
  "conversionKillers": [
    {
      "id": string,
      "title": string,
      "exitTrigger": string,
      "evidence": string,
      "conversionCost": string,
      "implementation": string,
      "effort": "Today" | "This Week" | "This Month",
      "severity": "critical" | "high" | "medium",
      "category": string,
      "sourcePage": string
    }
  ],
  "growthBlueprint": {
    "weekOne": string[],
    "weekTwoToFour": string[],
    "monthTwo": string,
    "projectedLift": string,
    "projectedLiftNarrative": string
  },
  "dimensionScores": [
    {
      "dimension": "Conversion Architecture" | "Trust Signals" | "Message Clarity" | "Traffic Readiness" | "Technical Foundation",
      "score": number,
      "insight": string
    }
  ],
  "categoryScores": {
    "psychology": number,
    "messaging": number,
    "conversion": number,
    "seo": number,
    "ux": number,
    "trust": number
  },
  "healthScore": number
}

Rules:
- diagnosticBrief: REQUIRED — max 72 words; cover site classification, score read, dominant suppression pattern with finding count, and the highest-leverage resolution. Be specific to this domain — cite real page elements. diagnosticBrief may duplicate intelligenceBrief or intelligenceBrief may be omitted.
- intelligenceBrief: optional legacy; if present without diagnosticBrief, use as executive narrative
- conversionKillers: minimum 3, maximum 7, ranked by revenue impact. If the site has fewer than 3 genuine conversion problems, produce only what exists — do not invent findings to reach a minimum. If the site has more than 7 genuine problems, surface the 7 highest revenue impact issues. Never produce a finding you cannot support with specific evidence from the page. Titles under 10 words; evidence must quote actual page text — max 45 words per evidence field
- conversionKillers evidence — Never cite carousel or slider content as incomplete or cut off. If testimonials, images, or content blocks appear to be part of a carousel or slider based on surrounding HTML structure, treat the full carousel as present and fully populated even if only one slide is visible in the snapshot.
- conversionKillers.exitTrigger: The specific experience the visitor has on the page that causes them to hesitate, doubt, or leave. Name the exact element and quote its visible text. Describe what they see or feel — not the business consequence. Example: 'Hero headline reads "Welcome" — visitor cannot determine what the site sells or who it is for.'
- conversionKillers.conversionCost: The business consequence in concrete terms — lost sales, abandoned signups, missed leads. Use a specific metric or percentage where accurate. These two fields must never contain the same text. exitTrigger = visitor experience. conversionCost = business impact.
- conversionKillers.implementation: Name the exact element and its page location. State the precise change a developer or marketer could act on immediately. Include why the change works. Start with a verb. Max 55 words. No category advice — be specific enough that a developer knows exactly what to do without follow-up questions.
- conversionKillers.sourcePage: Label the page this finding comes from — e.g. "LANDING PAGE", "PRICING PAGE", "FEATURES PAGE", "ABOUT PAGE", "CONTACT PAGE". For single-page analyses always use "LANDING PAGE".
- conversionTransformation.currentCta: Only return text if a clear, intentional hero-section call-to-action button exists above the fold. If the only buttons found are generic UI elements like 'Add', 'Add to cart', 'Menu', 'Search', or navigation links, return 'None detected' instead. Do not invent a CTA that is not clearly present as a primary action.
- growthBlueprint: weekOne and weekTwoToFour max 3 items each; monthTwo, projectedLift, and projectedLiftNarrative each max 70 words; weekOne actions must directly reference and address the highest-severity conversionKillers by their specific finding titles; weekTwoToFour must address remaining conversionKillers; every action item must name the specific element or issue it resolves — no generic advice; the blueprint is the execution plan for the findings, not a separate generic CRO checklist
- dimensionScores: exactly 5 objects one per dimension; score 0-100; insight max 30 words, specific to this site with reference to actual page evidence
- conversionScore: integer 0-100
- healthScore: same value as conversionScore for backwards compatibility
- Return only valid JSON, no markdown, no preamble
- VOCABULARY: never use boost, unlock, seamless, pain points, actionable insights, revenue leak, money leak, or "costing you conversions" — use revenue suppression, suppressing conversions, resolve / resolution, finding
- FINAL CHECK: before returning, for every conversionKiller ask — (1) does the title name a specific element or a category? (2) does the evidence state an observable fact or hedge? (3) does the implementation name the exact element and change or give category advice? Rewrite any that fail.
- DYNAMIC CONTENT RULE — Before flagging any finding about missing, incomplete, or absent content, ask: could this be dynamic content that is not visible in a static HTML snapshot? Never flag as missing or broken: carousel or slider content (only one slide visible), tab panel content (only active tab captured), accordion content (collapsed panels not in DOM), modal or popup content (not open in snapshot), lazy-loaded images or text (may not have loaded), animated counters or numbers (may show initial value), video content (not capturable from HTML), or infinite scroll content (only first batch captured). Only flag content issues when the absence is clearly structural and not a rendering artifact of JavaScript-driven dynamic components. If surrounding HTML suggests a dynamic component — look for classes like swiper, slick, carousel, tabs, accordion, collapse, lazy — treat the component as fully functional and populated.
- UNREACHABLE PAGES — If the user message lists pages that were attempted but failed to load, do not generate findings about content that should be on those pages — note that the page was unreachable instead.
- TRUNCATED CONTENT — If you see a [WEBDOC: content truncated] comment in any page content, do NOT generate findings about content being cut off, incomplete, or mid-sentence — this is a technical scraper limitation not a real page issue. Only flag content issues when incompleteness is clearly structural.`;
}

function clampScore(v: number): number {
  return Math.min(100, Math.max(0, Math.round(Number(v))));
}

function mapCiDimensionScoresToRows(raw: unknown): DimensionScoreRow[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((row, i) => {
    const r = row as Record<string, unknown>;
    const label = String(r.dimension ?? `dimension-${i}`);
    const score = clampScore(Number(r.score ?? 0));
    const insight = String(r.insight ?? "");
    const status: DimensionScoreRow["status"] =
      score >= 80 ? "strong" : score >= 60 ? "fair" : score >= 40 ? "weak" : "critical";
    return {
      id: `ci-${i}`,
      label,
      description: insight,
      score,
      failCount: 0,
      totalCount: 1,
      status,
    };
  });
}

function mapConversionKillerToLeak(
  input: Record<string, unknown>,
  idx: number
): ReportPayload["leaks"][number] {
  const sevStr = String(input.severity ?? "").toLowerCase();
  const mappedSeverity: "critical" | "warning" | "passing" =
    sevStr === "critical" ? "critical" : sevStr === "passing" ? "passing" : "warning";
  const effortRaw = String(input.effort ?? "This Week");
  const effortToFix: EffortToFix =
    effortRaw === "Today" ? "low" : effortRaw === "This Month" ? "high" : "medium";
  let revenueImpact = 0;
  if (sevStr === "critical") revenueImpact = 9;
  else if (sevStr === "high") revenueImpact = 7;
  else if (sevStr === "medium") revenueImpact = 4;
  const evidence = String(input.evidence ?? "");
  const exitTrigger = String(input.exitTrigger ?? "");
  const conversionCost = String(input.conversionCost ?? "");
  const implementation = String(input.implementation ?? "");
  const revenueEffort: RevenueEffortLabel =
    effortRaw === "Today" || effortRaw === "This Week" || effortRaw === "This Month"
      ? effortRaw
      : "This Week";

  const id = String(input.id ?? `ck-${idx}`);
  const title = String(input.title ?? "");

  return {
    id,
    category: String(input.category ?? "general"),
    severity: mappedSeverity,
    type: "existing",
    title,
    revenueTitle: title,
    ...(evidence.trim() ? { evidence: evidence.trim() } : {}),
    ...(conversionCost.trim() ? { businessCost: conversionCost.trim() } : {}),
    revenueEffort,
    whatWeFound: evidence || exitTrigger,
    whyItMatters: [exitTrigger, conversionCost].filter((x) => x.trim()).join(" — ") || conversionCost,
    howToFixIt: implementation,
    exampleFix: implementation,
    psychologyPrinciple: exitTrigger,
    revenueImpact,
    effortToFix,
    timeToFix:
      effortRaw === "Today" ? "~2 hours" : effortRaw === "This Month" ? "~30 days" : "1–3 days",
  };
}

function parseConversionIntelligencePayload(o: Record<string, unknown>, siteType: SiteType, fallbackPages?: string[]): ReportPayload {
  const categoryScoresIn = (o.categoryScores as Record<string, number>) ?? {};
  const pagesAnalyzed =
    Array.isArray(o.pagesAnalyzed) && o.pagesAnalyzed.length > 0
      ? o.pagesAnalyzed.map(String)
      : (fallbackPages ?? []);
  const convScore = clampScore(Number(o.conversionScore ?? o.healthScore ?? 50));
  const ct = (o.conversionTransformation as Record<string, unknown>) ?? {};
  const gb = (o.growthBlueprint as Record<string, unknown>) ?? {};
  const killersRaw = Array.isArray(o.conversionKillers) ? o.conversionKillers : [];
  const leaks = killersRaw.map((k, i) => mapConversionKillerToLeak(k as Record<string, unknown>, i));

  const weekOne = Array.isArray(gb.weekOne) ? gb.weekOne.map((x) => String(x)) : [];
  const weekTwo = Array.isArray(gb.weekTwoToFour) ? gb.weekTwoToFour.map((x) => String(x)) : [];

  const psychNote = [ct.trustArchitecture, ct.pageFlowNote]
    .filter((x) => typeof x === "string" && String(x).trim())
    .map(String)
    .join("\n\n");

  const conversionKillers: ConversionKiller[] = killersRaw.map((k, i) => {
    const r = k as Record<string, unknown>;
    const effort = r.effort;
    const e: RevenueEffortLabel =
      effort === "Today" || effort === "This Week" || effort === "This Month"
        ? effort
        : "This Week";
    const sev = r.severity;
    const s: "critical" | "high" | "medium" =
      sev === "critical" || sev === "high" || sev === "medium" ? sev : "medium";
    return {
      id: String(r.id ?? `ck-${i}`),
      title: String(r.title ?? ""),
      exitTrigger: String(r.exitTrigger ?? ""),
      evidence: String(r.evidence ?? ""),
      conversionCost: String(r.conversionCost ?? ""),
      implementation: String(r.implementation ?? ""),
      effort: e,
      severity: s,
      category: String(r.category ?? "general"),
      sourcePage: typeof r.sourcePage === "string" && r.sourcePage.trim() ? r.sourcePage.trim() : undefined,
    };
  });

  const altStrings = (key: string): string[] =>
    Array.isArray(ct[key])
      ? (ct[key] as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];

  const conversionTransformation: ConversionTransformation = {
    currentHeadline: String(ct.currentHeadline ?? ""),
    currentSubheadline: String(ct.currentSubheadline ?? ""),
    currentCta: String(ct.currentCta ?? ""),
    rewrittenHeadline: String(ct.rewrittenHeadline ?? ""),
    rewrittenSubheadline: String(ct.rewrittenSubheadline ?? ""),
    rewrittenCta: String(ct.rewrittenCta ?? ""),
    rewrittenHeadlineAlternatives: altStrings("rewrittenHeadlineAlternatives"),
    rewrittenSubheadlineAlternatives: altStrings("rewrittenSubheadlineAlternatives"),
    rewrittenCtaAlternatives: altStrings("rewrittenCtaAlternatives"),
    trustArchitecture: String(ct.trustArchitecture ?? ""),
    pageFlowNote: String(ct.pageFlowNote ?? ""),
  };

  const projectedLiftNarrativeRaw =
    typeof gb.projectedLiftNarrative === "string"
      ? String(gb.projectedLiftNarrative).trim()
      : "";
  const growthBlueprint: GrowthBlueprint = {
    weekOne,
    weekTwoToFour: weekTwo,
    monthTwo: String(gb.monthTwo ?? ""),
    projectedLift: String(gb.projectedLift ?? ""),
    ...(projectedLiftNarrativeRaw ? { projectedLiftNarrative: projectedLiftNarrativeRaw } : {}),
  };

  const dimensionScores = mapCiDimensionScoresToRows(o.dimensionScores);
  const diagnosticBriefRaw =
    typeof o.diagnosticBrief === "string" ? String(o.diagnosticBrief).trim() : "";
  const intelBrief =
    diagnosticBriefRaw ||
    (typeof o.intelligenceBrief === "string" ? o.intelligenceBrief.trim() : "");
  const siteIntelRaw =
    typeof o.siteIntelligence === "string" ? o.siteIntelligence.trim() : "";
  const siteIntel =
    siteIntelRaw && siteIntelRaw.toLowerCase() !== "unknown" ? siteIntelRaw : "";

  const topLeakMapped = mapLegacyLeakToNew((o.topLeak as Record<string, unknown>) ?? {}, "top-leak");
  const topLeak = topLeakMapped ?? leaks[0];

  return {
    site_type: siteType,
    healthScore: convScore,
    growthScore: convScore,
    conversionScore: convScore,
    pagesAnalyzed,
    categoryScores: {
      psychology: clampScore(categoryScoresIn.psychology ?? 50),
      messaging: clampScore(categoryScoresIn.messaging ?? 50),
      conversion: clampScore(categoryScoresIn.conversion ?? 50),
      seo: clampScore(categoryScoresIn.seo ?? 50),
      ux: clampScore(categoryScoresIn.ux ?? 50),
      trust: clampScore(categoryScoresIn.trust ?? 50),
    },
    topLeak,
    leaks,
    ...(intelBrief
      ? {
          intelligenceBrief: intelBrief,
          ...(diagnosticBriefRaw ? { diagnosticBrief: diagnosticBriefRaw } : {}),
        }
      : {}),
    ...(siteIntel ? { siteIntelligence: siteIntel } : {}),
    conversionTransformation,
    conversionKillers,
    growthBlueprint,
    ...(dimensionScores ? { dimensionScores } : {}),
    heroRewrite: {
      currentHeadline: String(ct.currentHeadline ?? ""),
      currentSubheadline: String(ct.currentSubheadline ?? "Not found"),
      currentCta: String(ct.currentCta ?? "No CTA found"),
      suggestedHeadline: String(ct.rewrittenHeadline ?? ""),
      suggestedSubheadline: String(ct.rewrittenSubheadline ?? ""),
      suggestedCta: String(ct.rewrittenCta ?? ""),
      psychologistsNote: psychNote,
    },
    growthStrategy: {
      biggestOpportunity: String(weekOne[0] ?? gb.projectedLift ?? ""),
      trafficOpportunity: String(weekTwo[0] ?? gb.monthTwo ?? ""),
      conversionOpportunity: String(weekTwo[1] ?? gb.projectedLift ?? ""),
      trustOpportunity: String(weekTwo[2] ?? ""),
      quickWins: weekOne,
      thirtyDayPlan: [weekTwo.join("\n"), gb.monthTwo, gb.projectedLift]
        .filter((x) => typeof x === "string" && String(x).trim())
        .map(String)
        .join("\n\n"),
    },
  };
}

function parseLegacyPsychologistPayload(o: Record<string, unknown>, siteType: SiteType): ReportPayload {
  const categoryScores = (o.categoryScores as Record<string, number>) ?? {};
  const topLeak = (o.topLeak as Record<string, unknown>) ?? {};
  const leaks = Array.isArray(o.leaks) ? o.leaks : [];
  const heroRewrite = (o.heroRewrite as Record<string, unknown>) ?? {};
  const growthStrategy = (o.growthStrategy as Record<string, unknown>) ?? {};
  const pagesAnalyzed = Array.isArray(o.pagesAnalyzed) ? o.pagesAnalyzed : [];

  return {
    site_type: siteType,
    healthScore: clampScore(Number(o.healthScore) ?? 50),
    pagesAnalyzed: pagesAnalyzed.map(String),
    categoryScores: {
      psychology: clampScore(categoryScores.psychology ?? 50),
      messaging: clampScore(categoryScores.messaging ?? 50),
      conversion: clampScore(categoryScores.conversion ?? 50),
      seo: clampScore(categoryScores.seo ?? 50),
      ux: clampScore(categoryScores.ux ?? 50),
      trust: clampScore(categoryScores.trust ?? 50),
    },
    topLeak: mapLegacyLeakToNew(topLeak, "top-leak"),
    leaks: leaks
      .map((l: Record<string, unknown>, idx: number) => mapLegacyLeakToNew(l, `leak-${idx}`)!)
      .filter(Boolean) as ReportPayload["leaks"],
    heroRewrite: {
      currentHeadline: String(heroRewrite.currentHeadline ?? ""),
      currentSubheadline: String(heroRewrite.currentSubheadline ?? "Not found"),
      currentCta: String(heroRewrite.currentCta ?? "No CTA found"),
      suggestedHeadline: String(heroRewrite.suggestedHeadline ?? heroRewrite.headline ?? ""),
      suggestedSubheadline: String(heroRewrite.suggestedSubheadline ?? heroRewrite.subheadline ?? ""),
      suggestedCta: String(heroRewrite.suggestedCta ?? heroRewrite.cta ?? ""),
      psychologistsNote: String(heroRewrite.psychologistsNote ?? heroRewrite.psychologistNote ?? ""),
    },
    growthStrategy: {
      biggestOpportunity: String(growthStrategy.biggestOpportunity ?? ""),
      trafficOpportunity: String(growthStrategy.trafficOpportunity ?? ""),
      conversionOpportunity: String(growthStrategy.conversionOpportunity ?? ""),
      trustOpportunity: String(growthStrategy.trustOpportunity ?? ""),
      quickWins: Array.isArray(growthStrategy.quickWins)
        ? growthStrategy.quickWins.map((q) => String(q))
        : growthStrategy.quickWin != null
          ? [String(growthStrategy.quickWin)]
          : [],
      thirtyDayPlan: String(growthStrategy.thirtyDayPlan ?? ""),
    },
  };
}

function ensurePayload(raw: unknown, siteType: SiteType, fallbackPages?: string[]): ReportPayload {
  const o = raw as Record<string, unknown>;
  if (
    o.heroRewrite != null &&
    typeof o.heroRewrite === "object" &&
    o.conversionTransformation == null &&
    typeof o.intelligenceBrief !== "string" &&
    typeof o.diagnosticBrief !== "string"
  ) {
    return parseLegacyPsychologistPayload(o, siteType);
  }
  return parseConversionIntelligencePayload(o, siteType, fallbackPages);
}

function mapLegacyLeakToNew(input: Record<string, unknown>, fallbackId: string): ReportPayload["leaks"][number] | undefined {
  if (!input || Object.keys(input).length === 0) return undefined;

  const severity = input.severity;
  const mappedSeverity: "critical" | "warning" | "passing" =
    severity === "critical" || severity === "warning" || severity === "passing" ? severity : "warning";

  const effort =
    input.effortToFix === "low" || input.effortToFix === "medium" || input.effortToFix === "high"
      ? input.effortToFix
      : ("medium" as const);

  const revenueImpactRaw = input.revenueImpact;
  const impactScoreRaw = input.impactScore;
  const revenueImpact =
    typeof revenueImpactRaw === "number"
      ? revenueImpactRaw
      : typeof impactScoreRaw === "number"
        ? impactScoreRaw
        : 0;

  return {
    id: String(input.id ?? fallbackId),
    category: String(input.category ?? "general"),
    severity: mappedSeverity,
    title: String(input.title ?? ""),
    whatWeFound: String((input as any).whatWeFound ?? (input as any).description ?? ""),
    whyItMatters: String((input as any).whyItMatters ?? (input as any).evidence ?? ""),
    howToFixIt: String((input as any).howToFixIt ?? (input as any).recommendation ?? ""),
    exampleFix: String((input as any).exampleFix ?? (input as any).aiFix ?? (input as any).recommendation ?? ""),
    psychologyPrinciple: String((input as any).psychologyPrinciple ?? ""),
    revenueImpact,
    effortToFix: effort,
    timeToFix: String(input.timeToFix ?? "1 hour"),
  };
}

function guessPageLabel(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\/pricing/.test(path)) return 'PRICING PAGE';
    if (/\/features/.test(path)) return 'FEATURES PAGE';
    if (/\/(signup|register|trial)/.test(path)) return 'SIGNUP PAGE';
    if (/\/about/.test(path)) return 'ABOUT PAGE';
    if (/\/contact/.test(path)) return 'CONTACT PAGE';
    if (/\/services?/.test(path)) return 'SERVICES PAGE';
    if (/\/products?\//.test(path)) return 'PRODUCT PAGE';
    if (/\/collections?\//.test(path)) return 'COLLECTION PAGE';
    if (/\/blog\//.test(path)) return 'BLOG POST';
  } catch { /* fall through */ }
  return 'SUBPAGE';
}

/**
 * Converts raw HTML into a compact labelled summary for Claude.
 * compact=true reduces per-section limits when combining multiple pages.
 */
function buildSinglePageSummary(rawHtml: string, url: string, compact = false): string {
  let pageType = 'homepage';
  try {
    const path = new URL(url).pathname;
    if (path && path !== '/') {
      const label = guessPageLabel(url);
      pageType = label !== 'SUBPAGE'
        ? label.toLowerCase().replace(/ page$/, '').replace(/\s+/g, '-')
        : 'subpage';
    }
  } catch { /* keep 'homepage' */ }
  const page = extractPageData(rawHtml, url, pageType);
  const parts: string[] = [];

  if (url) parts.push(`URL: ${url}`);

  const metaLines = [
    page.meta.title && `Title: ${page.meta.title}`,
    page.meta.description && `Description: ${page.meta.description}`,
    page.meta.ogTitle && page.meta.ogTitle !== page.meta.title && `OG Title: ${page.meta.ogTitle}`,
    page.meta.ogDescription &&
      page.meta.ogDescription !== page.meta.description &&
      `OG Description: ${page.meta.ogDescription}`,
  ].filter(Boolean);
  if (metaLines.length) parts.push(`META\n${metaLines.join("\n")}`);

  const heroLines = [
    page.hero.headline && `Headline: ${page.hero.headline}`,
    page.hero.subheadline && `Subheadline: ${page.hero.subheadline}`,
    page.hero.ctaText &&
      `CTA: "${page.hero.ctaText}"${page.hero.ctaHref ? ` → ${page.hero.ctaHref}` : ""}`,
    page.hero.bodyText && `Body: ${page.hero.bodyText.slice(0, compact ? 200 : 400)}`,
  ].filter(Boolean);
  if (heroLines.length) parts.push(`HERO\n${heroLines.join("\n")}`);

  const h1s = page.headlines.filter((h) => h.tag === "h1").map((h) => `"${h.text}"`);
  const h2s = page.headlines.filter((h) => h.tag === "h2").slice(0, compact ? 5 : 8).map((h) => `"${h.text}"`);
  const h3s = page.headlines.filter((h) => h.tag === "h3").slice(0, compact ? 3 : 5).map((h) => `"${h.text}"`);
  if (h1s.length) parts.push(`H1: ${h1s.join(" | ")}`);
  if (h2s.length) parts.push(`H2: ${h2s.join(" | ")}`);
  if (h3s.length) parts.push(`H3: ${h3s.join(" | ")}`);

  if (page.sections.length) {
    const sectionText = page.sections
      .slice(0, compact ? 4 : 6)
      .map((s) => `[${s.label}] ${s.text.slice(0, compact ? 200 : 250)}`)
      .join("\n");
    parts.push(`SECTIONS\n${sectionText}`);
  }

  if (page.paragraphs) {
    parts.push(`BODY TEXT\n${page.paragraphs.slice(0, compact ? 1800 : 2000)}`);
  }

  if (page.pricing.length) {
    const pricingText = page.pricing
      .map(
        (p) =>
          `${p.planName}: ${p.price}${p.features.length ? ` | ${p.features.slice(0, 5).join(", ")}` : ""}`
      )
      .join("\n");
    parts.push(`PRICING\n${pricingText}`);
  }

  if (page.testimonials.length) {
    const testText = page.testimonials
      .slice(0, compact ? 2 : 4)
      .map(
        (t) =>
          `"${t.text.slice(0, compact ? 150 : 200)}" — ${t.author}${t.result ? ` [${t.result}]` : ""}`
      )
      .join("\n");
    parts.push(`TESTIMONIALS\n${testText}`);
  }

  const sp = page.socialProof;
  const spParts = [
    sp.reviewCount && `${sp.reviewCount} reviews`,
    sp.starRating && `${sp.starRating} stars`,
    sp.customerCount && `${sp.customerCount} customers`,
    sp.clientLogos.length && `Client logos: ${sp.clientLogos.slice(0, 5).join(", ")}`,
    sp.pressLogos.length && `Press: ${sp.pressLogos.slice(0, 3).join(", ")}`,
    sp.certifications.length && `Certs: ${sp.certifications.slice(0, 3).join(", ")}`,
  ].filter(Boolean);
  if (spParts.length) parts.push(`SOCIAL PROOF: ${spParts.join(" | ")}`);

  if (page.trust.length) {
    const trustText = page.trust
      .slice(0, compact ? 3 : 6)
      .map((t) => t.text.slice(0, 120))
      .join(" | ");
    parts.push(`TRUST SIGNALS: ${trustText}`);
  }

  if (page.buttons.length) {
    const ctaText = page.buttons
      .slice(0, compact ? 6 : 10)
      .map((b) => `"${b.text}"${b.href ? ` → ${b.href}` : ""}`)
      .join(" | ");
    parts.push(`CTAs: ${ctaText}`);
  }

  if (page.navigation.length) {
    parts.push(`NAVIGATION: ${page.navigation.slice(0, 10).join(" | ")}`);
  }

  if (page.forms.length) {
    const formText = page.forms
      .map((f) => `Fields: [${f.fields.slice(0, 5).join(", ")}] → "${f.submitText}"`)
      .join(" | ");
    parts.push(`FORMS: ${formText}`);
  }

  const contact = [
    page.hasPhoneNumber && "phone present",
    page.hasEmailAddress && "email present",
    page.hasAddress && "physical address present",
  ].filter(Boolean);
  if (contact.length) parts.push(`CONTACT: ${contact.join(", ")}`);

  if (page.structured_data.length) {
    parts.push(`SCHEMA.ORG: ${page.structured_data.join(", ")}`);
  }

  if (page.faq && page.faq.length > 0) {
    const faqText = page.faq
      .slice(0, compact ? 3 : 6)
      .map(({ question, answer }) => `Q: ${question}\nA: ${answer.slice(0, compact ? 200 : 350)}`)
      .join("\n\n");
    parts.push(`FAQ\n${faqText}`);
  }

  parts.push(`PAGE STATS: ${page.wordCount} words | ${page.h1Count} H1s | ${page.ctaCount} CTAs`);

  return parts.join("\n\n");
}

export function buildPageSummary(extraction: CombinedExtraction): string {
  const homepageUrl = extraction.pagesAnalyzed[0] ?? "";
  const hasSubpages = extraction.additionalPages && extraction.additionalPages.length > 0;

  if (!hasSubpages) {
    return buildSinglePageSummary(extraction.rawHtml, homepageUrl, false);
  }

  const sections: string[] = [];
  sections.push(`=== [HOMEPAGE] ===\n${buildSinglePageSummary(extraction.rawHtml, homepageUrl, true)}`);
  for (const { url, rawHtml } of extraction.additionalPages!) {
    const label = guessPageLabel(url);
    sections.push(`=== [${label}] ===\n${buildSinglePageSummary(rawHtml, url, true)}`);
  }
  return sections.join("\n\n");
}

export async function runAnalysis(
  extraction: CombinedExtraction,
  siteType: SiteType,
  plan?: string,
  model?: string,
  timeoutMs?: number
): Promise<ReportPayload> {
  const resolvedModel = model ?? "claude-sonnet-4-6";
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 100_000,
  });

  // Hard cap: adaptive per complexity — safety net for callers that bypass scrapeSite truncation.
  let safeExtraction = extraction;
  const hardCap =
    extraction.complexity === 'simple' ? 45_000 :
    extraction.complexity === 'medium' ? 60_000 :
    75_000  // complex
  if (extraction.rawHtml.length > hardCap) {
    process.stderr.write('[ANALYZE] HARD CAP applied: rawHtml ' + extraction.rawHtml.length + ' chars → ' + hardCap + ' (complexity=' + (extraction.complexity ?? 'medium') + ')\n');
    safeExtraction = { ...extraction, rawHtml: extraction.rawHtml.slice(0, hardCap) };
  }
  process.stderr.write('[ANALYZE] rawHtml entering pipeline: ' + safeExtraction.rawHtml.length + ' chars\n');

  const systemPrompt = buildSystemPrompt(siteType);

  process.stderr.write(`[ANALYZE] buildPageSummary START | rawHtml_len=${safeExtraction.rawHtml.length}\n`);
  let summary: string;
  try {
    summary = buildPageSummary(safeExtraction);
  } catch (e) {
    process.stderr.write(`[ANALYZE] buildPageSummary THREW | ${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
    throw e;
  }
  process.stderr.write(`[ANALYZE] buildPageSummary DONE | summary_len=${summary.length}\n`);

  // Hard cap: if summary exceeds 20 000 chars something went wrong — truncate to protect Claude call.
  const cappedSummary = summary.length > 20_000 ? summary.slice(0, 20_000) + "\n\n[summary truncated]" : summary;
  if (summary.length > 20_000) {
    process.stderr.write(`[ANALYZE] WARNING summary exceeded 20 000 chars (${summary.length}) — truncated\n`);
  }

  const isMultiPage = (safeExtraction.additionalPages?.length ?? 0) > 0;
  const pageCount = 1 + (safeExtraction.additionalPages?.length ?? 0);

  const failedPages = (safeExtraction.pagesAttempted ?? []).filter(
    u => !safeExtraction.pagesAnalyzed.includes(u)
  );
  const failureNote = failedPages.length > 0
    ? `\n\nPAGES ATTEMPTED BUT FAILED TO LOAD (treat as unreachable — do not generate findings about content that should be on these pages): ${failedPages.join(', ')}`
    : '';

  const userContent = isMultiPage
    ? `Analyze structured data from ${pageCount} pages of a website. Produce 3-7 findings ranked by revenue impact across all pages. In the evidence field of each finding, name which page it came from.\n\n${cappedSummary}${failureNote}`
    : `Analyze the following structured data extracted from a fully-rendered website page and return your JSON analysis:\n\n${cappedSummary}${failureNote}`;
  process.stderr.write(`[ANALYZE] userContent_len=${userContent.length} isMultiPage=${isMultiPage} failedPages=${failedPages.length}\n`);
  process.stderr.write('[ANALYZE] prompt chars: ' + userContent.length + '\n');

  const complexity = safeExtraction.complexity ?? 'medium'
  const maxTokens = isMultiPage ? 5000 : complexity === 'simple' ? 3500 : 4200

  let attempt = 0;
  const run = async (): Promise<ReportPayload> => {
    attempt++;
    process.stderr.write(`[ANALYZE] claude START | attempt=${attempt} model=${resolvedModel} contentLen=${userContent.length} maxTokens=${maxTokens}\n`);
    const message = await client.messages.create({
      model: resolvedModel,
      max_tokens: maxTokens,
      temperature: 0,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });
    const cacheRead = message.usage?.cache_read_input_tokens ?? 0;
    const cacheWrite = message.usage?.cache_creation_input_tokens ?? 0;
    const cacheHit = cacheRead > 0;
    process.stderr.write(`[ANALYZE] claude DONE | attempt=${attempt} stop_reason=${message.stop_reason} input_tokens=${message.usage?.input_tokens} output_tokens=${message.usage?.output_tokens}\n`);
    process.stderr.write(`[ANALYZE] CACHE | hit=${cacheHit} cache_read=${cacheRead} cache_write=${cacheWrite}\n`);

    if (message.stop_reason === "max_tokens") {
      const err = new Error("Analysis response truncated: max_tokens ceiling reached. Retrying would yield the same result.");
      (err as Error & { noRetry: boolean }).noRetry = true;
      throw err;
    }

    const block = message.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("AI returned no text content.");
    }

    let raw: string = block.text;
    raw = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    process.stderr.write(`[ANALYZE] JSON.parse START | raw_len=${raw.length}\n`);
    const parsed: unknown = JSON.parse(raw);
    process.stderr.write(`[ANALYZE] JSON.parse DONE\n`);
    return ensurePayload(parsed, siteType, safeExtraction.pagesAnalyzed);
  };

  const runStart = Date.now()
  try {
    return await run();
  } catch (firstErr) {
    process.stderr.write(`[ANALYZE] attempt 1 FAILED | ${firstErr instanceof Error ? firstErr.message : String(firstErr)}\n`);
    if ((firstErr as Error & { noRetry?: boolean }).noRetry) throw firstErr;
    const runElapsed = Date.now() - runStart
    const remaining = timeoutMs != null ? timeoutMs - runElapsed : Infinity
    if (remaining < 20_000) {
      process.stderr.write(`[ANALYZE] skipping attempt 2 — ${remaining}ms remaining, need 20000\n`)
      throw firstErr instanceof Error ? firstErr : new Error("Analysis failed. Please try again.")
    }
    try {
      return await run();
    } catch (secondErr) {
      process.stderr.write(`[ANALYZE] attempt 2 FAILED | ${secondErr instanceof Error ? secondErr.message : String(secondErr)}\n`);
      throw firstErr instanceof Error ? firstErr : new Error("Analysis failed. Please try again.");
    }
  }
}

export interface PreviewResult {
  conversionScore: number;
  topFinding: { title: string; description: string; severity: string } | null;
}

const PREVIEW_SYSTEM_PROMPT = `You are a conversion analyst. Return ONLY valid JSON with no markdown fences or preamble:
{"conversionScore":<integer 0-100>,"topFinding":{"title":"<under 10 words>","description":"<1-2 sentences>","severity":"critical"|"high"|"medium"}}`;

export async function runPreviewAnalysis(
  extraction: CombinedExtraction,
  siteType: SiteType
): Promise<PreviewResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 });

  const attempt = async (): Promise<PreviewResult> => {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: PREVIEW_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Site type: ${siteType}. Score the conversion readiness and identify the single biggest issue from this homepage HTML:\n\n${extraction.rawHtml}`,
        },
      ],
    });

    const block = message.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") throw new Error("No text response from model.");

    let raw = block.text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const score = Math.min(100, Math.max(0, Math.round(Number(parsed.conversionScore ?? 50))));
      const tf = parsed.topFinding as Record<string, unknown> | undefined;
      return {
        conversionScore: score,
        topFinding: tf
          ? {
              title: String(tf.title ?? ""),
              description: String(tf.description ?? ""),
              severity: String(tf.severity ?? "medium"),
            }
          : null,
      };
    } catch (err) {
      process.stderr.write('[ANALYZE] preview JSON parse ERROR | ' + err + '\n')
      return { conversionScore: 50, topFinding: null };
    }
  };

  try {
    return await attempt();
  } catch (err) {
    process.stderr.write('[ANALYZE] preview ERROR | ' + err + '\n')
    return { conversionScore: 50, topFinding: null };
  }
}
