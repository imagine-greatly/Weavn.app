import DIAGNOSTIC_CHECKS from "@/lib/diagnosticRubric";

/** Rubric total — single source of truth (the catalog length), used for “of N checks” copy. */
export const RUBRIC_TOTAL_CHECKS = DIAGNOSTIC_CHECKS.length;

/**
 * Health score color bands (DESIGN_SYSTEM / brand guide). No cyan on score readouts.
 * 0–44 critical risk, 45–64 needs work, 65–100 good foundation.
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

/** Severity band under the dashboard gauge (all caps). */
export function weavnScoreBandUpper(score: number): string {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 44) return "CRITICAL RISK";
  if (s <= 64) return "NEEDS WORK";
  return "GOOD FOUNDATION";
}

/** Advisor / narrative copy: score with band, e.g. "68/100 — Good Foundation band". */
export function formatWeavnScoreWithBand(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const band =
    s <= 44 ? "Critical Risk" : s <= 64 ? "Needs Work" : "Good Foundation";
  return `${s}/100 — ${band} band`;
}
