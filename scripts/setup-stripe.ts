/**
 * scripts/setup-stripe.ts — idempotent Stripe product/price provisioner.
 *
 * Reads the catalog from lib/pricing.ts (which reads quotas from lib/constants.ts),
 * then creates-or-updates the Stripe products, the `api_scan` meter, and every
 * price. Re-running is safe: products are matched by metadata, prices by
 * lookup_key. Stripe prices are immutable, so when an amount changes this script
 * mints a NEW price and transfers the lookup_key to it (old price is deactivated).
 *
 * It MINTS NOTHING on import — run it explicitly:
 *     STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/setup-stripe.ts
 *     # add --dry-run to print the plan without touching Stripe
 *
 * After it prints the resulting price ids, copy them into your env (.env.local /
 * Vercel). The app resolves them via the env slots declared in lib/pricing.ts.
 *
 * Annual prices = 10× monthly (two months free) for every flat recurring fee.
 * Metered (scan-count) prices have NO annual variant — usage bills monthly.
 */

import Stripe from "stripe";
import {
  DASHBOARD_PLANS,
  API_PLANS,
  type DashboardPlan,
  type ApiPlan,
  usdToCents,
  annualUsd,
  assertCatalogReconciles,
} from "../lib/pricing";

const DRY_RUN = process.argv.includes("--dry-run");
const METER_EVENT_NAME = "api_scan";

// Every resolved (envVar → priceId) pairing, printed at the end for the operator.
const resolvedEnv: Record<string, string> = {};

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

async function main() {
  // 1) Fail fast if the catalog ever drifts from the enforced quotas.
  assertCatalogReconciles();
  log("✓ catalog reconciles with constants.ts\n");

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is required (sk_live_... or sk_test_...).");
  }
  const stripe = new Stripe(key);

  if (DRY_RUN) log("— DRY RUN: no Stripe writes will be made —\n");

  // 2) Ensure the shared scan-count meter exists.
  const meterId = await ensureMeter(stripe);

  // 3) Dashboard track — flat monthly + annual recurring prices.
  for (const plan of Object.values(DASHBOARD_PLANS) as DashboardPlan[]) {
    if (plan.cta.kind !== "checkout" || !plan.price || plan.priceMonthlyUsd == null) {
      log(`• dashboard "${plan.id}" — ${plan.cta.kind} (no Stripe price)`);
      continue;
    }
    log(`\n▸ Dashboard / ${plan.name}`);
    const productId = await ensureProduct(stripe, {
      tier: plan.id,
      track: "dashboard",
      name: `Weavn ${plan.name}`,
      metadata: {
        weavn_track: "dashboard",
        weavn_tier: plan.id,
        scans_per_month: String(plan.scansPerMonth ?? "unlimited"),
        white_label: String(plan.whiteLabel),
      },
    });

    await upsertFlatPrice(stripe, {
      product: productId,
      lookupKey: `weavn_${plan.id}_monthly`,
      envVar: plan.price.monthly.env,
      amountCents: usdToCents(plan.priceMonthlyUsd),
      interval: "month",
    });
    await upsertFlatPrice(stripe, {
      product: productId,
      lookupKey: `weavn_${plan.id}_annual`,
      envVar: plan.price.annual.env,
      amountCents: usdToCents(annualUsd(plan.priceMonthlyUsd)!),
      interval: "year",
    });
  }

  // 4) API track — flat base (monthly + annual) + metered scan-count price.
  for (const plan of Object.values(API_PLANS) as ApiPlan[]) {
    if (plan.cta.kind !== "checkout" || !plan.price) {
      log(`• api "${plan.id}" — ${plan.cta.kind} (no self-serve Stripe price)`);
      continue;
    }
    log(`\n▸ API / ${plan.name}`);
    const productId = await ensureProduct(stripe, {
      tier: plan.id,
      track: "api",
      name: `Weavn API ${plan.name}`,
      metadata: {
        weavn_track: "api",
        weavn_tier: plan.id,
        included_scans: String(plan.includedScans ?? "n/a"),
        overage_usd: String(plan.overageUsd),
        trial_scans: String(plan.trialScans ?? 0),
      },
    });

    // Flat base fee (only tiers that have one — Playground is metered-only).
    if (plan.baseMonthlyUsd != null && plan.price.baseMonthly && plan.price.baseAnnual) {
      await upsertFlatPrice(stripe, {
        product: productId,
        lookupKey: `weavn_api_${plan.id}_base_monthly`,
        envVar: plan.price.baseMonthly.env,
        amountCents: usdToCents(plan.baseMonthlyUsd),
        interval: "month",
      });
      await upsertFlatPrice(stripe, {
        product: productId,
        lookupKey: `weavn_api_${plan.id}_base_annual`,
        envVar: plan.price.baseAnnual.env,
        amountCents: usdToCents(annualUsd(plan.baseMonthlyUsd)!),
        interval: "year",
      });
    }

    // Metered scan-count price. Graduated: included scans @ $0, then overage/scan.
    // Playground has no included allowance (trial is enforced in-app) → flat per-unit.
    await upsertMeteredPrice(stripe, {
      product: productId,
      lookupKey: `weavn_api_${plan.id}_metered`,
      envVar: plan.price.metered.env,
      meterId,
      includedScans: plan.includedScans ?? 0,
      overageCents: usdToCents(plan.overageUsd),
    });
  }

  // 5) Print env block for the operator.
  log("\n" + "=".repeat(64));
  log("RESULTING PRICE IDS — copy into .env.local / Vercel env:");
  log("=".repeat(64));
  resolvedEnv[`STRIPE_API_SCAN_METER_ID`] = meterId;
  for (const [envVar, id] of Object.entries(resolvedEnv)) {
    log(`${envVar}=${id}`);
  }
  log("=".repeat(64));
  if (DRY_RUN) log("(dry run — ids above are placeholders where prices weren't created)");
}

// ── Meter ───────────────────────────────────────────────────────────────────

async function ensureMeter(stripe: Stripe): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meters: any = await (stripe as any).billing.meters.list({ status: "active", limit: 100 });
  const existing = (meters?.data ?? []).find((m: any) => m.event_name === METER_EVENT_NAME);
  if (existing) {
    log(`✓ meter "${METER_EVENT_NAME}" exists (${existing.id})`);
    return existing.id;
  }
  if (DRY_RUN) {
    log(`+ would create meter "${METER_EVENT_NAME}"`);
    return "meter_DRYRUN";
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meter: any = await (stripe as any).billing.meters.create({
    display_name: "API Scans",
    event_name: METER_EVENT_NAME,
    default_aggregation: { formula: "sum" },
    customer_mapping: { type: "by_id", event_payload_key: "stripe_customer_id" },
    value_settings: { event_payload_key: "value" },
  });
  log(`+ created meter "${METER_EVENT_NAME}" (${meter.id})`);
  return meter.id;
}

// ── Products ──────────────────────────────────────────────────────────────────

async function ensureProduct(
  stripe: Stripe,
  opts: { tier: string; track: string; name: string; metadata: Record<string, string> }
): Promise<string> {
  // Match on stable metadata so re-runs reuse the same product.
  const query = `metadata['weavn_track']:'${opts.track}' AND metadata['weavn_tier']:'${opts.tier}'`;
  let existingId: string | undefined;
  try {
    const found = await stripe.products.search({ query, limit: 1 });
    existingId = found.data[0]?.id;
  } catch {
    // Search index can lag right after creation; fall back to a list scan.
    const list = await stripe.products.list({ active: true, limit: 100 });
    existingId = list.data.find(
      (p) => p.metadata?.weavn_track === opts.track && p.metadata?.weavn_tier === opts.tier
    )?.id;
  }

  if (existingId) {
    if (!DRY_RUN) {
      await stripe.products.update(existingId, { name: opts.name, metadata: opts.metadata });
    }
    log(`  ✓ product ${existingId} (${opts.name})`);
    return existingId;
  }
  if (DRY_RUN) {
    log(`  + would create product "${opts.name}"`);
    return `prod_DRYRUN_${opts.tier}`;
  }
  const product = await stripe.products.create({ name: opts.name, metadata: opts.metadata });
  log(`  + created product ${product.id} (${opts.name})`);
  return product.id;
}

// ── Prices (immutable → upsert by lookup_key) ─────────────────────────────────

async function findPriceByLookup(stripe: Stripe, lookupKey: string): Promise<Stripe.Price | undefined> {
  const list = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  return list.data[0];
}

async function upsertFlatPrice(
  stripe: Stripe,
  opts: {
    product: string;
    lookupKey: string;
    envVar: string;
    amountCents: number;
    interval: "month" | "year";
  }
): Promise<void> {
  const existing = await findPriceByLookup(stripe, opts.lookupKey);

  if (
    existing &&
    existing.unit_amount === opts.amountCents &&
    existing.currency === "usd" &&
    existing.recurring?.interval === opts.interval &&
    existing.product === opts.product
  ) {
    resolvedEnv[opts.envVar] = existing.id;
    log(`    ✓ ${opts.lookupKey} unchanged → ${existing.id} ($${(opts.amountCents / 100).toFixed(2)}/${opts.interval})`);
    return;
  }

  if (DRY_RUN) {
    resolvedEnv[opts.envVar] = existing ? `${existing.id} (would replace)` : "price_DRYRUN";
    log(`    + would ${existing ? "replace" : "create"} ${opts.lookupKey} ($${(opts.amountCents / 100).toFixed(2)}/${opts.interval})`);
    return;
  }

  const price = await stripe.prices.create({
    product: opts.product,
    currency: "usd",
    unit_amount: opts.amountCents,
    recurring: { interval: opts.interval },
    lookup_key: opts.lookupKey,
    transfer_lookup_key: Boolean(existing), // steal the key from the old price
    metadata: { weavn_lookup: opts.lookupKey },
  });
  resolvedEnv[opts.envVar] = price.id;
  log(`    + ${existing ? "replaced" : "created"} ${opts.lookupKey} → ${price.id} ($${(opts.amountCents / 100).toFixed(2)}/${opts.interval})`);
}

async function upsertMeteredPrice(
  stripe: Stripe,
  opts: {
    product: string;
    lookupKey: string;
    envVar: string;
    meterId: string;
    includedScans: number;
    overageCents: number;
  }
): Promise<void> {
  const existing = await findPriceByLookup(stripe, opts.lookupKey);

  // Build the price params. Graduated tiers when there's an included allowance;
  // otherwise a flat per-unit metered price (Playground pay-as-you-go).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recurring: any = { interval: "month", usage_type: "metered", meter: opts.meterId };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createParams: any =
    opts.includedScans > 0
      ? {
          product: opts.product,
          currency: "usd",
          recurring,
          billing_scheme: "tiered",
          tiers_mode: "graduated",
          tiers: [
            { up_to: opts.includedScans, unit_amount: 0 },
            { up_to: "inf", unit_amount: opts.overageCents },
          ],
          lookup_key: opts.lookupKey,
          metadata: {
            weavn_lookup: opts.lookupKey,
            included_scans: String(opts.includedScans),
            overage_cents: String(opts.overageCents),
          },
        }
      : {
          product: opts.product,
          currency: "usd",
          recurring,
          unit_amount: opts.overageCents,
          lookup_key: opts.lookupKey,
          metadata: { weavn_lookup: opts.lookupKey, overage_cents: String(opts.overageCents) },
        };

  // Metered prices can't be cheaply diffed (tiers aren't a flat field), so we
  // re-mint whenever the existing price's metadata doesn't match the intended
  // included/overage figures — idempotent on a stable catalog, replaces on change.
  const matches =
    existing &&
    existing.product === opts.product &&
    existing.metadata?.overage_cents === String(opts.overageCents) &&
    (opts.includedScans > 0
      ? existing.metadata?.included_scans === String(opts.includedScans)
      : existing.billing_scheme === "per_unit");

  if (matches) {
    resolvedEnv[opts.envVar] = existing!.id;
    log(`    ✓ ${opts.lookupKey} unchanged → ${existing!.id} (incl ${opts.includedScans}, $${(opts.overageCents / 100).toFixed(2)}/scan)`);
    return;
  }

  if (DRY_RUN) {
    resolvedEnv[opts.envVar] = existing ? `${existing.id} (would replace)` : "price_DRYRUN";
    log(`    + would ${existing ? "replace" : "create"} metered ${opts.lookupKey} (incl ${opts.includedScans}, $${(opts.overageCents / 100).toFixed(2)}/scan)`);
    return;
  }

  createParams.transfer_lookup_key = Boolean(existing);
  const price = await stripe.prices.create(createParams);
  resolvedEnv[opts.envVar] = price.id;
  log(`    + ${existing ? "replaced" : "created"} metered ${opts.lookupKey} → ${price.id} (incl ${opts.includedScans}, $${(opts.overageCents / 100).toFixed(2)}/scan)`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("\n[setup-stripe] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
