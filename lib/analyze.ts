/**
 * Send combined site extraction to Claude and return structured report.
 * Uses claude-sonnet-4-20250514 and the conversion psychologist system prompt.
 * Retries once on AI failure.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { CombinedExtraction } from "./scraper";
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

const SYSTEM_PROMPT_BASE = `You are a senior conversion intelligence analyst. You identify exactly why visitors are not converting on this site and what must change for them to convert. Be specific to this site — quote actual page content. Never be generic.`;

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
      "category": string
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
- diagnosticBrief: REQUIRED — 3–4 sentence executive diagnostic summary per product spec (classification, score read, dominant suppression pattern with counts, leverage of resolving top findings). diagnosticBrief may duplicate intelligenceBrief or intelligenceBrief may be omitted.
- intelligenceBrief: optional legacy; if present without diagnosticBrief, use as executive narrative
- conversionKillers: max 8; titles under 10 words; evidence quoted from actual page
- conversionKillers.exitTrigger: The specific experience the visitor has on the page that causes them to hesitate, doubt, or leave. Describe what they see, read, or feel — not the business consequence. Example: 'Visitor reads the headline but cannot determine what makes this product different from Amazon.'
- conversionKillers.conversionCost: The business consequence in concrete terms — lost sales, abandoned signups, missed leads. Use a specific metric or percentage where accurate. Example: 'Estimated 60-70% of comparison shoppers exit without converting due to no visible differentiator.' These two fields must never contain the same text. exitTrigger describes the visitor experience. conversionCost describes the business impact.
- conversionKillers.implementation: Tell the site owner WHAT to change and WHERE, not what the end result should say. We do not know their brand voice — give them the directive, they write the copy. Good: 'Replace the hero headline with a specific outcome statement that names who it is for and what result they get — test 2-3 variants.' Bad: 'Change headline to: Get More Customers with Our Platform'. Never write the actual copy for them. Describe the change, the location on page, and the principle behind it. Start with a verb. Under 2 sentences.
- conversionTransformation.currentCta: Only return text if a clear, intentional hero-section call-to-action button exists above the fold. If the only buttons found are generic UI elements like 'Add', 'Add to cart', 'Menu', 'Search', or navigation links, return 'None detected' instead. Do not invent a CTA that is not clearly present as a primary action.
- dimensionScores: exactly 5 objects one per dimension; score 0-100; insight one sentence specific to this site
- conversionScore: integer 0-100
- healthScore: same value as conversionScore for backwards compatibility
- Return only valid JSON, no markdown, no preamble`;
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

function parseConversionIntelligencePayload(o: Record<string, unknown>, siteType: SiteType): ReportPayload {
  const categoryScoresIn = (o.categoryScores as Record<string, number>) ?? {};
  const pagesAnalyzed = Array.isArray(o.pagesAnalyzed) ? o.pagesAnalyzed.map(String) : [];
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

function ensurePayload(raw: unknown, siteType: SiteType): ReportPayload {
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
  return parseConversionIntelligencePayload(o, siteType);
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

export async function runAnalysis(
  extraction: CombinedExtraction,
  siteType: SiteType
): Promise<ReportPayload> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = buildSystemPrompt(siteType);
  const userContent = `Analyze the following website HTML and return the JSON analysis. The HTML is from a fully rendered page captured by a headless browser:\n\n${extraction.rawHtml}`;

  const run = async (): Promise<ReportPayload> => {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    const block = message.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("AI returned no text content.");
    }

    let raw: string = block.text;
    raw = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    const parsed: unknown = JSON.parse(raw);
    return ensurePayload(parsed, siteType);
  };

  try {
    return await run();
  } catch (firstErr) {
    try {
      return await run();
    } catch (secondErr) {
      throw firstErr instanceof Error ? firstErr : new Error("Analysis failed. Please try again.");
    }
  }
}
