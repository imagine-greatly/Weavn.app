export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  passing: 2,
};

export const RUBRIC_SEVERITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export const COLOR_TOKENS = {
  BG_BASE: "#050810",
  CYAN: "rgba(0,200,255,1)",
  CYAN_80: "rgba(0,200,255,0.8)",
  CYAN_60: "rgba(0,200,255,0.6)",
  CYAN_30: "rgba(0,200,255,0.3)",
  RED: "#ff2d2d",
  ORANGE: "#ff9500",
  GREEN: "#00ff87",
} as const;

export const SCAN_STATUS_MESSAGES = [
  "Initializing your diagnosis...",
  "Parsing DOM architecture and hierarchy...",
  "Analyzing conversion path and trust signals...",
  "Evaluating above-fold revenue capture...",
  "Auditing trust and credibility signals...",
  "Mapping revenue funnel architecture...",
  "Auditing social proof authenticity signals...",
  "Assessing SEO and metadata structure...",
  "Cross-referencing 282 checkpoints against our revenue benchmarks...",
  "Compiling Revenue Score...",
] as const;

// ── Free-tier quotas — single source of truth ─────────────────────────────────
// Enforcement reads from here. Marketing copy will import from here too.

/** Anonymous playground: max scans per IP per 60-minute window. Enforced at app/api/playground/scan/route.ts. */
export const PLAYGROUND_SCANS_PER_HOUR = 1;

/** Developer API: lifetime trial ceiling for keys whose plan is 'playground', 'payg', or 'free'. After exhaustion, key must upgrade. */
export const FREE_API_TRIAL_SCANS = 25;

/** Dashboard: max fresh scans per calendar month (UTC) for a user whose profiles.plan = 'free'. Resets on the 1st of each month. */
export const FREE_DASHBOARD_SCANS_PER_MONTH = 3;
