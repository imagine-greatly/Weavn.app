/**
 * scripts/haiku-confirm-fixes.mts — CONFIRM the two model-OUTPUT fixes from commit f387794 that
 * could not be proven offline: (A) the stat/offer fabrication clamp, (B) the 9 mechanized SKIP-flippers.
 * Haiku ONLY. OFFLINE replay of SAVED fixture summaries (no scrape, no web). Does NOT flip
 * WEAVN_RUBRIC_SCORING, does NOT write Supabase, does NOT merge/push.
 *
 *   2 fixtures (stripe + plausible) × 3 sequential full passes (pass1 status + pass2 findings) = 12 scans.
 *   HARD CAP $0.50 — prints per-call tokens + cost + RUNNING total; STOPS before any call that would breach.
 *   Saves under fixtures/<slug>.json `haikuConfirm` (gitignored, non-destructive) for $0 re-inspection.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/haiku-confirm-fixes.mts
 */
import { readFileSync, writeFileSync } from "fs";
import {
  scopeChecksForScan, buildPass1SystemBlocks, buildPass2SystemBlocks,
  parseStatusRows, parsePass2Narrative, topFailIdsByPriority, rubricCounts,
} from "../lib/rubricScan";
import type { RubricResultRow } from "../lib/processFindings";
import type { SiteType } from "../lib/reportSchema";

try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

const MODEL = "claude-haiku-4-5-20251001";
const RUNS = 3;
const FIXTURES = ["stripe", "plausible"];
const PASS1_MAX_TOKENS = 8000, PASS1_RETRY_MAX_TOKENS = 12000, PASS2_MAX_TOKENS = 16000;
const FINDING_LIMIT = 12;
const FORCE_NARRATE = ["TRUST_013", "TRUST_001", "TRUST_002"]; // fabricated last run — force into narration if FAIL
const HARD_CAP_USD = 0.50;
const TIMEOUT_MS = 200_000;
const FLIPPERS = ["TRUST_004", "SPQ_001", "SPQ_003", "SPQ_007", "PSY_004", "SPEC_005", "SPEC_008", "SPEC_009", "NARR_009"];

// Haiku 4.5 $/MTok: input 1, output 5, cache-write(5m) 1.25, cache-read 0.10.
const RATE = { in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.10 };
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
const costOf = (u: Usage) => ((u.input_tokens ?? 0) * RATE.in + (u.output_tokens ?? 0) * RATE.out + (u.cache_creation_input_tokens ?? 0) * RATE.cacheWrite + (u.cache_read_input_tokens ?? 0) * RATE.cacheRead) / 1e6;
const usd = (n: number) => `$${n.toFixed(4)}`;

function summaryWrap(summary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;
}

// Heuristic fabrication scan: numbers ($/%/count/Nx/N-day/N+) and offer phrases that are NOT in the summary.
const NUM_RE = /\$\s?\d[\d.,]*\s?(?:k|m|b|t|thousand|million|billion|trillion)?\+?|\b\d[\d,]*(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?x\b|\b\d[\d,]*\+|\b\d[\d,]*[-\s]?(?:day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|businesses|customers|users|companies|teams|people|reviews|countries|stores|brands|members|subscribers)\b/gi;
const OFFER_RE = /\b(?:\d+[-\s]?days?\s?(?:free\s)?trial|free\strial|money[-\s]?back|guarantee[d]?|no\scredit\scard|cancel\sanytime|risk[-\s]free|\d+%\s?off|discount|refund)\b/gi;
function flagFabrications(text: string, summaryLower: string): string[] {
  const flags: string[] = [];
  for (const re of [NUM_RE, OFFER_RE]) {
    for (const m of text.matchAll(re)) {
      const tok = m[0].trim();
      const norm = tok.toLowerCase();
      const digits = (tok.match(/\d[\d,.]*/)?.[0] ?? "").replace(/,/g, "");
      const inSummary = summaryLower.includes(norm) || (digits.length >= 2 && summaryLower.replace(/,/g, "").includes(digits));
      if (!inSummary) flags.push(tok);
    }
  }
  return [...new Set(flags)];
}

let running = 0, callCount = 0, stopped = false;

async function haikuCall(client: import("@anthropic-ai/sdk").default, system: ReturnType<typeof buildPass1SystemBlocks>, userContent: string, maxTokens: number, label: string) {
  const msg = await client.messages.create({ model: MODEL, max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: userContent }] });
  const u = msg.usage as Usage;
  const c = costOf(u); running += c; callCount++;
  console.log(`    [call ${callCount}] ${label}: in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0} cacheCreate=${u.cache_creation_input_tokens ?? 0} cacheRead=${u.cache_read_input_tokens ?? 0} | cost=${usd(c)} | RUNNING=${usd(running)}`);
  const block = msg.content.find((b) => b.type === "text");
  return { text: block && block.type === "text" ? block.text : "", usage: u };
}

interface SavedRun { run: number; statusRows: { id: string; status: string }[]; findings: Array<{ id: string } & Partial<RubricResultRow>>; copyRewrites: Record<string, string>; summary: string; narrateIds: string[]; headline?: number; skipRate: number; counts: ReturnType<typeof rubricCounts>; usage: { pass1: Usage; pass1Retry?: Usage; pass2?: Usage }; costUsd: number; }

async function main() {
  console.log(`\n=== HAIKU CONFIRM (model=${MODEL}) — fabrication clamp + 9 flippers — HARD CAP ${usd(HARD_CAP_USD)} ===`);
  if (!process.env.ANTHROPIC_API_KEY) { console.error("FATAL: ANTHROPIC_API_KEY missing"); process.exit(1); }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS });

  const perFixture: Record<string, SavedRun[]> = {};

  for (const slug of FIXTURES) {
    const fixture = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8")) as { siteType: string; summary: string };
    const siteType = fixture.siteType as SiteType;
    const scoped = scopeChecksForScan(siteType);
    const byId = new Map(scoped.map((c) => [c.id, c]));
    console.log(`\n${"=".repeat(80)}\n${slug}  siteType=${siteType}  scoped=${scoped.length}`);
    const runs: SavedRun[] = [];

    for (let r = 1; r <= RUNS; r++) {
      if (running >= HARD_CAP_USD) { stopped = true; console.log(`  ⛔ COST CAP — stopping before ${slug} run ${r}`); break; }
      console.log(`  --- ${slug} run ${r}/${RUNS} ---`);
      const c0 = running;
      const c1 = await haikuCall(client, buildPass1SystemBlocks(scoped), summaryWrap(fixture.summary), PASS1_MAX_TOKENS, `${slug} r${r} pass1`);
      let p1 = parseStatusRows(c1.text, scoped);
      const usage: SavedRun["usage"] = { pass1: c1.usage };
      if ((p1.truncated || p1.backfilledIds.length > 0) && running < HARD_CAP_USD) {
        console.log(`      pass1 incomplete → retry`);
        const c1b = await haikuCall(client, buildPass1SystemBlocks(scoped), summaryWrap(fixture.summary), PASS1_RETRY_MAX_TOKENS, `${slug} r${r} pass1-retry`);
        p1 = parseStatusRows(c1b.text, scoped); usage.pass1Retry = c1b.usage;
      }
      const statusRows = p1.rows;
      const counts = rubricCounts(statusRows, scoped);
      const skipRate = counts.skips / scoped.length;
      const isFail = (id: string) => statusRows.some((x) => x.id === id && String(x.status).toUpperCase() === "FAIL");
      const top = topFailIdsByPriority(statusRows, scoped, FINDING_LIMIT, siteType);
      const narrateIds = [...new Set([...top, ...FORCE_NARRATE.filter(isFail)])];

      let findings: SavedRun["findings"] = []; let copyRewrites: Record<string, string> = {};
      if (narrateIds.length > 0 && running < HARD_CAP_USD) {
        try {
          const failLines = narrateIds.map((id) => `${id} | ${byId.get(id)?.title ?? ""}`).join("\n");
          const pass2User = `${summaryWrap(fixture.summary)}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${failLines}`;
          const c2 = await haikuCall(client, buildPass2SystemBlocks(scoped), pass2User, PASS2_MAX_TOKENS, `${slug} r${r} pass2`);
          usage.pass2 = c2.usage;
          const p2 = parsePass2Narrative(c2.text);
          copyRewrites = (p2.copyRewrites ?? {}) as Record<string, string>;
          findings = [...p2.narratives.entries()].map(([id, n]) => ({ id, ...n }));
        } catch (e) { console.error(`      pass2 error (non-fatal): ${e instanceof Error ? e.message : e}`); }
      }
      const runCost = running - c0;
      console.log(`      score-skip: P=${counts.passes} F=${counts.fails} S=${counts.skips} skipRate=${(skipRate * 100).toFixed(1)}% narrated=${findings.length}/${narrateIds.length} | runCost=${usd(runCost)}`);
      runs.push({ run: r, statusRows: statusRows.map((x) => ({ id: x.id, status: String(x.status).toUpperCase() })), findings, copyRewrites, summary: fixture.summary, narrateIds, skipRate, counts, usage, costUsd: runCost });
      if (running >= HARD_CAP_USD) { stopped = true; console.log(`  ⛔ COST CAP after ${slug} run ${r}`); break; }
    }

    perFixture[slug] = runs;
    if (runs.length > 0) {
      const full = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
      full.haikuConfirm = { model: MODEL, at: new Date().toISOString(), findingLimit: FINDING_LIMIT, forceNarrate: FORCE_NARRATE, runs };
      writeFileSync(`fixtures/${slug}.json`, JSON.stringify(full, null, 2));
      console.log(`  saved ${runs.length} run(s) → fixtures/${slug}.json (haikuConfirm)`);
    }
    if (stopped) break;
  }

  // ── ANALYSIS ──
  console.log(`\n${"#".repeat(80)}\n# ANALYSIS — TOTAL COST ${usd(running)} over ${callCount} calls${stopped ? " (STOPPED EARLY BY CAP)" : ""}\n${"#".repeat(80)}`);

  for (const slug of FIXTURES) {
    const runs = perFixture[slug]; if (!runs?.length) { console.log(`\n[${slug}] no runs`); continue; }
    const summaryLower = (runs[0].summary || "").toLowerCase();

    console.log(`\n${"=".repeat(80)}\n[${slug}] B — 9 FLIPPERS across ${runs.length} runs (SKIP appearing = still waffling):`);
    for (const id of FLIPPERS) {
      const seq = runs.map((run) => run.statusRows.find((x) => x.id === id)?.status ?? "—");
      const hasSkip = seq.includes("SKIP");
      const distinctVerdict = new Set(seq.filter((s) => s !== "SKIP")).size > 1;
      console.log(`   ${id.padEnd(10)} ${seq.join(" / ").padEnd(22)} ${hasSkip ? "❌ still SKIP-waffling" : distinctVerdict ? "⚠ verdict flips (no SKIP)" : "✅ settled"}`);
    }

    console.log(`\n[${slug}] A — FABRICATION scan on narrated findings (numbers/offers NOT in summary):`);
    const run1 = runs[0];
    console.log(`   copy_rewrites: ${JSON.stringify(run1.copyRewrites)}`);
    const cr = Object.values(run1.copyRewrites || {}).join("  ");
    const crFlags = flagFabrications(cr, summaryLower);
    console.log(`     copy_rewrites flagged: ${crFlags.length ? crFlags.join(" | ") : "none ✅"}`);
    for (const fid of [...FORCE_NARRATE, ...run1.findings.map((f) => f.id)].filter((v, i, a) => a.indexOf(v) === i)) {
      const f = run1.findings.find((x) => x.id === fid); if (!f) continue;
      const impl = (f.implementation ?? "") + "";
      const flags = flagFabrications(impl, summaryLower);
      if (FORCE_NARRATE.includes(fid) || flags.length) {
        console.log(`   --- ${fid} (${f.effort ?? ""})`);
        console.log(`       evidence:       ${f.evidence ?? ""}`);
        console.log(`       implementation: ${impl}`);
        console.log(`       flagged: ${flags.length ? flags.join(" | ") : "none ✅"}`);
      }
    }
  }
  console.log(`\n(done — haikuConfirm saved; no flag flip, no merge, no push)`);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
