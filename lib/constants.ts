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

// ── Dashboard plan monthly caps — HARD CAP (no overage) ───────────────────────
// Keyed by profiles.plan. A plan absent from this map is treated as unlimited
// (Enterprise = custom/unlimited by contract). Resets on the 1st of each UTC month.
// These MUST match the locked pricing on the dashboard pricing page.
export const DASHBOARD_PLAN_MONTHLY_CAPS: Record<string, number> = {
  free: FREE_DASHBOARD_SCANS_PER_MONTH, // 3
  starter: 50,
  pro: 200,
  agency: 500,
  // enterprise: unlimited by contract — intentionally absent
};

// ── API plan included scans — SOFT CAP (overage billed, never hard-blocked) ────
// Keyed by api_keys.plan. Above the included count, scans are still served and
// billed at the per-scan overage rate below (metered to Stripe). A plan absent
// from this map (e.g. enterprise) is treated as unlimited/custom contract.
export const API_PLAN_INCLUDED_SCANS: Record<string, number> = {
  dev: 250,
  builder: 1000,
  scale: 3000,
  // enterprise: custom — intentionally absent
};

/** API per-scan overage rate (USD) charged for scans beyond the included quota. */
export const API_PLAN_OVERAGE_USD: Record<string, number> = {
  dev: 0.3,
  builder: 0.25,
  scale: 0.2,
};

// ── Per-account rate limits — bound abuse independent of the monthly cap ──────
// Fixed-window (per minute) request ceilings, enforced via the bump_scan_rate
// RPC (migration 026). These are a coarse abuse bound, not the billing cap.
export const DASHBOARD_RATE_LIMIT_PER_MIN = 10;
export const API_RATE_LIMIT_PER_MIN = 60;
export const SCAN_RATE_WINDOW_SECONDS = 60;

// ── Chrome extension anonymous scans (A1 lead funnel) ─────────────────────────
// Enforced at app/api/extension/scan/route.ts via the bump_extension_rate RPC
// (migration 030). SEPARATE from the marketing-site playground limit above — the
// extension gets its own budget so the two never contend. Scans run on the shared
// server-held PLAYGROUND_API_KEY (Weavn's COGS), so these caps also bound cost.
/** Per-install free scans in a rolling 24h window — the user-facing "3 free scans a day". */
export const EXTENSION_SCANS_PER_INSTALL_PER_DAY = 3;
/** Per-IP daily ceiling — anti token-farming, set high enough for a shared office. */
export const EXTENSION_SCANS_PER_IP_PER_DAY = 15;
/** Rolling window (seconds) for both extension counters. */
export const EXTENSION_RATE_WINDOW_SECONDS = 24 * 60 * 60;
