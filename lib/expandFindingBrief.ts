/**
 * Finding brief expansion — shared by /api/expand-finding and scan-time batch generation.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  EXPAND_FINDING_BRIEF_SYSTEM_PROMPT,
  buildExpandFindingBriefUserMessage,
  type ExpandFindingBriefFindingInput,
  type ExpandFindingBriefRelated,
  type FindingBriefExpansion,
} from "@/lib/prompts";

export type { FindingBriefExpansion };

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/** Normalize Claude JSON text into FindingBriefExpansion. */
export function parseFindingBriefFromModelText(raw: string): FindingBriefExpansion | null {
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
    return parseFindingBriefPayload(parsed);
  } catch {
    return null;
  }
}

/** Validate JSON already stored in DB (object shape). */
export function parseFindingBriefFromStoredValue(raw: unknown): FindingBriefExpansion | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return parseFindingBriefPayload(raw as Record<string, unknown>);
}

function parseFindingBriefPayload(parsed: Record<string, unknown>): FindingBriefExpansion | null {
  try {
    const summary = asStr(parsed.diagnosticSummary);
    if (!summary) return null;

    const da = asObj(parsed.diagnosisAnalysis);
    const ri = asObj(parsed.revenueImpact);
    const bench = asObj(parsed.benchmark);
    const res = asObj(parsed.resolution);
    const imm = asObj(res.immediate);
    const prop = asObj(res.proper);
    const adv = asObj(res.advanced);

    const interactionsRaw = Array.isArray(parsed.relatedFindingInteractions)
      ? parsed.relatedFindingInteractions
      : [];
    const relatedFindingInteractions = interactionsRaw
      .map((row) => {
        const o = asObj(row);
        return {
          findingId: asStr(o.findingId),
          interaction: asStr(o.interaction),
        };
      })
      .filter((x) => x.findingId && x.interaction);

    const chipsRaw = Array.isArray(parsed.advisorChips) ? parsed.advisorChips : [];
    const advisorChips = chipsRaw.map(asStr).filter(Boolean).slice(0, 3);
    while (advisorChips.length < 3) {
      advisorChips.push("What should we prioritize first?");
    }

    const impactRating = asStr(ri.impactRatingDisplay) || "HIGH SUPPRESSION";

    const out: FindingBriefExpansion = {
      diagnosticSummary: summary,
      observedAt: asStr(parsed.observedAt) || "Location inferred from diagnostic context.",
      diagnosisAnalysis: {
        behavioralMechanism:
          asStr(da.behavioralMechanism) || "Mechanism analysis pending.",
        conversionConsequence: asStr(da.conversionConsequence),
        scopeOfImpact: asStr(da.scopeOfImpact),
        interactionEffect: asStr(da.interactionEffect),
      },
      revenueImpact: {
        impactRatingDisplay: impactRating,
        narrative: asStr(ri.narrative),
        modeling: asStr(ri.modeling),
        costOfInaction:
          asStr(ri.costOfInaction) ||
          "Every month this finding remains unresolved, suppression compounds as visitor behavior adapts to the friction.",
      },
      originAnalysis: asStr(parsed.originAnalysis),
      benchmark: {
        statement: asStr(bench.statement),
        thisSiteLabel: asStr(bench.thisSiteLabel) || asStr(bench.thissite) || "This site",
        benchmarkLabel:
          asStr(bench.benchmarkLabel) || asStr(bench.benchmarkSite) || "Category benchmark",
      },
      resolution: {
        immediate: {
          steps: asStr(imm.steps),
          timeEstimate: asStr(imm.timeEstimate) || "Est. time: 30-60 minutes",
        },
        proper: {
          steps: asStr(prop.steps),
          timeEstimate: asStr(prop.timeEstimate) || "Est. time: 2-4 hours",
        },
        advanced: {
          steps: asStr(adv.steps),
          timeEstimate: asStr(adv.timeEstimate) || "Est. time: 1-2 weeks",
        },
      },
      compoundingRisk: asStr(parsed.compoundingRisk),
      relatedFindingInteractions,
      advisorOpening:
        asStr(parsed.advisorOpening) ||
        "Review the diagnostic sections above, then ask a targeted follow-up about implementation for your site.",
      advisorChips,
    };

    return out;
  } catch {
    return null;
  }
}

export type ExpandFindingBriefRequestBody = {
  domain: string;
  overallScore: number;
  finding: ExpandFindingBriefFindingInput;
  relatedFindings: ExpandFindingBriefRelated[];
};

/** Calls Claude and returns parsed expansion, or null on failure. */
export async function expandFindingBriefWithAnthropic(
  body: ExpandFindingBriefRequestBody
): Promise<FindingBriefExpansion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const userMessage = buildExpandFindingBriefUserMessage({
    domain: body.domain,
    overallScore: body.overallScore,
    finding: body.finding,
    related: body.relatedFindings,
  });

  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: EXPAND_FINDING_BRIEF_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const parsed = parseFindingBriefFromModelText(rawText);
  if (!parsed && rawText.trim()) {
    console.error("[expand-finding] parse failed", rawText.slice(0, 800));
  }
  return parsed;
}
