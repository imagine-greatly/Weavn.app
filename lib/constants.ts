export const ROUTES = {
  HOME: "/",
  SCAN: "/scan",
  ANALYZE: "/scan",
  DASHBOARD: "/dashboard",
  AUTH: "/auth",
  PRICING: "/pricing",
  DOCS: "/docs",
  HOW_IT_WORKS: "/how-it-works",
  PRODUCT: "/product",
} as const;

export const API_ROUTES = {
  ANALYZE: "/api/analyze",
  SCAN: "/api/scan",
  REPORT: "/api/report",
  ADVISOR: "/api/advisor",
  STRIPE_CHECKOUT: "/api/stripe/checkout",
  STRIPE_WEBHOOK: "/api/stripe/webhook",
} as const;

export const SEVERITY_LEVELS = ["critical", "warning", "passing"] as const;
export const SEVERITY_ORDER: Record<(typeof SEVERITY_LEVELS)[number], number> = {
  critical: 0,
  warning: 1,
  passing: 2,
};

export const RUBRIC_SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const;
export const RUBRIC_SEVERITY_ORDER: Record<
  (typeof RUBRIC_SEVERITY_LEVELS)[number],
  number
> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export const CATEGORY_IDS = [
  "psychology",
  "messaging",
  "conversion",
  "seo",
  "ux",
  "trust",
] as const;

export const CATEGORY_NAMES: Record<(typeof CATEGORY_IDS)[number], string> = {
  psychology: "REVENUE IMPACT",
  messaging: "MESSAGING",
  conversion: "CONVERSION",
  seo: "SEO",
  ux: "UX",
  trust: "TRUST",
};

export const STATUS_MESSAGES = {
  LOADING_REPORT: "Loading report...",
  ANALYSIS_IN_PROGRESS: "REVENUE DIAGNOSTIC IN PROGRESS",
  SCAN_FAILED: "SCAN FAILED",
} as const;

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
  "Cross-referencing 166 checkpoints against our revenue benchmarks...",
  "Compiling Revenue Score...",
] as const;

export const STORAGE_KEYS = {
  REPORT_PREFIX: "webdoc_report_",
  PENDING_REPORT: "pending_report",
} as const;
