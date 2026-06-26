import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });

const EXPECTED_PRICES: Record<string, string> = {
  STRIPE_PRICE_STARTER_MONTHLY: 'price_1TjAH8JhDGw6VImSlTEGycEP',
  STRIPE_PRICE_STARTER_ANNUAL: 'price_1TjAH8JhDGw6VImSdW856mgO',
  STRIPE_PRICE_PRO_MONTHLY: 'price_1TjAH9JhDGw6VImSpMTutS4b',
  STRIPE_PRICE_PRO_ANNUAL: 'price_1TjAH9JhDGw6VImSaHoynyyo',
  STRIPE_PRICE_AGENCY_MONTHLY: 'price_1TjAHAJhDGw6VImSgzTlOwxf',
  STRIPE_PRICE_AGENCY_ANNUAL: 'price_1TjAHAJhDGw6VImSoX2Ra9R5',
  STRIPE_PRICE_PLAYGROUND_METERED: 'price_1TjAHBJhDGw6VImSqCRG214v',
  STRIPE_PRICE_DEV_BASE_MONTHLY: 'price_1TjAHBJhDGw6VImSdvetyCHK',
  STRIPE_PRICE_DEV_BASE_ANNUAL: 'price_1TjAHCJhDGw6VImSnSUmLIbQ',
  STRIPE_PRICE_DEV_METERED: 'price_1TjMoUJhDGw6VImSyTPDwMN1',
  STRIPE_PRICE_BUILDER_BASE_MONTHLY: 'price_1TjAHCJhDGw6VImSiNrdY87M',
  STRIPE_PRICE_BUILDER_BASE_ANNUAL: 'price_1TjAHDJhDGw6VImSSssFwvwz',
  STRIPE_PRICE_BUILDER_METERED: 'price_1TjMoVJhDGw6VImSdxZDFojG',
  STRIPE_PRICE_SCALE_BASE_MONTHLY: 'price_1TjAHEJhDGw6VImSlNQMGAji',
  STRIPE_PRICE_SCALE_BASE_ANNUAL: 'price_1TjAHEJhDGw6VImShaEUYW6L',
  STRIPE_PRICE_SCALE_METERED: 'price_1TjMoXJhDGw6VImS8bCrGRDO',
};

async function main() {
  console.log(`key mode: ${key.startsWith('sk_live_') || key.startsWith('rk_live_') ? 'LIVE' : key.startsWith('sk_test_') || key.startsWith('rk_test_') ? 'TEST' : 'UNKNOWN'} (prefix=${key.slice(0, 8)})`);

  const acct = await stripe.accounts.retrieve().catch((e) => ({ id: '(account retrieve failed: ' + e.message + ')' } as any));
  console.log(`account: ${acct.id}`);

  // All products (active + inactive)
  const all = await stripe.products.list({ limit: 100 });
  const active = all.data.filter((p) => p.active);
  console.log(`\nproducts.list (limit 100): ${all.data.length} total, ${active.length} active, has_more=${all.has_more}`);
  for (const p of all.data) {
    const prices = await stripe.prices.list({ product: p.id, limit: 20 });
    console.log(`  [${p.active ? 'ACTIVE' : 'inactive'}] ${p.name} (${p.id}) → ${prices.data.length} prices: ${prices.data.map((pr) => pr.id).join(', ')}`);
  }

  // Directly retrieve each expected price id
  console.log(`\nexpected price ids (direct retrieve):`);
  for (const [envName, priceId] of Object.entries(EXPECTED_PRICES)) {
    try {
      const pr = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const prod = pr.product as Stripe.Product;
      console.log(`  OK   ${envName}=${priceId} active=${pr.active} product="${typeof prod === 'string' ? prod : prod.name}" amount=${pr.unit_amount ?? pr.billing_scheme}`);
    } catch (e: any) {
      console.log(`  MISS ${envName}=${priceId} → ${e.message}`);
    }
  }

  // Meter
  const meter = await stripe.billing.meters.retrieve('mtr_61UsYETI27EbqrpPE41JhDGw6VImSITQ');
  console.log(`\nmeter mtr_61UsYETI27EbqrpPE41JhDGw6VImSITQ: status=${meter.status} display_name="${meter.display_name}" event_name="${meter.event_name}"`);
}

main().catch((e) => {
  console.error('ERROR:', e?.message ?? e);
  process.exit(1);
});
