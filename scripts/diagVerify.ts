/**
 * scripts/diagVerify.ts — PART D: north-star verification for ONE site, 3× SEQUENTIALLY.
 * Full path: scrapeSite (now with networkidle2 + retry-on-thin) → completeness gate →
 * pass-1 scoring. A gated (degraded) scrape makes NO model call (proves no token burn).
 * PASS = same URL yields stable bytes + stable score across 3 runs, OR honestly returns
 * degraded_scrape instead of a wrong score.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/diagVerify.ts --url=https://stripe.com --label=stripe
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { scrapeSite, assessRenderCompleteness } from "../lib/scraper";
import { detectSiteType } from "../lib/siteType";
import { extractPageData } from "../lib/analyzePipeline";
import { buildPageSummary } from "../lib/analyze";
import {
  scopeChecksForScan, buildPass1SystemBlocks, parseStatusRows,
  computeApiDimensions, rubricCounts, CATEGORY_TO_DIMENSION, API_DIMENSION_KEYS, type ApiDimensionKey,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const urlArg = process.argv.find((a) => a.startsWith("--url=")); const URL_ = urlArg ? urlArg.slice(6) : "https://stripe.com";
const labelArg = process.argv.find((a) => a.startsWith("--label=")); const LABEL = labelArg ? labelArg.slice(8) : "site";
const PASS1_MAX_TOKENS = 8000, PASS1_RETRY_MAX_TOKENS = 12000, MODEL_INACTIVITY_TIMEOUT_MS = 200_000;

if (!process.env.ANTHROPIC_API_KEY || !process.env.BROWSERLESS_API_KEY) { console.error("FATAL keys missing"); process.exit(1); }
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 290_000 });

async function call(maxTokens: number, system: ReturnType<typeof buildPass1SystemBlocks>, user: string) {
  const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: user }] });
  let to = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { to = true; try { stream.abort(); } catch { /* */ } }, MODEL_INACTIVITY_TIMEOUT_MS); };
  stream.on("text", () => arm()); arm();
  let m: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { m = await stream.finalMessage(); } catch (e) { if (to) throw new Error("inactivity timeout"); throw e; } finally { clearTimeout(timer!); }
  const b = m.content.find((c) => c.type === "text"); return b && b.type === "text" ? b.text : "";
}

function tfCounts(rows: { id: string; status: string }[], scoped: { id: string; category: string }[]) {
  const cat = new Map(scoped.map((c) => [c.id, c.category])); let ans = 0, skip = 0;
  for (const r of rows) { if ((CATEGORY_TO_DIMENSION[cat.get(r.id) ?? ""] as ApiDimensionKey) !== "technical_foundation") continue; const s = String(r.status).toUpperCase(); if (s === "PASS" || s === "FAIL") ans++; else skip++; }
  return { ans, skip };
}

interface Row { run: number; bytes: number; summaryHash: string; complete: boolean; gateReason: string; modelCalled: boolean; score: number | null; skipRate: number | null; tf: string; outcome: string; }

async function main() {
  const rows: Row[] = [];
  for (let run = 1; run <= 3; run++) {
    console.log(`\n=== ${LABEL} run ${run} — ${URL_} ===`);
    let r: Row = { run, bytes: 0, summaryHash: "-", complete: false, gateReason: "-", modelCalled: false, score: null, skipRate: null, tf: "-", outcome: "" };
    try {
      const extraction = await scrapeSite(URL_);
      r.bytes = extraction.rawHtml.length;
      const summary = buildPageSummary(extraction); r.summaryHash = sha1(summary);
      const page = extractPageData(extraction.rawHtml, URL_, "homepage");
      const assess = assessRenderCompleteness(extraction.rawHtml, { wordCount: page.wordCount, headlineCount: page.headlines.length, linkCount: page.htmlSignals.linkCount });
      r.complete = assess.complete; r.gateReason = assess.reason;
      if (!assess.complete) {
        r.outcome = `degraded_scrape (${assess.reason})`; r.modelCalled = false;
        console.log(`  GATED → degraded_scrape | ${assess.reason} | readable=${assess.readableChars} words=${page.wordCount} headings=${page.headlines.length} links=${page.htmlSignals.linkCount} | NO model call`);
      } else {
        const site_type = detectSiteType(extraction);
        const scoped = scopeChecksForScan(site_type);
        r.modelCalled = true;
        let p1 = parseStatusRows(await call(PASS1_MAX_TOKENS, buildPass1SystemBlocks(scoped), summary), scoped);
        if (p1.truncated || p1.backfilledIds.length > 0) p1 = parseStatusRows(await call(PASS1_RETRY_MAX_TOKENS, buildPass1SystemBlocks(scoped), summary), scoped);
        const counts = rubricCounts(p1.rows, scoped);
        const dims = computeApiDimensions(p1.rows); const w = getWeightProfile(site_type);
        r.score = Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
        r.skipRate = counts.skips / scoped.length;
        const tf = tfCounts(p1.rows, scoped); r.tf = `${tf.ans}/${tf.skip}`;
        r.outcome = `scored ${r.score} (skip ${(r.skipRate * 100).toFixed(0)}%)`;
        console.log(`  SCORED → ${r.score} | skip ${(r.skipRate * 100).toFixed(1)}% | tf ${r.tf} | bytes=${r.bytes}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      r.outcome = /BOT_BLOCKED/.test(msg) ? "BOT_BLOCKED (honest)" : `error: ${msg.slice(0, 50)}`;
      console.log(`  ${r.outcome}`);
    }
    rows.push(r);
    console.log(`VROW ${JSON.stringify(r)}`);
  }

  console.log(`\n================ PART D — ${LABEL} (3× sequential, full path) ================`);
  console.log("run | bytes   | summaryHash  | complete | model | outcome");
  for (const r of rows) console.log(`${r.run}   | ${String(r.bytes).padStart(7)} | ${r.summaryHash.padEnd(12)} | ${r.complete ? "Y" : "N"}        | ${r.modelCalled ? "Y" : "n"}     | ${r.outcome}`);

  const scored = rows.filter((r) => r.score !== null).map((r) => r.score!);
  const gated = rows.filter((r) => !r.complete && r.outcome.startsWith("degraded")).length;
  const scoreSpread = scored.length ? Math.max(...scored) - Math.min(...scored) : 0;
  const summaryHashes = new Set(rows.filter((r) => r.complete).map((r) => r.summaryHash));
  let verdict: string;
  if (scored.length === 3 && scoreSpread <= 6 && summaryHashes.size === 1) verdict = `PASS — stable: scores ${scored.join("/")} (spread ${scoreSpread}), identical summary`;
  else if (scored.length === 3 && scoreSpread <= 6) verdict = `PASS — stable scores ${scored.join("/")} (spread ${scoreSpread})`;
  else if (gated === 3) verdict = `PASS — honestly gated all 3 (degraded_scrape), never a wrong score`;
  else if (scored.length + gated === 3 && scoreSpread <= 6) verdict = `PASS — every run either stable-scored or honestly gated (no wrong score)`;
  else verdict = `REVIEW — scores=${scored.join("/")} (spread ${scoreSpread}) gated=${gated} hashes=${summaryHashes.size}`;
  console.log(`VERDICT ${LABEL}: ${verdict}`);
  console.log(`model calls: ${rows.filter((r) => r.modelCalled).length}/3 (gated runs made 0 — no token burn)`);
  console.log("\n(done)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
