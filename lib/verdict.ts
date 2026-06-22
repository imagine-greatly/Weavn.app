/**
 * Verdict — the SINGLE source of truth for score → band / color / label, plus the
 * percentile→ordinal helpers. Replaces the previously divergent scoreBand,
 * verdictColor, ReportLayout.bandColor, console.scoreToSeverity, and scoreToVerdict.
 *
 * Canonical 3-band (locked design system):
 *   red   < 50   (severity / critical)   — --sev-critical  #E8635F
 *   amber 50–69  (warning)               — --sev-high      #EFB23E
 *   green ≥ 70   (success only)          — --json-string   #00C48C
 *
 * Verdict COLOR is semantically fixed and NEVER themed by surface accent.
 * Verdict LABEL words are intentionally DECOUPLED from the 3 color bands (a finer
 * 5-band descriptive set), so label text is unchanged from the prior scoreToVerdict
 * and stays in sync with the API contract.
 */

export type VerdictBand = "red" | "amber" | "green";

// Canonical thresholds.
const AMBER_AT = 50;
const GREEN_AT = 70;

/** Score → canonical 3-band. */
export function scoreBand(score: number): VerdictBand {
  if (score >= GREEN_AT) return "green";
  if (score >= AMBER_AT) return "amber";
  return "red";
}

/** Band → fixed hex (equals the --sev-critical / --sev-high / --json-string tokens). */
export const BAND_HEX: Record<VerdictBand, string> = {
  red: "#E8635F",
  amber: "#EFB23E",
  green: "#00C48C",
};

/** Band → CSS var form, for DOM contexts that should track the live tokens. */
export const BAND_VAR: Record<VerdictBand, string> = {
  red: "var(--sev-critical)",
  amber: "var(--sev-high)",
  green: "var(--json-string)",
};

/** Band → RGB triple of BAND_HEX, for glows/shadows that must track the canonical color. */
export const BAND_RGB: Record<VerdictBand, string> = {
  red: "232,99,95", // #E8635F
  amber: "239,178,62", // #EFB23E
  green: "0,196,140", // #00C48C
};

/** Score → verdict color (fixed hex). Drop-in for the old verdictColor/bandColor. */
export function scoreColor(score: number): string {
  return BAND_HEX[scoreBand(score)];
}

/** Score → RGB triple for the canonical band (glow/shadow). Drop-in for the old displayScoreRgb. */
export function scoreRgb(score: number): string {
  return BAND_RGB[scoreBand(score)];
}

/**
 * Score → descriptive verdict label (5-band). Decoupled from color bands by design
 * and byte-identical to the prior lib/dashboard.scoreToVerdict (and the v1 API).
 */
export function scoreToVerdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Poor";
}

/**
 * OPPORTUNITY framing (NOT a grade). The headline number is the % of catalogued conversion
 * best-practices a page captures; this maps it to upside language keyed to the SAME canonical color
 * band (thresholds unchanged) so the ring color and the words always agree. Low coverage = high
 * upside; mid = solid foundation; high = highly optimized. Use this in UI in place of the grade verdict.
 */
export function opportunityFraming(score: number): { band: VerdictBand; label: string; blurb: string } {
  const band = scoreBand(score);
  if (band === "green")
    return { band, label: "Highly optimized", blurb: "Most conversion best-practices are already captured — tighten the few remaining gaps below." };
  if (band === "amber")
    return { band, label: "Solid foundation", blurb: "A solid base with clear gaps — the ranked findings below are your upside." };
  return { band, label: "High upside", blurb: "Most best-practices aren't captured yet — the ranked findings below are the path to close the gap." };
}

/**
 * Honest-precision tolerance for the HEADLINE coverage number. Per-pass model variance is ~±3
 * (reconciled), so the headline figure is published as a small range "{score}% ±{tol}" rather than a
 * false-precision point. SINGLE tunable source. The BAND/color still key off the CENTRAL score
 * (scoreBand thresholds, unchanged) — this is presentation on the headline number only and does NOT
 * touch scoring or banding math.
 */
export const COVERAGE_TOLERANCE = 3;

/** Headline coverage as an honest tight band, e.g. "61% ±3". Central score still drives band/color. */
export function formatCoverageBand(score: number, tol: number = COVERAGE_TOLERANCE): string {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  return `${s}% ±${tol}`;
}

/**
 * Percentile estimate vs. a static industry baseline (p10/p50/p90 ≈ 32/55/80).
 * Deterministic function of the real score — labeled as an estimate in the UI.
 * Mirrors the piecewise shape of lib/benchmarks.ts calculatePercentile without
 * touching it or requiring the service-role benchmark tables on the client.
 * TODO(wiring): swap for the per-site industry_benchmarks percentile when exposed.
 */
export function estimatePercentile(score: number): number {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const p10 = 32;
  const p50 = 55;
  const p90 = 80;
  if (s <= p10) return Math.max(1, Math.round((s / p10) * 10));
  if (s <= p50) return Math.round(10 + ((s - p10) / (p50 - p10)) * 40);
  if (s <= p90) return Math.round(50 + ((s - p50) / (p90 - p50)) * 40);
  return Math.min(99, Math.round(90 + ((s - p90) / (100 - p90)) * 10));
}

export function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}
