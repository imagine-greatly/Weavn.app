/**
 * scripts/diagPass2.ts — PART B measurement. On ONE stripe scrape + ONE pass-1, runs pass-2
 * BOTH ways — OLD (narrate every FAIL) vs NEW (narrate only top findingLimit by priority) —
 * and reports output tokens + est_cost for each. Same pass-1 → score/skip identical by
 * construction, isolating the trim as cost-only. Also verifies cache reuse (pass-1 create,
 * pass-2 read; catalog NOT recreated each pass).
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/diagPass2.ts
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

import Anthropic from "@anthropic-ai/sdk";
import { scrapeSite } from "../lib/scraper";
import { detectSiteType } from "../lib/siteType";
import { buildPageSummary } from "../lib/analyze";
import {
  scopeChecksForScan, buildPass1SystemBlocks, buildPass2SystemBlocks, parseStatusRows,
  parsePass2Narrative, topFailIdsByPriority, rubricCounts, computeApiDimensions, API_DIMENSION_KEYS,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";

const URL_ = "https://stripe.com";
const PASS1_MAX_TOKENS = 8000, PASS1_RETRY_MAX_TOKENS = 12000, PASS2_MAX_TOKENS = 16000;
const FINDING_LIMIT = 10;
const MODEL_INACTIVITY_TIMEOUT_MS = 220_000;
// rates $/MTok — from lib/scanCost.ts (SONNET_RATE_*)
const IN_RATE = 3, OUT_RATE = 15, CACHE_READ_RATE = 0.30, CACHE_CREATE_RATE = 3.75;

type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
const estCost = (u: Usage) => ((u.input_tokens ?? 0) * IN_RATE + (u.output_tokens ?? 0) * OUT_RATE + (u.cache_read_input_tokens ?? 0) * CACHE_READ_RATE + (u.cache_creation_input_tokens ?? 0) * CACHE_CREATE_RATE) / 1e6;

if (!process.env.ANTHROPIC_API_KEY || !process.env.BROWSERLESS_API_KEY) { console.error("FATAL: keys missing"); process.exit(1); }
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 290_000 });

async function call(maxTokens: number, system: ReturnType<typeof buildPass1SystemBlocks>, userContent: string) {
  const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: userContent }] });
  let timedOut = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { timedOut = true; try { stream.abort(); } catch { /* */ } }, MODEL_INACTIVITY_TIMEOUT_MS); };
  stream.on("text", () => arm()); arm();
  let msg: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { msg = await stream.finalMessage(); } catch (e) { if (timedOut) throw new Error("inactivity timeout"); throw e; }
  finally { clearTimeout(timer!); }
  const block = msg.content.find((c) => c.type === "text");
  return { text: block && block.type === "text" ? block.text : "", usage: msg.usage as Usage };
}

async function main() {
  console.log(`[pass2] scraping ${URL_} ...`);
  const extraction = await scrapeSite(URL_);
  const site_type = detectSiteType(extraction);
  const scopedChecks = scopeChecksForScan(site_type);
  const byId = new Map(scopedChecks.map((c) => [c.id, c]));
  const summary = buildPageSummary(extraction);
  const summaryContent = `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;

  // ── PASS 1 (status) — the shared denominator for both pass-2 variants ──
  const c1 = await call(PASS1_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), summaryContent);
  let p1 = parseStatusRows(c1.text, scopedChecks);
  let p1Usage: Usage = c1.usage;
  if (p1.truncated || p1.backfilledIds.length > 0) { const c1r = await call(PASS1_RETRY_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), summaryContent); p1 = parseStatusRows(c1r.text, scopedChecks); p1Usage = c1r.usage; }
  const rows = p1.rows;
  const counts = rubricCounts(rows, scopedChecks);
  const dims = computeApiDimensions(rows);
  const w = getWeightProfile(site_type);
  const score = Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
  const allFails = rows.filter((r) => String(r.status).toUpperCase() === "FAIL").map((r) => r.id);
  const topFails = topFailIdsByPriority(rows, scopedChecks, FINDING_LIMIT);
  console.log(`[pass2] PASS1: score=${score} answered=${counts.passes + counts.fails}/${scopedChecks.length} skip=${counts.skips} fails=${allFails.length} → narrate top ${topFails.length}`);
  console.log(`[pass2] CACHE pass1: input=${p1Usage.input_tokens} cache_creation=${p1Usage.cache_creation_input_tokens} cache_read=${p1Usage.cache_read_input_tokens}`);

  const mkUser = (ids: string[]) => `${summaryContent}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${ids.map((id) => `${id} | ${byId.get(id)?.title ?? ""}`).join("\n")}`;

  // ── PASS 2 OLD — narrate every FAIL (the discarded-output behavior) ──
  const cOld = await call(PASS2_MAX_TOKENS, buildPass2SystemBlocks(scopedChecks), mkUser(allFails));
  const pOld = parsePass2Narrative(cOld.text);
  console.log(`[pass2] OLD (narrate ${allFails.length}): output=${cOld.usage.output_tokens} cache_read=${cOld.usage.cache_read_input_tokens} cache_creation=${cOld.usage.cache_creation_input_tokens} returnedNarr=${pOld.returnedFailRows} truncated=${pOld.truncated}`);

  // ── PASS 2 NEW — narrate only top findingLimit ──
  const cNew = await call(PASS2_MAX_TOKENS, buildPass2SystemBlocks(scopedChecks), mkUser(topFails));
  const pNew = parsePass2Narrative(cNew.text);
  console.log(`[pass2] NEW (narrate ${topFails.length}): output=${cNew.usage.output_tokens} cache_read=${cNew.usage.cache_read_input_tokens} cache_creation=${cNew.usage.cache_creation_input_tokens} returnedNarr=${pNew.returnedFailRows} truncated=${pNew.truncated}`);

  // ── Full-scan cost = pass1 + pass2 (pass1 identical for both) ──
  const costOld = estCost(p1Usage) + estCost(cOld.usage);
  const costNew = estCost(p1Usage) + estCost(cNew.usage);
  const outOld = (p1Usage.output_tokens ?? 0) + (cOld.usage.output_tokens ?? 0);
  const outNew = (p1Usage.output_tokens ?? 0) + (cNew.usage.output_tokens ?? 0);

  console.log("\n================ PART B — PASS-2 TRIM (same pass-1, score/skip identical) ================");
  console.log(`score=${score} skip=${counts.skips}/${scopedChecks.length}  (identical for both variants — pass-1 untouched)`);
  console.log(`BEFORE (narrate all ${allFails.length}): pass2_out=${cOld.usage.output_tokens} | scan_out(p1+p2)=${outOld} | scan_cost=$${costOld.toFixed(4)}`);
  console.log(`AFTER  (narrate top ${topFails.length}):  pass2_out=${cNew.usage.output_tokens} | scan_out(p1+p2)=${outNew} | scan_cost=$${costNew.toFixed(4)}`);
  console.log(`pass-2 output reduction: ${(cOld.usage.output_tokens ?? 0)} → ${(cNew.usage.output_tokens ?? 0)} (${(((cOld.usage.output_tokens ?? 1) - (cNew.usage.output_tokens ?? 0)) / (cOld.usage.output_tokens ?? 1) * 100).toFixed(0)}% less); scan cost $${costOld.toFixed(4)} → $${costNew.toFixed(4)}`);
  console.log("\n--- CACHE VERIFICATION ---");
  console.log(`pass1: cache_creation=${p1Usage.cache_creation_input_tokens} cache_read=${p1Usage.cache_read_input_tokens}`);
  console.log(`pass2: cache_creation=${cOld.usage.cache_creation_input_tokens} cache_read=${cOld.usage.cache_read_input_tokens}`);
  const created = (p1Usage.cache_creation_input_tokens ?? 0) > 0;
  const pass2Reads = (cOld.usage.cache_read_input_tokens ?? 0) > 0 && (cOld.usage.cache_creation_input_tokens ?? 0) === 0;
  console.log(`verdict: ${created && pass2Reads ? "REUSED — catalog CREATED on pass-1, READ on pass-2 (not recreated)" : pass2Reads ? "REUSED on pass-2 (pass-1 read a warm cache from a prior run)" : "CHECK — pass-2 did not cleanly read the cached catalog"}`);
  console.log("\n(done)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
