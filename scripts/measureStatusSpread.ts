/**
 * scripts/measureStatusSpread.ts — measure REAL status-pass disagreement.
 * Scans ONE saved fixture (stripe) 5× with claude-haiku-4-5 (NEVER Sonnet) against its SAVED
 * summary — no scrape, no web. 5 Haiku calls total, nothing else. Hard-stops if the running
 * cost would exceed $0.25 (it should be a few cents).
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/measureStatusSpread.ts
 *
 * Reads ANTHROPIC_API_KEY from .env.local. Saves the 5 status sets into the fixture so
 * reconciliation / N selection can be tested OFFLINE afterward for $0.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

import { readFileSync, writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import {
  scopeChecksForScan, buildPass1SystemBlocks, parseStatusRows,
  computeApiDimensions, rubricCounts, reconcileStatuses, API_DIMENSION_KEYS,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { SiteType } from "../lib/reportSchema";

const SITE = "stripe";
const RUNS = 5;
const MODEL = "claude-haiku-4-5";           // NEVER Sonnet
const PASS1_MAX_TOKENS = 8000;
const STOP_USD = 0.25;                        // hard budget cutoff
const MODEL_INACTIVITY_TIMEOUT_MS = 180_000;

// Confirmed Claude Haiku 4.5 rates ($/MTok) — input 1, output 5, cache-write(5m) 1.25, cache-read 0.10.
const RATE = { in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.10 };
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
const costOf = (u: Usage) => ((u.input_tokens ?? 0) * RATE.in + (u.output_tokens ?? 0) * RATE.out + (u.cache_creation_input_tokens ?? 0) * RATE.cacheWrite + (u.cache_read_input_tokens ?? 0) * RATE.cacheRead) / 1e6;

if (!process.env.ANTHROPIC_API_KEY) { console.error("FATAL: ANTHROPIC_API_KEY missing in .env.local"); process.exit(1); }
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 240_000 });

function buildSummaryContent(summary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;
}

async function call(system: ReturnType<typeof buildPass1SystemBlocks>, user: string): Promise<{ text: string; usage: Usage }> {
  const stream = client.messages.stream({ model: MODEL, max_tokens: PASS1_MAX_TOKENS, temperature: 0, system, messages: [{ role: "user", content: user }] });
  let to = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { to = true; try { stream.abort(); } catch { /* */ } }, MODEL_INACTIVITY_TIMEOUT_MS); };
  stream.on("text", () => arm()); arm();
  let m: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { m = await stream.finalMessage(); } catch (e) { if (to) throw new Error("inactivity timeout"); throw e; } finally { clearTimeout(timer!); }
  const b = m.content.find((c) => c.type === "text");
  return { text: b && b.type === "text" ? b.text : "", usage: m.usage as Usage };
}

function score(rows: { id: string; status: string }[], siteType: string): number {
  const dims = computeApiDimensions(rows); const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

async function main() {
  const fixturePath = `fixtures/${SITE}.json`;
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as { siteType?: string; summary: string };
  const siteType = fixture.siteType || "service";
  const scoped = scopeChecksForScan(siteType as SiteType);
  const summaryContent = buildSummaryContent(fixture.summary);

  console.log(`\n=== status-pass spread — ${SITE} × ${RUNS} on ${MODEL} (offline summary input) ===`);
  console.log(`siteType=${siteType} scoped=${scoped.length} | hard stop at $${STOP_USD}\n`);

  const statusSets: { id: string; status: string }[][] = [];
  const scores: number[] = [];
  const skips: number[] = [];
  let totalUsd = 0;
  let completed = 0;

  for (let run = 1; run <= RUNS; run++) {
    let c: { text: string; usage: Usage };
    try { c = await call(buildPass1SystemBlocks(scoped), summaryContent); }
    catch (e) { console.log(`run ${run}: call failed (${e instanceof Error ? e.message : e}) — stopping`); break; }
    const usd = costOf(c.usage);
    totalUsd += usd;
    const p1 = parseStatusRows(c.text, scoped);
    const rows = p1.rows.map((r) => ({ id: r.id, status: String(r.status).toUpperCase() }));
    statusSets.push(rows);
    const counts = rubricCounts(p1.rows, scoped);
    const sc = score(rows, siteType);
    scores.push(sc); skips.push(counts.skips); completed++;
    console.log(`run ${run}: score=${sc} answered=${counts.passes + counts.fails}/${scoped.length} skip=${counts.skips} | in=${c.usage.input_tokens} out=${c.usage.output_tokens} cacheRead=${c.usage.cache_read_input_tokens} cacheCreate=${c.usage.cache_creation_input_tokens} | call=$${usd.toFixed(4)} RUNNING=$${totalUsd.toFixed(4)}`);
    if (totalUsd > STOP_USD) { console.log(`\n⚠ STOP: running total $${totalUsd.toFixed(4)} exceeded $${STOP_USD} — halting after ${completed} run(s).`); break; }
  }

  if (completed < 2) { console.log(`\nOnly ${completed} run(s) completed — not enough to measure spread.`); console.log(`TOTAL COST: $${totalUsd.toFixed(4)}`); return; }

  // ── per-check agreement across the completed runs ──
  const byId = new Map<string, string[]>();
  for (const c of scoped) byId.set(c.id, []);
  for (const set of statusSets) for (const r of set) byId.get(r.id)?.push(r.status);
  const disagreed: { id: string; split: string }[] = [];
  let unanimous = 0;
  for (const c of scoped) {
    const votes = byId.get(c.id)!;
    const distinct = new Set(votes);
    if (distinct.size <= 1) { unanimous++; continue; }
    const tally = { PASS: 0, FAIL: 0, SKIP: 0 } as Record<string, number>;
    for (const v of votes) tally[v] = (tally[v] ?? 0) + 1;
    const split = (["PASS", "FAIL", "SKIP"] as const).filter((k) => tally[k]).map((k) => `${tally[k]} ${k}`).join(" / ");
    disagreed.push({ id: c.id, split });
  }

  const min = Math.min(...scores), max = Math.max(...scores);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdev = Math.sqrt(scores.reduce((a, b) => a + (b - mean) * (b - mean), 0) / scores.length);
  const reconciled = reconcileStatuses(statusSets);
  const reconciledScore = score(reconciled.rows, siteType);

  console.log(`\n================ RESULT (${completed} runs on ${MODEL}) ================`);
  console.log(`scores: ${scores.join(", ")}  → spread ${max - min} (min ${min}, max ${max}, mean ${mean.toFixed(1)}, stdev ${stdev.toFixed(2)})`);
  console.log(`skips:  ${skips.join(", ")}`);
  console.log(`per-check agreement: ${unanimous}/${scoped.length} unanimous | ${disagreed.length} disagreed`);
  if (disagreed.length) {
    console.log(`\nUNSTABLE CHECKS (${disagreed.length}):`);
    for (const d of disagreed) console.log(`  ${d.id.padEnd(14)} ${d.split}`);
  }
  console.log(`\nreconciled (majority vote of ${completed}) → score ${reconciledScore} | flaky ${reconciled.flakyCount}/${scoped.length}`);
  console.log(`\nTOTAL COST: $${totalUsd.toFixed(4)} (${completed} Haiku calls)`);

  // ── save status sets into the fixture (gitignored) for offline reconciliation ──
  try {
    const full = JSON.parse(readFileSync(fixturePath, "utf8"));
    full.statusSets = statusSets;
    full.statusSetsModel = MODEL;
    full.statusSetsAt = new Date().toISOString();
    writeFileSync(fixturePath, JSON.stringify(full, null, 2));
    console.log(`saved ${statusSets.length} status sets → ${fixturePath} (offline reconciliation, $0)`);
  } catch (e) { console.log(`(could not save status sets: ${e instanceof Error ? e.message : e})`); }
  console.log("\n(done)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
