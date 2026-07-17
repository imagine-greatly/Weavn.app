/**
 * scripts/verify-stripe-state.mts — post-mint verification for the Stripe catalog.
 *
 * Loads .env.local, resolves every price-id + meter slot from ENV (never hardcoded),
 * retrieves each object from Stripe, and ASSERTS the exact minted shape + amount for
 * the repriced catalog. Exits non-zero on ANY mismatch so it can gate a mint.
 *
 *     STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/verify-stripe-state.mts
 *
 * The expected amounts below are the reprice targets (mirror lib/pricing.ts /
 * lib/constants.ts). They are kept as explicit literals ON PURPOSE so this verifier
 * is INDEPENDENT of the catalog it checks — a catalog regression can never make a
 * wrongly-minted price pass here. Amounts are in cents; annual = 10× monthly.
 */

import Stripe from "stripe";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Env slots (price ids + meter id) live in .env.local, written by setup-stripe.ts.
loadEnv({ path: resolve(process.cwd(), ".env.local") });

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("ERROR: STRIPE_SECRET_KEY is required (sk_live_... or sk_test_...).");
  process.exit(1);
}
const stripe = new Stripe(key);

// ── Expected minted shapes — the reprice targets (independent literals) ─────────

type FlatCheck = { kind: "flat"; interval: "month" | "year"; unitAmount: number };
type GraduatedCheck = { kind: "metered_graduated"; includedScans: number; overageCents: number };
type PerUnitMeteredCheck = { kind: "metered_flat"; overageCents: number };
type PriceCheck = FlatCheck | GraduatedCheck | PerUnitMeteredCheck;

/** 16 price slots: 6 dashboard flat + 6 API base flat + 4 API metered. */
const EXPECTED: Record<string, PriceCheck> = {
  // Dashboard track — flat monthly + annual (annual = 10× monthly).
  STRIPE_PRICE_STARTER_MONTHLY: { kind: "flat", interval: "month", unitAmount: 3900 },
  STRIPE_PRICE_STARTER_ANNUAL: { kind: "flat", interval: "year", unitAmount: 39000 },
  STRIPE_PRICE_PRO_MONTHLY: { kind: "flat", interval: "month", unitAmount: 9900 },
  STRIPE_PRICE_PRO_ANNUAL: { kind: "flat", interval: "year", unitAmount: 99000 },
  STRIPE_PRICE_AGENCY_MONTHLY: { kind: "flat", interval: "month", unitAmount: 24900 },
  STRIPE_PRICE_AGENCY_ANNUAL: { kind: "flat", interval: "year", unitAmount: 249000 },

  // API track — flat base fees (monthly + annual).
  STRIPE_PRICE_DEV_BASE_MONTHLY: { kind: "flat", interval: "month", unitAmount: 8900 },
  STRIPE_PRICE_DEV_BASE_ANNUAL: { kind: "flat", interval: "year", unitAmount: 89000 },
  STRIPE_PRICE_BUILDER_BASE_MONTHLY: { kind: "flat", interval: "month", unitAmount: 33900 },
  STRIPE_PRICE_BUILDER_BASE_ANNUAL: { kind: "flat", interval: "year", unitAmount: 339000 },
  STRIPE_PRICE_SCALE_BASE_MONTHLY: { kind: "flat", interval: "month", unitAmount: 92900 },
  STRIPE_PRICE_SCALE_BASE_ANNUAL: { kind: "flat", interval: "year", unitAmount: 929000 },

  // API track — metered scan-count prices. Graduated tiers: included @ $0, then overage.
  STRIPE_PRICE_PLAYGROUND_METERED: { kind: "metered_flat", overageCents: 50 },
  STRIPE_PRICE_DEV_METERED: { kind: "metered_graduated", includedScans: 120, overageCents: 74 },
  STRIPE_PRICE_BUILDER_METERED: { kind: "metered_graduated", includedScans: 500, overageCents: 68 },
  STRIPE_PRICE_SCALE_METERED: { kind: "metered_graduated", includedScans: 1500, overageCents: 62 },
};

const METER_ENV = "STRIPE_API_SCAN_METER_ID";
const METER_EVENT_NAME = "api_scan";

const failures: string[] = [];
const fail = (slot: string, msg: string) => failures.push(`${slot}: ${msg}`);
const slotFailed = (slot: string) => failures.some((f) => f.startsWith(`${slot}: `));

// ── Assertions ─────────────────────────────────────────────────────────────────

function checkFlat(slot: string, price: Stripe.Price, exp: FlatCheck) {
  if (price.currency !== "usd") fail(slot, `currency=${price.currency} != usd`);
  if (price.unit_amount !== exp.unitAmount) fail(slot, `unit_amount=${price.unit_amount} != ${exp.unitAmount}`);
  if (price.recurring?.interval !== exp.interval) fail(slot, `interval=${price.recurring?.interval} != ${exp.interval}`);
  if (price.recurring?.usage_type !== "licensed") fail(slot, `usage_type=${price.recurring?.usage_type} != licensed`);
}

function checkMeteredCommon(slot: string, price: Stripe.Price, meterId: string | undefined) {
  if (price.currency !== "usd") fail(slot, `currency=${price.currency} != usd`);
  if (price.recurring?.usage_type !== "metered") fail(slot, `usage_type=${price.recurring?.usage_type} != metered`);
  // Confirm the metered price is wired to the meter env var points at.
  const wired = (price.recurring as { meter?: string } | null | undefined)?.meter;
  if (meterId && wired && wired !== meterId) fail(slot, `recurring.meter=${wired} != ${meterId}`);
}

function checkGraduated(slot: string, price: Stripe.Price, exp: GraduatedCheck, meterId: string | undefined) {
  checkMeteredCommon(slot, price, meterId);
  if (price.billing_scheme !== "tiered") fail(slot, `billing_scheme=${price.billing_scheme} != tiered`);
  if (price.tiers_mode !== "graduated") fail(slot, `tiers_mode=${price.tiers_mode} != graduated`);
  const tiers = price.tiers ?? [];
  if (tiers.length < 2) {
    fail(slot, `expected 2 tiers, got ${tiers.length} (retrieve must expand ['tiers'])`);
    return;
  }
  const [t0, t1] = tiers;
  if (t0.up_to !== exp.includedScans) fail(slot, `tier0.up_to=${t0.up_to} != ${exp.includedScans}`);
  if (t0.unit_amount !== 0) fail(slot, `tier0.unit_amount=${t0.unit_amount} != 0 (included scans must be free)`);
  if (t1.up_to !== null) fail(slot, `tier1.up_to=${t1.up_to} != null (inf)`);
  if (t1.unit_amount !== exp.overageCents) fail(slot, `tier1.unit_amount=${t1.unit_amount} != ${exp.overageCents}`);
}

function checkPerUnitMetered(slot: string, price: Stripe.Price, exp: PerUnitMeteredCheck, meterId: string | undefined) {
  checkMeteredCommon(slot, price, meterId);
  if (price.billing_scheme !== "per_unit") fail(slot, `billing_scheme=${price.billing_scheme} != per_unit`);
  if (price.unit_amount !== exp.overageCents) fail(slot, `unit_amount=${price.unit_amount} != ${exp.overageCents}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const mode =
    key!.startsWith("sk_live_") || key!.startsWith("rk_live_")
      ? "LIVE"
      : key!.startsWith("sk_test_") || key!.startsWith("rk_test_")
        ? "TEST"
        : "UNKNOWN";
  console.log(`key mode: ${mode} (prefix=${key!.slice(0, 8)})`);

  const acct = await stripe.accounts
    .retrieve()
    .catch((e) => ({ id: `(account retrieve failed: ${e.message})` }) as Stripe.Account);
  console.log(`account: ${acct.id}\n`);

  // Resolve + assert the meter first (metered prices reference it).
  const meterId = process.env[METER_ENV];
  if (!meterId) {
    fail(METER_ENV, "env var missing — meter id not set");
    console.log(`  MISS ${METER_ENV} (env unset)`);
  } else {
    try {
      // billing.meters is newer than the pinned SDK types — access untyped.
      const meter = await (
        stripe as unknown as {
          billing: { meters: { retrieve: (id: string) => Promise<{ status: string; event_name: string; display_name: string }> } };
        }
      ).billing.meters.retrieve(meterId);
      if (meter.status !== "active") fail(METER_ENV, `status=${meter.status} != active`);
      if (meter.event_name !== METER_EVENT_NAME) fail(METER_ENV, `event_name=${meter.event_name} != ${METER_EVENT_NAME}`);
      console.log(
        `  ${slotFailed(METER_ENV) ? "BAD " : "OK  "} ${METER_ENV}=${meterId} status=${meter.status} event_name="${meter.event_name}"`
      );
    } catch (e) {
      fail(METER_ENV, `retrieve failed: ${(e as Error).message}`);
      console.log(`  MISS ${METER_ENV}=${meterId} → ${(e as Error).message}`);
    }
  }
  console.log("");

  // Resolve + assert each of the 16 price slots.
  for (const [slot, exp] of Object.entries(EXPECTED)) {
    const priceId = process.env[slot];
    if (!priceId) {
      fail(slot, "env var missing — price id not set");
      console.log(`  MISS ${slot} (env unset)`);
      continue;
    }
    try {
      const price = await stripe.prices.retrieve(
        priceId,
        exp.kind === "metered_graduated" ? { expand: ["tiers"] } : {}
      );
      if (!price.active) fail(slot, `active=false (price ${priceId} is archived)`);
      if (exp.kind === "flat") checkFlat(slot, price, exp);
      else if (exp.kind === "metered_graduated") checkGraduated(slot, price, exp, meterId);
      else checkPerUnitMetered(slot, price, exp, meterId);
      console.log(`  ${slotFailed(slot) ? "BAD " : "OK  "} ${slot}=${priceId} active=${price.active}`);
    } catch (e) {
      fail(slot, `retrieve failed: ${(e as Error).message}`);
      console.log(`  MISS ${slot}=${priceId} → ${(e as Error).message}`);
    }
  }

  // Verdict.
  console.log("\n" + "=".repeat(64));
  if (failures.length) {
    console.log(`FAIL — ${failures.length} problem(s):`);
    for (const f of failures) console.log(`  ✗ ${f}`);
    console.log("=".repeat(64));
    process.exit(1);
  }
  console.log(`PASS — all ${Object.keys(EXPECTED).length} prices + meter match the repriced catalog.`);
  console.log("=".repeat(64));
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
