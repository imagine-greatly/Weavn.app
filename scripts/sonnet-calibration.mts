/**
 * scripts/sonnet-calibration.mts — PRODUCTION-CONFIG calibration: claude-sonnet-4-6 + N=3 status-pass
 * reconciliation (reconcileStatuses), the real shipping config. OFFLINE replay of SAVED summaries
 * (no scrape, no web). Does NOT flip WEAVN_RUBRIC_SCORING in production, does NOT write Supabase,
 * does NOT merge/push. Mirrors app/api/v1/scan/route.ts pass-1 (retry-once) → N-pass reconcile → pass-2.
 *
 *   3 fixtures × (3 status passes + 1 pass-2) = 12 Sonnet calls.
 *   HARD CAP $3.00 — per-call tokens + running cost at Sonnet rates; STOPS before any breaching call.
 *   Saves fixtures/<slug>.json `sonnetCalibration` (gitignored, non-destructive) for $0 re-inspection.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/sonnet-calibration.mts
 */
import { readFileSync, writeFileSync } from "fs";
import {
  scopeChecksForScan, buildPass1SystemBlocks, buildPass2SystemBlocks,
  parseStatusRows, parsePass2Narrative, topFailIdsByPriority, rubricCounts,
  computeApiDimensions, API_DIMENSION_KEYS, reconcileStatuses,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { RubricResultRow } from "../lib/processFindings";
import type { SiteType } from "../lib/reportSchema";

try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

const MODEL = "claude-sonnet-4-6"; // the real scan model
const STATUS_PASSES = 3;           // WEAVN_STATUS_PASSES=3 — production reconciliation config
const FIXTURES = ["stripe", "plausible", "berkshire"];
const PASS1_MAX_TOKENS = 8000, PASS1_RETRY_MAX_TOKENS = 12000, PASS2_MAX_TOKENS = 16000;
const FINDING_LIMIT = 12;
const FORCE: Record<string, string[]> = { stripe: ["PSY_004", "TRUST_001"], plausible: ["TRUST_011"], berkshire: [] };
const HARD_CAP_USD = 3.00;
const INACTIVITY_MS = 120_000;
const FLIPPERS = ["TRUST_004", "SPQ_001", "SPQ_003", "SPQ_007", "PSY_004", "SPEC_005", "SPEC_008", "SPEC_009", "NARR_009"];

// Sonnet 4.x $/MTok (lib/scanCost.ts): input 3, output 15, cache-write 3.75, cache-read 0.30. Additive (input_tokens excludes cache).
const RATE = { in: 3, out: 15, cacheWrite: 3.75, cacheRead: 0.30 };
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
const costOf = (u: Usage) => ((u.input_tokens ?? 0) * RATE.in + (u.output_tokens ?? 0) * RATE.out + (u.cache_creation_input_tokens ?? 0) * RATE.cacheWrite + (u.cache_read_input_tokens ?? 0) * RATE.cacheRead) / 1e6;
const usd = (n: number) => `$${n.toFixed(4)}`;
const band = (s: number) => s < 50 ? "RED" : s < 70 ? "AMBER" : "GREEN";

function summaryWrap(summary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;
}
function weighted(rows: { id: string; status: string }[], siteType: string): number {
  const dims = computeApiDimensions(rows as RubricResultRow[]); const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

// fabrication heuristic (numbers/offers NOT in summary)
const NUM_RE = /\$\s?\d[\d.,]*\s?(?:k|m|b|t|thousand|million|billion|trillion)?\+?|\b\d[\d,]*(?:\.\d+)?\s?%|\b\d+(?:\.\d+)?\s?x\b|\b\d[\d,]*\+|\b\d[\d,]*[-\s]?(?:day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes|businesses|customers|users|companies|teams|people|reviews|countries|stores|brands|members|subscribers)\b|\b\d(?:\.\d+)?\/\d\b/gi;
const OFFER_RE = /\b(?:\d+[-\s]?days?\s?(?:free\s)?trial|free\strial|money[-\s]?back|guarantee[d]?|no\scredit\scard|cancel\sanytime|risk[-\s]free|\d+%\s?off|discount|refund)\b/gi;
function flagFabrications(text: string, summaryLower: string): string[] {
  const flags: string[] = [];
  for (const re of [NUM_RE, OFFER_RE]) for (const m of text.matchAll(re)) {
    const tok = m[0].trim(), norm = tok.toLowerCase();
    const digits = (tok.match(/\d[\d,.]*/)?.[0] ?? "").replace(/,/g, "");
    const inSummary = summaryLower.includes(norm) || (digits.length >= 2 && summaryLower.replace(/,/g, "").includes(digits));
    if (!inSummary) flags.push(tok);
  }
  return [...new Set(flags)];
}

let running = 0, callCount = 0, stopped = false;

async function sonnetCall(client: import("@anthropic-ai/sdk").default, system: ReturnType<typeof buildPass1SystemBlocks>, userContent: string, maxTokens: number, label: string): Promise<{ text: string; usage: Usage }> {
  const stream = client.messages.stream({ model: MODEL, max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: userContent }] });
  let timedOut = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { timedOut = true; try { stream.abort(); } catch { /* */ } }, INACTIVITY_MS); };
  stream.on("text", () => arm()); arm();
  let msg: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { msg = await stream.finalMessage(); } catch (e) { if (timedOut) throw new Error(`inactivity timeout ${INACTIVITY_MS}ms`); throw e; } finally { clearTimeout(timer!); }
  const u = msg.usage as Usage; const c = costOf(u); running += c; callCount++;
  console.log(`    [call ${callCount}] ${label}: in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0} cacheCreate=${u.cache_creation_input_tokens ?? 0} cacheRead=${u.cache_read_input_tokens ?? 0} | cost=${usd(c)} | RUNNING=${usd(running)}`);
  const block = msg.content.find((b) => b.type === "text");
  return { text: block && block.type === "text" ? block.text : "", usage: u };
}

interface SavedRun { reconciledStatusRows: { id: string; status: string }[]; perPassScores: number[]; reconciledScore: number; flakyCount: number; meanAgreement: number; counts: ReturnType<typeof rubricCounts>; flipperSeq: Record<string, string[]>; findings: Array<{ id: string } & Partial<RubricResultRow>>; copyRewrites: Record<string, string>; narrateIds: string[]; costUsd: number; }

async function main() {
  console.log(`\n=== SONNET CALIBRATION (model=${MODEL}, N=${STATUS_PASSES} reconcile) — HARD CAP ${usd(HARD_CAP_USD)} ===`);
  if (!process.env.ANTHROPIC_API_KEY) { console.error("FATAL: ANTHROPIC_API_KEY missing"); process.exit(1); }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 280_000 });

  const out: Record<string, SavedRun> = {};

  for (const slug of FIXTURES) {
    if (running >= HARD_CAP_USD) { stopped = true; console.log(`⛔ COST CAP — stopping before ${slug}`); break; }
    const fixture = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8")) as { siteType: string; summary: string };
    const siteType = fixture.siteType as SiteType;
    const scoped = scopeChecksForScan(siteType);
    const byId = new Map(scoped.map((c) => [c.id, c]));
    const c0 = running;
    console.log(`\n${"=".repeat(82)}\n${slug}  siteType=${siteType}  scoped=${scoped.length}`);

    // ── N status passes (pass 1 retries once if incomplete; extras do not — mirrors route) ──
    const runs: { id: string; status: string }[][] = [];
    const perPassScores: number[] = [];
    let aborted = false;
    for (let p = 0; p < STATUS_PASSES; p++) {
      if (running >= HARD_CAP_USD) { stopped = true; aborted = true; console.log(`  ⛔ COST CAP before ${slug} status pass ${p + 1}`); break; }
      try {
        let parsed = parseStatusRows((await sonnetCall(client, buildPass1SystemBlocks(scoped), summaryWrap(fixture.summary), PASS1_MAX_TOKENS, `${slug} status ${p + 1}/${STATUS_PASSES}`)).text, scoped);
        if (p === 0 && (parsed.truncated || parsed.backfilledIds.length > 0) && running < HARD_CAP_USD) {
          console.log(`      pass1 incomplete → retry @ ${PASS1_RETRY_MAX_TOKENS}`);
          parsed = parseStatusRows((await sonnetCall(client, buildPass1SystemBlocks(scoped), summaryWrap(fixture.summary), PASS1_RETRY_MAX_TOKENS, `${slug} status 1-retry`)).text, scoped);
        }
        const rows = parsed.rows.map((r) => ({ id: r.id, status: String(r.status).toUpperCase() }));
        runs.push(rows);
        perPassScores.push(weighted(rows, siteType));
      } catch (e) { console.error(`      status pass ${p + 1} failed (non-fatal): ${e instanceof Error ? e.message : e}`); }
    }
    if (runs.length === 0) { console.log(`  no status passes for ${slug}`); if (stopped) break; else continue; }

    // ── reconcile ──
    const reconciled = reconcileStatuses(runs);
    const reconRows = reconciled.rows.map((r) => ({ id: r.id, status: r.status }));
    const reconciledScore = weighted(reconRows, siteType);
    const counts = rubricCounts(reconRows as RubricResultRow[], scoped);
    const flipperSeq: Record<string, string[]> = {};
    for (const id of FLIPPERS) flipperSeq[id] = runs.map((run) => run.find((x) => x.id === id)?.status ?? "—");

    console.log(`  per-pass scores=[${perPassScores.join(", ")}] spread=${perPassScores.length ? Math.max(...perPassScores) - Math.min(...perPassScores) : 0} → reconciled=${reconciledScore} [${band(reconciledScore)}] | flaky=${reconciled.flakyCount}/${scoped.length} meanAgree=${(reconciled.meanAgreement * 100).toFixed(1)}% | P=${counts.passes} F=${counts.fails} S=${counts.skips}`);

    // ── pass-2 on reconciled FAILs (+ force-narrate the Haiku-leak checks if FAIL) ──
    let findings: SavedRun["findings"] = []; let copyRewrites: Record<string, string> = {};
    const isFail = (id: string) => reconRows.some((x) => x.id === id && x.status === "FAIL");
    const top = topFailIdsByPriority(reconRows as RubricResultRow[], scoped, FINDING_LIMIT, siteType);
    const narrateIds = [...new Set([...top, ...(FORCE[slug] ?? []).filter(isFail)])];
    if (narrateIds.length > 0 && running < HARD_CAP_USD) {
      try {
        const failLines = narrateIds.map((id) => `${id} | ${byId.get(id)?.title ?? ""}`).join("\n");
        const pass2User = `${summaryWrap(fixture.summary)}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${failLines}`;
        const c2 = await sonnetCall(client, buildPass2SystemBlocks(scoped), pass2User, PASS2_MAX_TOKENS, `${slug} pass2`);
        const p2 = parsePass2Narrative(c2.text);
        copyRewrites = (p2.copyRewrites ?? {}) as Record<string, string>;
        findings = [...p2.narratives.entries()].map(([id, n]) => ({ id, ...n }));
      } catch (e) { console.error(`      pass2 error (non-fatal): ${e instanceof Error ? e.message : e}`); }
    }

    const rec: SavedRun = { reconciledStatusRows: reconRows, perPassScores, reconciledScore, flakyCount: reconciled.flakyCount, meanAgreement: reconciled.meanAgreement, counts, flipperSeq, findings, copyRewrites, narrateIds, costUsd: running - c0 };
    out[slug] = rec;
    const full = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
    full.sonnetCalibration = { model: MODEL, statusPasses: STATUS_PASSES, at: new Date().toISOString(), findingLimit: FINDING_LIMIT, ...rec, summary: fixture.summary };
    writeFileSync(`fixtures/${slug}.json`, JSON.stringify(full, null, 2));
    console.log(`  saved → fixtures/${slug}.json (sonnetCalibration) | fixtureCost=${usd(running - c0)}`);
    if (aborted || stopped) break;
  }

  // ── ANALYSIS ──
  console.log(`\n${"#".repeat(82)}\n# ANALYSIS — TOTAL ${usd(running)} over ${callCount} Sonnet calls${stopped ? " (STOPPED EARLY BY CAP)" : ""}\n${"#".repeat(82)}`);
  console.log(`\n1+2. SCORE CURVE & STABILITY`);
  console.log(`  fixture     siteType   per-pass        spread  reconciled  band   flaky  meanAgree`);
  for (const slug of FIXTURES) { const r = out[slug]; if (!r) continue;
    console.log(`  ${slug.padEnd(11)} ${"".padEnd(0)}${(JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8")).siteType as string).padEnd(9)} [${r.perPassScores.join(",").padEnd(11)}] ${String(Math.max(...r.perPassScores) - Math.min(...r.perPassScores)).padStart(4)}    ${String(r.reconciledScore).padStart(3)}        ${band(r.reconciledScore).padEnd(5)}  ${String(r.flakyCount).padStart(3)}   ${(r.meanAgreement * 100).toFixed(1)}%`);
  }

  for (const slug of FIXTURES) { const r = out[slug]; if (!r) continue;
    const summaryLower = ((JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8")).summary as string) || "").toLowerCase();
    console.log(`\n${"=".repeat(82)}\n[${slug}] 9 FLIPPERS (3 passes → reconciled):`);
    for (const id of FLIPPERS) { const seq = r.flipperSeq[id] ?? []; const rec = r.reconciledStatusRows.find((x) => x.id === id)?.status ?? "—"; const hasSkip = seq.includes("SKIP");
      console.log(`   ${id.padEnd(10)} ${seq.join("/").padEnd(18)} → ${rec.padEnd(5)} ${hasSkip ? "(SKIP appeared in a pass)" : "✅ no SKIP"}`);
    }
    console.log(`\n[${slug}] FABRICATION — copy_rewrites + leak-prone findings (flags = number/offer NOT in summary):`);
    console.log(`   copy_rewrites: ${JSON.stringify(r.copyRewrites)}`);
    const crFlags = flagFabrications(Object.values(r.copyRewrites || {}).join("  "), summaryLower);
    console.log(`     copy_rewrites flagged: ${crFlags.length ? crFlags.join(" | ") : "none ✅"}`);
    for (const fid of [...(FORCE[slug] ?? []), r.findings[0]?.id].filter((v, i, a) => v && a.indexOf(v) === i)) {
      const f = r.findings.find((x) => x.id === fid); if (!f) continue;
      const impl = (f.implementation ?? "") + ""; const flags = flagFabrications(impl, summaryLower);
      console.log(`   --- ${fid} (${f.effort ?? ""})  ${FORCE[slug]?.includes(fid!) ? "[leak-prone]" : "[top finding]"}`);
      console.log(`       title:          ${f.title ?? ""}`);
      console.log(`       evidence:       ${f.evidence ?? ""}`);
      console.log(`       implementation: ${impl}`);
      console.log(`       flagged: ${flags.length ? flags.join(" | ") : "none ✅"}`);
    }
  }
  console.log(`\n(done — sonnetCalibration saved; no production flag flip, no merge, no push)`);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
