import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any });

const PRODUCT_IDS = [
  'prod_UibUC9Y0LiKbkR', // Weavn Starter
  'prod_UibUSWMaFtBoiu', // Weavn Pro
  'prod_UibUkV1l3cgGAW', // Weavn Agency
  'prod_UibU78MvMVhasn', // Weavn API Playground
  'prod_UibUAQX53FO40B', // Weavn API Dev
  'prod_UibUWYMY1uwM9G', // Weavn API Builder
  'prod_UibUIf9PKnfP3i', // Weavn API Scale
];

async function main() {
  for (const id of PRODUCT_IDS) {
    const before = await stripe.products.retrieve(id);
    if (before.active) {
      console.log(`SKIP ${before.name} (${id}) already active`);
      continue;
    }
    const after = await stripe.products.update(id, { active: true });
    console.log(`SET  ${after.name} (${id}) active=${after.active}`);
  }

  // Re-verify
  const active = await stripe.products.list({ limit: 100, active: true });
  console.log(`\nactive products now: ${active.data.length}`);
  for (const p of active.data) {
    console.log(`  [ACTIVE] ${p.name} (${p.id})`);
  }
}

main().catch((e) => {
  console.error('ERROR:', e?.message ?? e);
  process.exit(1);
});
