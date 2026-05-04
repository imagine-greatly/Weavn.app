/** Rubric total — used for “of N checks” copy on dashboard. */
export const RUBRIC_TOTAL_CHECKS = 166;

/**
 * Health score color bands (DESIGN_SYSTEM / brand guide). No cyan on score readouts.
 * 0–39 critical, 40–59 at risk, 60–79 suboptimal, 80–100 optimized.
 */
export function displayScoreColor(score: number): string {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 39) return "#FF2D2D";
  if (s <= 59) return "#FFB300";
  if (s <= 79) return "#FFD600";
  return "#00E676";
}

/** RGB triple for glows/shadows tied to the same bands. */
export function displayScoreRgb(score: number): string {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 39) return "255,45,45";
  if (s <= 59) return "255,179,0";
  if (s <= 79) return "255,214,0";
  return "0,230,118";
}

/** Severity band under the dashboard gauge (all caps). */
export function webDocScoreBandUpper(score: number): string {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  if (s <= 39) return "CRITICAL RISK";
  if (s <= 59) return "AT RISK";
  if (s <= 79) return "SUBOPTIMAL";
  return "OPTIMIZED";
}

/** Advisor / narrative copy: score with band, e.g. "68/100 — Suboptimal band". */
export function formatWebDocScoreWithBand(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const band =
    s <= 39 ? "Critical Risk" : s <= 59 ? "At Risk" : s <= 79 ? "Suboptimal" : "Optimized";
  return `${s}/100 — ${band} band`;
}
