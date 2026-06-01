/**
 * Pure parsing helpers for FindingBriefExpansion — no Anthropic SDK dependency.
 * Safe to import from client components and server code alike.
 */

import type { FindingBriefExpansion } from "@/lib/prompts";

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

export function parseFindingBriefPayload(parsed: Record<string, unknown>): FindingBriefExpansion | null {
  try {
    const diagnosticAnalysis = asStr(parsed.diagnosticAnalysis);
    if (!diagnosticAnalysis) return null;

    const ri = asObj(parsed.revenueImpact);
    const res = asObj(parsed.resolution);
    const imm = asObj(res.immediate);
    const prop = asObj(res.proper);
    const adv = asObj(res.advanced);

    const out: FindingBriefExpansion = {
      diagnosticAnalysis,
      revenueImpact: {
        impactRatingDisplay: asStr(ri.impactRatingDisplay) || 'HIGH SUPPRESSION',
        costOfInaction: asStr(ri.costOfInaction) || '',
        thisSiteLabel: asStr(ri.thisSiteLabel) || 'Current state',
        benchmarkLabel: asStr(ri.benchmarkLabel) || 'Industry standard',
      },
      resolution: {
        immediate: {
          steps: asStr(imm.steps) || '',
          timeEstimate: asStr(imm.timeEstimate) || '',
          projectedImpact: asStr(imm.projectedImpact) || '',
        },
        proper: {
          steps: asStr(prop.steps) || '',
          timeEstimate: asStr(prop.timeEstimate) || '',
          projectedImpact: asStr(prop.projectedImpact) || '',
        },
        advanced: {
          steps: asStr(adv.steps) || '',
          timeEstimate: asStr(adv.timeEstimate) || '',
          projectedImpact: asStr(adv.projectedImpact) || '',
        },
      },
      advisorOpening: asStr(parsed.advisorOpening) || '',
      advisorChips: Array.isArray(parsed.advisorChips)
        ? parsed.advisorChips.map(String)
        : [],
    };

    return out;
  } catch {
    return null;
  }
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

/** Validate JSON already stored in DB (object shape). Safe to call from client components. */
export function parseFindingBriefFromStoredValue(raw: unknown): FindingBriefExpansion | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return parseFindingBriefPayload(raw as Record<string, unknown>);
}
