import DIAGNOSTIC_CHECKS from "@/lib/diagnosticRubric";
import { scoreColor, scoreRgb, opportunityFraming, formatCoverageBand } from "@/lib/verdict";

/** Rubric total — single source of truth (the catalog length), used for “of N checks” copy. */
export const RUBRIC_TOTAL_CHECKS = DIAGNOSTIC_CHECKS.length;

/**
 * Coverage color/label helpers — thin compatibility shims over the CANONICAL band system in
 * lib/verdict (scoreBand: red <50 / amber 50–69 / green 70+; locked tokens #E8635F/#EFB23E/#00C48C;
 * opportunity labels High upside / Solid foundation / Highly optimized). These intentionally NO
 * LONGER define their own thresholds or palette — every surface resolves through lib/verdict so the
 * same coverage % renders the same band + color everywhere.
 */
export function displayScoreColor(score: number): string {
  return scoreColor(score);
}

/** RGB triple for glows/shadows tied to the canonical band. */
export function displayScoreRgb(score: number): string {
  return scoreRgb(score);
}

/** Opportunity band under the dashboard gauge (all caps) — coverage upside, not a grade. */
export function weavnScoreBandUpper(score: number): string {
  return opportunityFraming(score).label.toUpperCase();
}

/** Advisor / narrative copy: honest coverage band + opportunity label, e.g. "68% ±3 best-practice coverage — Solid foundation". */
export function formatWeavnScoreWithBand(score: number): string {
  return `${formatCoverageBand(score)} best-practice coverage — ${opportunityFraming(score).label}`;
}
