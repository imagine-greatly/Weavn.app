// Confirms each of the 17 Stripe vars exists in development+preview+production
// with the exact expected value (decrypted via the API).
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const auth = JSON.parse(readFileSync(join(homedir(), 'AppData/Roaming/xdg.data/com.vercel.cli/auth.json'), 'utf8'));
const TOKEN = auth.token;
const PROJECT_ID = 'prj_hW9VS1Ck08RqS2WfPpJJ4OOoSe79';
const TEAM_ID = 'team_zIDvBNfzm3ku2DExQ5uPDjlw';

const expected = {
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
  STRIPE_API_SCAN_METER_ID: 'mtr_61UsYETI27EbqrpPE41JhDGw6VImSITQ',
};
const WANT = ['development', 'preview', 'production'];

const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&decrypt=true`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const { envs } = await res.json();

// Aggregate every value entry per key -> { value -> Set(targets) }
const byKey = {};
for (const e of envs) {
  if (!(e.key in expected)) continue;
  byKey[e.key] ??= {};
  for (const t of e.target || []) {
    (byKey[e.key][e.value] ??= new Set()).add(t);
  }
}

let allGood = true;
for (const [key, want] of Object.entries(expected)) {
  const entries = byKey[key] || {};
  const targets = new Set(Object.values(entries).flatMap((s) => [...s]));
  const missing = WANT.filter((t) => !targets.has(t));
  const values = Object.keys(entries);
  const valueOk = values.length === 1 && values[0] === want;
  const status = missing.length === 0 && valueOk ? 'OK  ' : 'BAD ';
  if (status === 'BAD ') allGood = false;
  console.log(
    `${status}${key.padEnd(34)} envs=[${[...targets].sort().join(',')}]` +
      (missing.length ? ` MISSING:${missing.join(',')}` : '') +
      (valueOk ? ` value=${want}` : ` VALUE_MISMATCH(got ${values.join('|')})`),
  );
}
console.log(`\n${allGood ? 'ALL 17 VARS PRESENT IN dev+preview+prod WITH CORRECT VALUES ✅' : 'DISCREPANCIES FOUND ⚠️'}`);
process.exit(allGood ? 0 : 1);
