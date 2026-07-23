/**
 * lib/pricing.ts — SINGLE SOURCE OF TRUTH for the pricing catalog.
 *
 * Reconciliation contract with lib/constants.ts:
 *   - constants.ts owns ENFORCEMENT QUOTAS (monthly caps, included scans, overage
 *     rates, rate limits). Enforcement (checkScanAllowed / checkDashboardScanAllowed)
 *     reads from there and ONLY there.
 *   - pricing.ts owns BILLING (dollar amounts, white-label flag, Stripe price-id
 *     slots, annual multiplier, contact-CTA routing).
 *   - The two NEVER redefine the same number. Every scan/overage figure below is
 *     READ FROM constants.ts so the catalog can never silently drift from the
 *     enforced quota. assertCatalogReconciles() hard-fails if the wiring ever
 *     references a tier that constants.ts doesn't back.
 *
 * LOCKED RULE: the Dashboard track and the API track never cross-reference. They
 * are two separate sections, two separate tables, two separate tier unions below.
 */

import {
  FREE_DASHBOARD_SCANS_PER_MONTH,
  DASHBOARD_PLAN_MONTHLY_CAPS,
  API_PLAN_INCLUDED_SCANS,
  API_PLAN_OVERAGE_USD,
  PLAYGROUND_OVERAGE_USD,
  FREE_API_TRIAL_SCANS,
} from "@/lib/constants";

// ── Shared ────────────────────────────────────────────────────────────────────

/** Annual price = monthly × this (2 months free). Applies to flat recurring fees only. */
export const ANNUAL_MULTIPLIER = 10;

/**
 * Enterprise API overage floor (indicative only — never a self-serve Stripe price).
 * CONTRACT FLOOR: enterprise deals never price a scan below this.
 * COGS-linked floor ($0.37 COGS). If COGS rises, revisit this FIRST.
 */
export const ENTERPRISE_API_OVERAGE_FLOOR_USD = 0.5;

export type BillingInterval = "month" | "year";

/** How a tier's primary CTA resolves. */
export type TierCta =
  | { kind: "checkout" } // self-serve Stripe Checkout
  | { kind: "contact" } // book-a-call / contact — NO Stripe price, NOT checkout
  | { kind: "none" }; // free tier — no payment action

/** Slot for a Stripe price id, resolved from env at runtime (never hardcoded). */
interface PriceSlot {
  /** Primary env var the setup script writes and the app reads. */
  env: string;
  /** Optional legacy env var read as a fallback (pre-multi-tier single-price wiring). */
  legacyEnv?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD TRACK (steel-blue surface) — flat monthly subscription, HARD scan cap.
// ════════════════════════════════════════════════════════════════════════════

export type DashboardTier = "free" | "starter" | "pro" | "agency" | "enterprise";

export interface DashboardPlan {
  track: "dashboard";
  id: DashboardTier;
  name: string;
  /** Flat monthly price in USD. null = no fixed price (free / custom enterprise). */
  priceMonthlyUsd: number | null;
  /**
   * Included scans per UTC month. READ FROM constants.ts (DASHBOARD_PLAN_MONTHLY_CAPS).
   * null = unlimited by contract (enterprise). Hard cap — no overage on this track.
   */
  scansPerMonth: number | null;
  /** Agency-only: white-label reports (theme/accent/logo/cover). */
  whiteLabel: boolean;
  cta: TierCta;
  /** Stripe price slots (absent for free / enterprise). */
  price?: { monthly: PriceSlot; annual: PriceSlot };
  /** Short marketing blurb — NO model claims (scans run Sonnet across all tiers). */
  blurb: string;
}

export const DASHBOARD_PLANS: Record<DashboardTier, DashboardPlan> = {
  free: {
    track: "dashboard",
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    scansPerMonth: DASHBOARD_PLAN_MONTHLY_CAPS.free ?? FREE_DASHBOARD_SCANS_PER_MONTH, // 3
    whiteLabel: false,
    cta: { kind: "none" },
    // On-ramp, not a destination — the first look before there's a client involved.
    blurb: "Scan your own site and see what it finds — no card, no commitment.",
  },
  starter: {
    track: "dashboard",
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 39,
    scansPerMonth: DASHBOARD_PLAN_MONTHLY_CAPS.starter, // 50
    whiteLabel: false,
    cta: { kind: "checkout" },
    price: {
      monthly: { env: "STRIPE_PRICE_STARTER_MONTHLY" },
      annual: { env: "STRIPE_PRICE_STARTER_ANNUAL" },
    },
    // On-ramp — solo operators testing the waters before there's client work to bill.
    blurb: "For solo consultants and founders testing the waters on a single site.",
  },
  pro: {
    track: "dashboard",
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 129,
    scansPerMonth: DASHBOARD_PLAN_MONTHLY_CAPS.pro, // 200
    whiteLabel: false,
    cta: { kind: "checkout" },
    price: {
      monthly: { env: "STRIPE_PRICE_PRO_MONTHLY", legacyEnv: "STRIPE_PRO_PRICE_ID" },
      annual: { env: "STRIPE_PRICE_PRO_ANNUAL" },
    },
    // On-ramp — the last step before white-label. NOT the destination; Agency is.
    blurb: "Room to grow before you white-label — heavier in-house or early client work.",
  },
  agency: {
    track: "dashboard",
    id: "agency",
    name: "Agency",
    priceMonthlyUsd: 349,
    scansPerMonth: DASHBOARD_PLAN_MONTHLY_CAPS.agency, // 500
    whiteLabel: true,
    cta: { kind: "checkout" },
    price: {
      monthly: { env: "STRIPE_PRICE_AGENCY_MONTHLY", legacyEnv: "STRIPE_AGENCY_PRICE_ID" },
      annual: { env: "STRIPE_PRICE_AGENCY_ANNUAL" },
    },
    // Premium = white-label + volume. NOT a better model (all tiers run Sonnet).
    // The destination tier — outcome-led (white-label is the product; scans are the unit).
    blurb: "White-label reports you put your own name on and bill clients for. Weavn never appears in the deliverable.",
  },
  enterprise: {
    track: "dashboard",
    id: "enterprise",
    name: "Enterprise",
    priceMonthlyUsd: null, // custom — no Stripe price
    scansPerMonth: DASHBOARD_PLAN_MONTHLY_CAPS.enterprise ?? null, // unlimited by contract (absent from caps)
    whiteLabel: true,
    cta: { kind: "contact" }, // book-a-call, NOT checkout
    blurb: "Custom volume, SSO, and SLAs — talk to us.",
  },
};

// ════════════════════════════════════════════════════════════════════════════
// API SUBSCRIPTION TRACK (purple surface) — flat base + metered SCAN-COUNT overage.
//   Billing model: base fee (licensed) + metered price whose graduated tiers give
//   `includedScans` at $0, then per-scan `overageUsd` beyond. The meter counts
//   SCANS (value=1 each), never dollars — see lib/usageTracking.ts.
// ════════════════════════════════════════════════════════════════════════════

export type ApiTier = "playground" | "dev" | "builder" | "scale" | "enterprise";

export interface ApiPlan {
  track: "api";
  id: ApiTier;
  name: string;
  /** Flat monthly base fee in USD. null = no fixed base (playground / custom enterprise). */
  baseMonthlyUsd: number | null;
  /**
   * Included scans per month at $0 before overage. READ FROM constants.ts
   * (API_PLAN_INCLUDED_SCANS). null = unlimited/custom (enterprise) or trial-gated
   * (playground uses `trialScans` instead).
   */
  includedScans: number | null;
  /** Per-scan overage rate in USD. READ FROM constants.ts (API_PLAN_OVERAGE_USD). */
  overageUsd: number;
  /** Playground only: lifetime free trial scans before billing kicks in (402 over trial). */
  trialScans?: number;
  cta: TierCta;
  /**
   * Stripe price slots. `base` is the flat licensed fee; `metered` is the
   * graduated scan-count price (included → $0, then overage). Playground has only
   * a metered price (pure pay-as-you-go). Enterprise has none (contact).
   */
  price?: { baseMonthly?: PriceSlot; baseAnnual?: PriceSlot; metered: PriceSlot };
  blurb: string;
}

export const API_PLANS: Record<ApiTier, ApiPlan> = {
  playground: {
    track: "api",
    id: "playground",
    name: "Playground",
    baseMonthlyUsd: null, // trial → pure metered
    includedScans: null,
    // Playground is the acquisition funnel — priced above COGS ($0.37) but below Dev
    // ($0.74) to stay a friendly on-ramp. Set deliberately and independently; do NOT tie
    // to a paid tier's rate. If COGS rises, this is the second floor to revisit (after Enterprise).
    overageUsd: PLAYGROUND_OVERAGE_USD, // $0.50/scan after trial (standalone, NOT the Dev rate)
    trialScans: FREE_API_TRIAL_SCANS, // 25 lifetime
    cta: { kind: "checkout" },
    price: {
      metered: { env: "STRIPE_PRICE_PLAYGROUND_METERED" },
    },
    blurb: "25 free scans, then $0.50/scan. No base fee.",
  },
  dev: {
    track: "api",
    id: "dev",
    name: "Dev",
    baseMonthlyUsd: 89,
    includedScans: API_PLAN_INCLUDED_SCANS.dev, // 120
    overageUsd: API_PLAN_OVERAGE_USD.dev, // 0.74
    cta: { kind: "checkout" },
    price: {
      baseMonthly: { env: "STRIPE_PRICE_DEV_BASE_MONTHLY" },
      baseAnnual: { env: "STRIPE_PRICE_DEV_BASE_ANNUAL" },
      metered: { env: "STRIPE_PRICE_DEV_METERED" },
    },
    blurb: "120 scans included, $0.74/scan after.",
  },
  builder: {
    track: "api",
    id: "builder",
    name: "Builder",
    baseMonthlyUsd: 339,
    includedScans: API_PLAN_INCLUDED_SCANS.builder, // 500
    overageUsd: API_PLAN_OVERAGE_USD.builder, // 0.68
    cta: { kind: "checkout" },
    price: {
      baseMonthly: { env: "STRIPE_PRICE_BUILDER_BASE_MONTHLY" },
      baseAnnual: { env: "STRIPE_PRICE_BUILDER_BASE_ANNUAL" },
      metered: { env: "STRIPE_PRICE_BUILDER_METERED" },
    },
    blurb: "500 scans included, $0.68/scan after.",
  },
  scale: {
    track: "api",
    id: "scale",
    name: "Scale",
    baseMonthlyUsd: 929,
    includedScans: API_PLAN_INCLUDED_SCANS.scale, // 1500
    overageUsd: API_PLAN_OVERAGE_USD.scale, // 0.62
    cta: { kind: "checkout" },
    price: {
      baseMonthly: { env: "STRIPE_PRICE_SCALE_BASE_MONTHLY" },
      baseAnnual: { env: "STRIPE_PRICE_SCALE_BASE_ANNUAL" },
      metered: { env: "STRIPE_PRICE_SCALE_METERED" },
    },
    blurb: "1,500 scans included, $0.62/scan after.",
  },
  enterprise: {
    track: "api",
    id: "enterprise",
    name: "Enterprise",
    baseMonthlyUsd: null, // custom — no self-serve price
    includedScans: API_PLAN_INCLUDED_SCANS.enterprise ?? null, // custom (absent from constants)
    // $0.50 CONTRACT FLOOR — never priced below. COGS-linked floor ($0.37 COGS).
    // If COGS rises, revisit this FIRST.
    overageUsd: ENTERPRISE_API_OVERAGE_FLOOR_USD, // $0.50 floor, indicative
    cta: { kind: "contact" }, // contact CTA, NOT checkout
    blurb: "Custom volume from a ~$0.50/scan floor — talk to us.",
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export const usdToCents = (usd: number): number => Math.round(usd * 100);

/** Annual flat-fee price (USD) for a monthly price, or null if no monthly price. */
export const annualUsd = (monthlyUsd: number | null): number | null =>
  monthlyUsd == null ? null : monthlyUsd * ANNUAL_MULTIPLIER;

/** Resolve a price slot to a concrete Stripe price id from env (primary, then legacy). */
export function resolvePriceId(slot: PriceSlot | undefined): string | undefined {
  if (!slot) return undefined;
  return process.env[slot.env] ?? (slot.legacyEnv ? process.env[slot.legacyEnv] : undefined);
}

/** Dashboard checkout price id for a tier + interval. Throws for non-checkout tiers. */
export function dashboardPriceId(tier: DashboardTier, interval: BillingInterval): string | undefined {
  const plan = DASHBOARD_PLANS[tier];
  if (plan.cta.kind !== "checkout" || !plan.price) {
    throw new Error(`Dashboard tier "${tier}" is not self-serve checkout`);
  }
  return resolvePriceId(interval === "year" ? plan.price.annual : plan.price.monthly);
}

/** Tiers a user can self-serve checkout into on the dashboard track. */
export const CHECKOUTABLE_DASHBOARD_TIERS: DashboardTier[] = (
  Object.values(DASHBOARD_PLANS) as DashboardPlan[]
)
  .filter((p) => p.cta.kind === "checkout")
  .map((p) => p.id);

export function isCheckoutableDashboardTier(value: unknown): value is DashboardTier {
  return typeof value === "string" && (CHECKOUTABLE_DASHBOARD_TIERS as string[]).includes(value);
}

/**
 * Reverse map: resolved Stripe price id → plan tier. Used by the webhook to turn
 * the active subscription's price id into the correct tier (kills always-'pro').
 * Built from env at call time so it reflects whatever the setup script provisioned.
 * Both tracks are included; price ids are globally unique within a Stripe account.
 */
export function planFromPriceId(priceId: string | null | undefined): DashboardTier | ApiTier | null {
  if (!priceId) return null;

  for (const plan of Object.values(DASHBOARD_PLANS) as DashboardPlan[]) {
    if (!plan.price) continue;
    if (resolvePriceId(plan.price.monthly) === priceId) return plan.id;
    if (resolvePriceId(plan.price.annual) === priceId) return plan.id;
  }
  for (const plan of Object.values(API_PLANS) as ApiPlan[]) {
    if (!plan.price) continue;
    if (plan.price.baseMonthly && resolvePriceId(plan.price.baseMonthly) === priceId) return plan.id;
    if (plan.price.baseAnnual && resolvePriceId(plan.price.baseAnnual) === priceId) return plan.id;
    if (resolvePriceId(plan.price.metered) === priceId) return plan.id;
  }
  return null;
}

/**
 * Hard reconciliation check between this catalog and constants.ts. Throws if any
 * checkout-able tier's scan figure drifts from the enforced quota. The setup
 * script calls this before minting so a drifted catalog can never reach Stripe.
 */
export function assertCatalogReconciles(): void {
  const problems: string[] = [];

  for (const id of ["free", "starter", "pro", "agency"] as DashboardTier[]) {
    const expected = DASHBOARD_PLAN_MONTHLY_CAPS[id];
    if (DASHBOARD_PLANS[id].scansPerMonth !== expected) {
      problems.push(
        `dashboard "${id}": catalog scansPerMonth=${DASHBOARD_PLANS[id].scansPerMonth} != constants cap=${expected}`
      );
    }
  }
  for (const id of ["dev", "builder", "scale"] as ApiTier[]) {
    if (API_PLANS[id].includedScans !== API_PLAN_INCLUDED_SCANS[id]) {
      problems.push(
        `api "${id}": catalog includedScans=${API_PLANS[id].includedScans} != constants included=${API_PLAN_INCLUDED_SCANS[id]}`
      );
    }
    if (API_PLANS[id].overageUsd !== API_PLAN_OVERAGE_USD[id]) {
      problems.push(
        `api "${id}": catalog overageUsd=${API_PLANS[id].overageUsd} != constants overage=${API_PLAN_OVERAGE_USD[id]}`
      );
    }
  }

  if (problems.length) {
    throw new Error(`[pricing] catalog/constants reconciliation failed:\n  - ${problems.join("\n  - ")}`);
  }
}
