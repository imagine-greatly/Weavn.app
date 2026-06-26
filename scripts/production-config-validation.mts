/**
 * scripts/production-config-validation.mts — REAL Sonnet (claude-sonnet-4-6) measurement run.
 * Answers, on the production model, three questions the offline proofs could not:
 *   (A) Is TERSE pass-1 safe? — does terse-vs-verbose status disagreement exceed the
 *       verbose-vs-verbose NOISE floor (systematic judgment shift) or sit within it (format-only)?
 *       + real terse token savings + FAIL-clause length compliance.
 *   (B) Can N drop? — reconciled score SPREAD at N=1 / N=2 / N=3 (subsets of the 3 passes), and
 *       whether the ±3 coverage band honestly covers N=1/N=2, incl. 50/70 band-crossing.
 *   (C) Do the FINDINGS survive terse? — one terse→pass-2 on stripe: are findings page-specific +
 *       evidence-cited (vs the saved verbose calibration baseline), and is fabrication still clean?
 *
 * OFFLINE replay of SAVED summaries (fixtures/stripe.json, fixtures/plausible.json). NO scrape, NO web.
 * Does NOT touch production env / Vercel / Supabase, does NOT flip any flag, does NOT merge/push.
 *
 *   ~13 Sonnet calls. HARD CAP $1.00 — a reserve-guard STOPS before any call that could breach it.
 *   Priority order so a tightened budget still answers A/B (plausible) and C (stripe):
 *     plausible verbose×3 → plausible terse×3 → stripe terse×3 → stripe terse→pass-2 → stripe verbose×3
 *   Saves fixtures/<slug>.json `productionConfigValidation` (gitignored) for $0 re-analysis.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/production-config-validation.mts
 */
import { readFileSync, writeFileSync } from "fs";
import {
  scopeChecksForScan, buildPass1SystemBlocks, buildPass1TerseSystemBlocks, buildPass2SystemBlocks,
  parseStatusRows, parseStatusRowsTerse, parsePass2Narrative, topFailIdsByPriority, rubricCounts,
  computeApiDimensions, API_DIMENSION_KEYS, reconcileStatuses,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { RubricResultRow } from "../lib/processFindings";
import type { SiteType } from "../lib/reportSchema";

try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

const MODEL = "claude-sonnet-4-6";          // the production scan model
const PASS1_MAX_TOKENS = 8000;              // production pass-1 ceiling (summary ≤6KB → no truncation)
// Pass-2 ceiling lowered 16000→8000 ONLY for cap safety: topFailIdsByPriority trims to FINDING_LIMIT
// so real pass-2 output is ~3.5K tokens — 8000 is non-binding (won't truncate) but halves the worst-case
// reserve so the north-star (C) call survives a tightened budget. Noted in the report.
const PASS2_MAX_TOKENS = 8000;
const FINDING_LIMIT = 12;
const HARD_CAP_USD = 1.00;
const PASS1_RESERVE = 0.21;                 // worst-case pass-1: cache-create 18K + input + 8K out
const PASS2_RESERVE = 0.20;                 // worst-case pass-2 @ 8K out
const INACTIVITY_MS = 120_000;
const CLAUSE_LIMIT = 25;                    // terse FAIL-clause target length (chars)

const RATE = { in: 3, out: 15, cacheWrite: 3.75, cacheRead: 0.30 }; // Sonnet $/MTok (lib/scanCost.ts)
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
const costOf = (u: Usage) => ((u.input_tokens ?? 0) * RATE.in + (u.output_tokens ?? 0) * RATE.out + (u.cache_creation_input_tokens ?? 0) * RATE.cacheWrite + (u.cache_read_input_tokens ?? 0) * RATE.cacheRead) / 1e6;
const usd = (n: number) => `$${n.toFixed(4)}`;
const band = (s: number) => (s < 50 ? "RED" : s < 70 ? "AMBER" : "GREEN");

function summaryWrap(summary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;
}
function weighted(rows: { id: string; status: string }[], siteType: string): number {
  const dims = computeApiDimensions(rows as RubricResultRow[]); const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

// fabrication heuristic — numbers/offers in pass-2 text NOT present in the summary (from sonnet-calibration.mts)
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

let running = 0, callCount = 0, stoppedByCap = false;
const canAfford = (reserve: number) => running + reserve <= HARD_CAP_USD;

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

interface Pass { rows: RubricResultRow[]; score: number; outTok: number; failClauseLens: number[] }
interface ModeRuns { passes: Pass[] }

// Run up to `n` pass-1 calls of a given mode; stops early if the cap reserve can't cover the next call.
async function runPasses(client: import("@anthropic-ai/sdk").default, slug: string, summary: string, scoped: ReturnType<typeof scopeChecksForScan>, siteType: string, mode: "verbose" | "terse", n: number): Promise<ModeRuns> {
  const build = mode === "terse" ? buildPass1TerseSystemBlocks : buildPass1SystemBlocks;
  const parse = mode === "terse" ? parseStatusRowsTerse : parseStatusRows;
  const passes: Pass[] = [];
  for (let p = 0; p < n; p++) {
    if (!canAfford(PASS1_RESERVE)) { stoppedByCap = true; console.log(`  ⛔ CAP reserve — skip ${slug} ${mode} pass ${p + 1}/${n} (running=${usd(running)})`); break; }
    try {
      const { text, usage } = await sonnetCall(client, build(scoped), summaryWrap(summary), PASS1_MAX_TOKENS, `${slug} ${mode} ${p + 1}/${n}`);
      const parsed = parse(text, scoped);
      const rows = parsed.rows;
      const failClauseLens = mode === "terse" ? rows.filter((r) => String(r.status).toUpperCase() === "FAIL" && r.evidence).map((r) => (r.evidence as string).length) : [];
      passes.push({ rows, score: weighted(rows.map((r) => ({ id: r.id, status: r.status })), siteType), outTok: usage.output_tokens ?? 0, failClauseLens });
      if (parsed.backfilledIds.length > 0) console.log(`      (note: ${parsed.backfilledIds.length} backfilled→SKIP this pass — no retry in measurement)`);
    } catch (e) { console.error(`      ${slug} ${mode} pass ${p + 1} failed (non-fatal): ${e instanceof Error ? e.message : e}`); }
  }
  return { passes };
}

// ── N-subset reconciliation: scores at N=1 (singles), N=2 (pairs), N=3 (all) + spreads ──
function reconScore(runs: { id: string; status: string }[][], siteType: string): number {
  return weighted(reconcileStatuses(runs).rows.map((r) => ({ id: r.id, status: r.status })), siteType);
}
function nDropAnalysis(passes: Pass[], siteType: string) {
  const runs = passes.map((p) => p.rows.map((r) => ({ id: r.id, status: r.status })));
  const k = runs.length;
  const n1 = passes.map((p) => p.score); // N=1 = each single pass (reconcile of one = passthrough)
  const pairs: [number, number][] = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) pairs.push([i, j]);
  const n2 = pairs.map(([i, j]) => reconScore([runs[i], runs[j]], siteType));
  const n3 = k >= 1 ? reconScore(runs, siteType) : NaN;
  const spread = (a: number[]) => (a.length ? Math.max(...a) - Math.min(...a) : 0);
  return { n1, n2, n3, spreadN1: spread(n1), spreadN2: spread(n2), bands: { n1: n1.map(band), n2: n2.map(band), n3: band(n3) } };
}

// status disagreement between two passes = # scoped ids whose status differs
function disagree(a: RubricResultRow[], b: RubricResultRow[]): number {
  const mb = new Map(b.map((r) => [r.id, String(r.status).toUpperCase()]));
  let d = 0;
  for (const r of a) if (mb.get(r.id) !== String(r.status).toUpperCase()) d++;
  return d;
}
function avg(a: number[]): number { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }

async function main() {
  console.log(`\n=== PRODUCTION-CONFIG VALIDATION (model=${MODEL}) — HARD CAP ${usd(HARD_CAP_USD)} ===`);
  console.log(`(offline replay of saved summaries; no prod env change, no flag flip, no merge)\n`);
  if (!process.env.ANTHROPIC_API_KEY) { console.error("FATAL: ANTHROPIC_API_KEY missing"); process.exit(1); }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 280_000 });

  const fx = (slug: string) => JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
  const load = (slug: string) => { const j = fx(slug); const siteType = j.siteType as string; const scoped = scopeChecksForScan(siteType as SiteType); return { j, siteType, scoped, summary: j.summary as string, byId: new Map(scoped.map((c: any) => [c.id, c])) }; };

  const P = load("plausible");
  const S = load("stripe");
  const data: Record<string, { verbose?: ModeRuns; terse?: ModeRuns }> = { plausible: {}, stripe: {} };

  // ── 1. plausible verbose ×3 (A noise baseline + B verbose) ──
  console.log(`${"=".repeat(82)}\nplausible (saas, scoped=${P.scoped.length}) — VERBOSE ×3`);
  data.plausible.verbose = await runPasses(client, "plausible", P.summary, P.scoped, P.siteType, "verbose", 3);
  // ── 2. plausible terse ×3 (A terse + B terse) ──
  console.log(`${"=".repeat(82)}\nplausible — TERSE ×3`);
  data.plausible.terse = await runPasses(client, "plausible", P.summary, P.scoped, P.siteType, "terse", 3);
  // ── 3. stripe terse ×3 (needed for C reconciled FAILs; also B terse) ──
  console.log(`${"=".repeat(82)}\nstripe (service, scoped=${S.scoped.length}) — TERSE ×3`);
  data.stripe.terse = await runPasses(client, "stripe", S.summary, S.scoped, S.siteType, "terse", 3);

  // ── 4. stripe terse → pass-2 (C: findings + fabrication) ──
  let stripePass2: { findings: Array<{ id: string } & Partial<RubricResultRow>>; copyRewrites: Record<string, string>; narrateIds: string[]; rawText: string } | null = null;
  const terseS = data.stripe.terse?.passes ?? [];
  if (terseS.length >= 1 && canAfford(PASS2_RESERVE)) {
    const runs = terseS.map((p) => p.rows.map((r) => ({ id: r.id, status: r.status })));
    const reconRows = reconcileStatuses(runs).rows;
    // FAIL hooks: first non-empty terse evidence per id across passes (mirrors route's pass1.rows hooks).
    const hooks = new Map<string, string>();
    for (const p of terseS) for (const r of p.rows) if (String(r.status).toUpperCase() === "FAIL" && r.evidence && !hooks.has(r.id)) hooks.set(r.id, r.evidence as string);
    const narrateIds = topFailIdsByPriority(reconRows as RubricResultRow[], S.scoped, FINDING_LIMIT, S.siteType);
    const failLines = narrateIds.map((id) => { const h = hooks.get(id); return `${id} | ${S.byId.get(id)?.title ?? ""}${h ? ` | observed: ${h}` : ""}`; }).join("\n");
    const pass2User = `${summaryWrap(S.summary)}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${failLines}`;
    console.log(`${"=".repeat(82)}\nstripe — TERSE → PASS-2 (${narrateIds.length} FAILs, hooks=${[...hooks.keys()].filter((k) => narrateIds.includes(k)).length})`);
    try {
      const { text } = await sonnetCall(client, buildPass2SystemBlocks(S.scoped), pass2User, PASS2_MAX_TOKENS, `stripe terse pass2`);
      const p2 = parsePass2Narrative(text);
      stripePass2 = { findings: [...p2.narratives.entries()].map(([id, n]) => ({ id, ...n })), copyRewrites: (p2.copyRewrites ?? {}) as Record<string, string>, narrateIds, rawText: text };
    } catch (e) { console.error(`      pass2 error (non-fatal): ${e instanceof Error ? e.message : e}`); }
  } else if (terseS.length >= 1) { console.log(`  ⛔ CAP reserve — skip stripe pass-2 (running=${usd(running)})`); stoppedByCap = true; }

  // ── 5. stripe verbose ×3 (second noise baseline — LOWEST priority) ──
  console.log(`${"=".repeat(82)}\nstripe — VERBOSE ×3 (lowest priority)`);
  data.stripe.verbose = await runPasses(client, "stripe", S.summary, S.scoped, S.siteType, "verbose", 3);

  // ── SAVE (gitignored) ──
  for (const slug of ["plausible", "stripe"]) {
    const full = fx(slug);
    full.productionConfigValidation = {
      model: MODEL, at: new Date().toISOString(), pass1MaxTokens: PASS1_MAX_TOKENS, pass2MaxTokens: PASS2_MAX_TOKENS,
      verbose: (data[slug].verbose?.passes ?? []).map((p) => ({ score: p.score, outTok: p.outTok, rows: p.rows.map((r) => ({ id: r.id, status: r.status })) })),
      terse: (data[slug].terse?.passes ?? []).map((p) => ({ score: p.score, outTok: p.outTok, failClauseLens: p.failClauseLens, rows: p.rows.map((r) => ({ id: r.id, status: r.status, ...(r.evidence ? { evidence: r.evidence } : {}) })) })),
      ...(slug === "stripe" && stripePass2 ? { pass2: stripePass2 } : {}),
    };
    writeFileSync(`fixtures/${slug}.json`, JSON.stringify(full, null, 2));
  }
  console.log(`\n  saved → fixtures/{plausible,stripe}.json (productionConfigValidation)`);

  // ════════════════════ ANALYSIS ════════════════════
  console.log(`\n${"#".repeat(82)}\n# REPORT — TOTAL ${usd(running)} over ${callCount} Sonnet calls${stoppedByCap ? " (STOPPED EARLY BY CAP)" : ""}\n${"#".repeat(82)}`);

  // (A) TERSE SAFETY
  console.log(`\n${"=".repeat(82)}\n(A) TERSE SAFETY — disagreement vs verbose-vs-verbose noise + score delta + tokens\n${"=".repeat(82)}`);
  for (const slug of ["plausible", "stripe"]) {
    const v = data[slug].verbose?.passes ?? [], t = data[slug].terse?.passes ?? [];
    const st = (slug === "plausible" ? P : S).siteType, scopedN = (slug === "plausible" ? P : S).scoped.length;
    if (v.length < 2 || t.length < 1) { console.log(`\n[${slug}] insufficient passes (verbose=${v.length}, terse=${t.length}) — skipped`); continue; }
    // noise: verbose-vs-verbose pairwise
    const noisePairs: number[] = []; for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) noisePairs.push(disagree(v[i].rows, v[j].rows));
    // cross: each terse vs each verbose
    const crossPairs: number[] = []; for (const tp of t) for (const vp of v) crossPairs.push(disagree(tp.rows, vp.rows));
    // terse-vs-terse (terse's own noise)
    const terseNoise: number[] = []; for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) terseNoise.push(disagree(t[i].rows, t[j].rows));
    const vScore = reconScore(v.map((p) => p.rows.map((r) => ({ id: r.id, status: r.status }))), st);
    const tScore = reconScore(t.map((p) => p.rows.map((r) => ({ id: r.id, status: r.status }))), st);
    // net status-category shift terse vs verbose (reconciled): how terse moves the P/F/S mix
    const vRecon = reconcileStatuses(v.map((p) => p.rows.map((r) => ({ id: r.id, status: r.status })))).rows;
    const tRecon = reconcileStatuses(t.map((p) => p.rows.map((r) => ({ id: r.id, status: r.status })))).rows;
    const cnt = (rows: { status: string }[]) => rows.reduce((a, r) => { const s = String(r.status).toUpperCase(); a[s as "PASS" | "FAIL" | "SKIP"]++; return a; }, { PASS: 0, FAIL: 0, SKIP: 0 });
    const cv = cnt(vRecon), ct = cnt(tRecon);
    const noiseAvg = avg(noisePairs), crossAvg = avg(crossPairs);
    console.log(`\n[${slug}] (${st}, ${scopedN} checks)`);
    console.log(`  verbose-vs-verbose NOISE: ${noisePairs.join(", ")} disagreements (avg ${noiseAvg.toFixed(1)} = ${(100 * noiseAvg / scopedN).toFixed(1)}% of checks)`);
    console.log(`  terse-vs-verbose CROSS:   ${crossPairs.join(", ")} (avg ${crossAvg.toFixed(1)} = ${(100 * crossAvg / scopedN).toFixed(1)}%)  | terse-vs-terse: ${terseNoise.join(", ") || "n/a"}`);
    console.log(`  → cross/noise ratio ${noiseAvg > 0 ? (crossAvg / noiseAvg).toFixed(2) : "∞"}× — ${crossAvg <= noiseAvg * 1.5 ? "WITHIN noise (format-only) ✅" : "ABOVE noise (judgment shift) ⚠️"}`);
    console.log(`  reconciled status mix: verbose P=${cv.PASS} F=${cv.FAIL} S=${cv.SKIP} | terse P=${ct.PASS} F=${ct.FAIL} S=${ct.SKIP}  (Δ P=${ct.PASS - cv.PASS} F=${ct.FAIL - cv.FAIL} S=${ct.SKIP - cv.SKIP})`);
    console.log(`  reconciled SCORE: verbose=${vScore} [${band(vScore)}] terse=${tScore} [${band(tScore)}]  Δ=${tScore - vScore}`);
    // tokens + clause compliance
    const vOut = avg(v.map((p) => p.outTok)), tOut = avg(t.map((p) => p.outTok));
    const lens = t.flatMap((p) => p.failClauseLens);
    const compliance = lens.length ? 100 * lens.filter((l) => l <= CLAUSE_LIMIT).length / lens.length : 100;
    console.log(`  pass-1 OUTPUT tokens (real Sonnet): verbose avg ${vOut.toFixed(0)} → terse avg ${tOut.toFixed(0)}  = ${vOut > 0 ? (100 * (1 - tOut / vOut)).toFixed(1) : "?"}% reduction (${usd((vOut - tOut) * RATE.out / 1e6)}/pass saved)`);
    console.log(`  terse FAIL-clause length: n=${lens.length} mean=${lens.length ? avg(lens).toFixed(0) : "—"} max=${lens.length ? Math.max(...lens) : "—"} | ≤${CLAUSE_LIMIT} chars: ${compliance.toFixed(0)}% compliant`);
  }

  // (B) N-DROP
  console.log(`\n${"=".repeat(82)}\n(B) N-DROP REPRODUCIBILITY — reconciled score spread at N=1 / N=2 / N=3\n${"=".repeat(82)}`);
  console.log(`(±3 band → N is "honest" if N-spread ≤ 6 AND no band-cross vs N=3)`);
  for (const slug of ["plausible", "stripe"]) for (const mode of ["verbose", "terse"] as const) {
    const passes = data[slug][mode]?.passes ?? [];
    if (passes.length < 2) { console.log(`\n[${slug} ${mode}] ${passes.length} pass(es) — N-drop needs ≥2, skipped`); continue; }
    const a = nDropAnalysis(passes, (slug === "plausible" ? P : S).siteType);
    const crossN1 = a.bands.n1.some((b) => b !== a.bands.n3), crossN2 = a.bands.n2.some((b) => b !== a.bands.n3);
    console.log(`\n[${slug} ${mode}] (${passes.length} passes)`);
    console.log(`  N=1 singles: [${a.n1.join(", ")}]  spread=${a.spreadN1}  bands=[${a.bands.n1.join(",")}]  ${crossN1 ? "⚠️ band-cross vs N=3" : "no cross"}`);
    console.log(`  N=2 pairs:   [${a.n2.join(", ")}]  spread=${a.spreadN2}  bands=[${a.bands.n2.join(",")}]  ${crossN2 ? "⚠️ band-cross vs N=3" : "no cross"}`);
    console.log(`  N=3 all:      ${a.n3}  [${a.bands.n3}]`);
    console.log(`  → N=2 honest: ${a.spreadN2 <= 6 && !crossN2 ? "YES ✅" : "NO ⚠️"} | N=1 honest: ${a.spreadN1 <= 6 && !crossN1 ? "YES ✅" : "NO ⚠️"}`);
  }

  // (C) FINDINGS + FABRICATION
  console.log(`\n${"=".repeat(82)}\n(C) FINDINGS + FABRICATION — stripe terse→pass-2 vs saved verbose baseline\n${"=".repeat(82)}`);
  if (!stripePass2) { console.log(`  (no pass-2 run — budget cut or no terse passes)`); }
  else {
    const summaryLower = (S.summary || "").toLowerCase();
    const baseline = (fx("stripe").sonnetCalibration?.findings ?? []) as Array<{ id: string; title?: string; evidence?: string; implementation?: string }>;
    console.log(`  baseline (verbose sonnetCalibration) findings: ${baseline.length} | terse pass-2 findings: ${stripePass2.findings.length}`);
    console.log(`\n  copy_rewrites: ${JSON.stringify(stripePass2.copyRewrites)}`);
    const crFlags = flagFabrications(Object.values(stripePass2.copyRewrites || {}).join("  "), summaryLower);
    console.log(`    copy_rewrites fabrication flags: ${crFlags.length ? crFlags.join(" | ") : "none ✅"}`);
    let anyFlag = crFlags.length > 0;
    console.log(`\n  TOP TERSE FINDINGS (verbatim):`);
    for (const f of stripePass2.findings.slice(0, 5)) {
      const impl = (f.implementation ?? "") + ""; const flags = flagFabrications((f.title ?? "") + " " + (f.evidence ?? "") + " " + impl, summaryLower);
      if (flags.length) anyFlag = true;
      const baseHit = baseline.find((b) => b.id === f.id);
      console.log(`   --- ${f.id} (effort=${(f as any).effort ?? "?"}) ${baseHit ? "[also in verbose baseline]" : "[terse-only]"}`);
      console.log(`       title:          ${f.title ?? ""}`);
      console.log(`       evidence:       ${f.evidence ?? ""}`);
      console.log(`       implementation: ${impl}`);
      console.log(`       fabrication:    ${flags.length ? "⚠️ " + flags.join(" | ") : "none ✅"}`);
    }
    console.log(`\n  → fabrication overall: ${anyFlag ? "⚠️ FLAGS PRESENT (inspect above)" : "CLEAN ✅"}`);
  }

  // COST SUMMARY
  console.log(`\n${"=".repeat(82)}\nCOST: ${usd(running)} / ${usd(HARD_CAP_USD)} cap over ${callCount} calls${stoppedByCap ? " — STOPPED EARLY" : " — completed"}`);
  console.log(`(done — productionConfigValidation saved; no prod env change, no flag flip, no merge, no push)`);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
