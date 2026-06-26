// Creates the 17 Stripe env vars for the Preview environment (all preview branches)
// via the Vercel REST API. Works around `vercel env add ... preview` returning
// action_required/git_branch_required in non-TTY mode (CLI 54.14.0).
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const auth = JSON.parse(readFileSync(join(homedir(), 'AppData/Roaming/xdg.data/com.vercel.cli/auth.json'), 'utf8'));
const TOKEN = auth.token;
const PROJECT_ID = 'prj_hW9VS1Ck08RqS2WfPpJJ4OOoSe79';
const TEAM_ID = 'team_zIDvBNfzm3ku2DExQ5uPDjlw';

const vars = {
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

const url = `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&upsert=true`;
let ok = 0, fail = 0;

for (const [key, value] of Object.entries(vars)) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type: 'encrypted', target: ['preview'] }),
  });
  if (res.ok) {
    console.log(`OK   ${key} [preview]`);
    ok++;
  } else {
    const body = await res.text();
    console.log(`FAIL ${key} [preview] HTTP ${res.status}: ${body.slice(0, 200)}`);
    fail++;
  }
}
console.log(`\nDone. ${ok} succeeded, ${fail} failed (of ${Object.keys(vars).length}).`);
