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

/** Score → verdict color (fixed hex). Drop-in for the old verdictColor/bandColor. */
export function scoreColor(score: number): string {
  return BAND_HEX[scoreBand(score)];
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
