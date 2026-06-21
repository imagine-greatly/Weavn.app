import DIAGNOSTIC_CHECKS from "@/lib/diagnosticRubric";

/** Rubric total — single source of truth (the catalog length), used for “of N checks” copy. */
export const RUBRIC_TOTAL_CHECKS = DIAGNOSTIC_CHECKS.length;

/**
 * Coverage color bands (DESIGN_SYSTEM / brand guide). No cyan on coverage readouts.
 * Same thresholds + colors; the LABELS are opportunity, not grades:
 * 0–44 high upside, 45–64 solid foundation, 65–100 highly optimized.
 */
export function displayScoreColor(score: number): string {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 44) return "#FF2D2D";
  if (s <= 64) return "#FFB300";
  return "#00E676";
}

/** RGB triple for glows/shadows tied to the same bands. */
export function displayScoreRgb(score: number): string {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 44) return "255,45,45";
  if (s <= 64) return "255,179,0";
  return "0,230,118";
}

/** Opportunity band under the dashboard gauge (all caps) — coverage upside, not a grade. */
export function weavnScoreBandUpper(score: number): string {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 44) return "HIGH UPSIDE";
  if (s <= 64) return "SOLID FOUNDATION";
  return "HIGHLY OPTIMIZED";
}

/** Advisor / narrative copy: coverage with opportunity band, e.g. "68% best-practice coverage — Solid Foundation". */
export function formatWeavnScoreWithBand(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const band =
    s <= 44 ? "High Upside" : s <= 64 ? "Solid Foundation" : "Highly Optimized";
  return `${s}% best-practice coverage — ${band}`;
}
