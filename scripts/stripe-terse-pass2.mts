/**
 * scripts/stripe-terse-pass2.mts — focused FOLLOW-UP for (C): ONE Sonnet pass-2 call on stripe's
 * SAVED terse reconciled FAILs (fixtures/stripe.json productionConfigValidation.terse), to measure
 * whether terse's compressed FAIL hooks still yield page-specific, evidence-cited, fabrication-free
 * findings — vs the saved verbose sonnetCalibration baseline.
 *
 * WHY SEPARATE: the main production-config-validation run exhausts the $1.00 cap on the 12 pass-1
 * calls (verbose pass-1 output is ~6K tok ≈ $0.11/call — higher than the optimistic estimate), so
 * pass-2 is run here as a single guaranteed-cheap call against the persisted terse rows.
 *
 * GLOBAL CAP: pass --prior=<usd already spent by the main run>. This refuses to run unless
 *   prior + worst-case(this call) ≤ $1.00, and sizes max_tokens to fit. ONE call only.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/stripe-terse-pass2.mts --prior=0.8630
 */
import { readFileSync, writeFileSync } from "fs";
import {
  scopeChecksForScan, buildPass2SystemBlocks, parsePass2Narrative, topFailIdsByPriority,
  reconcileStatuses, rubricCounts, computeApiDimensions, API_DIMENSION_KEYS,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { RubricResultRow } from "../lib/processFindings";
import type { SiteType } from "../lib/reportSchema";

try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

const MODEL = "claude-sonnet-4-6";
const FINDING_LIMIT = 12;
const HARD_CAP_USD = 1.00;
const INACTIVITY_MS = 120_000;
const RATE = { in: 3, out: 15, cacheWrite: 3.75, cacheRead: 0.30 };
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
const costOf = (u: Usage) => ((u.input_tokens ?? 0) * RATE.in + (u.output_tokens ?? 0) * RATE.out + (u.cache_creation_input_tokens ?? 0) * RATE.cacheWrite + (u.cache_read_input_tokens ?? 0) * RATE.cacheRead) / 1e6;
const usd = (n: number) => `$${n.toFixed(4)}`;

const priorArg = process.argv.find((a) => a.startsWith("--prior="));
const PRIOR = priorArg ? Number(priorArg.split("=")[1]) : 0;

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
function summaryWrap(summary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;
}
function weighted(rows: { id: string; status: string }[], siteType: string): number {
  const dims = computeApiDimensions(rows as RubricResultRow[]); const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

async function main() {
  const j = JSON.parse(readFileSync("fixtures/stripe.json", "utf8"));
  const pcv = j.productionConfigValidation;
  if (!pcv?.terse?.length) { console.error("FATAL: no productionConfigValidation.terse rows in fixtures/stripe.json — run production-config-validation.mts first."); process.exit(1); }
  const siteType = j.siteType as string;
  const scoped = scopeChecksForScan(siteType as SiteType);
  const byId = new Map(scoped.map((c) => [c.id, c]));
  const summary = j.summary as string;
  const summaryLower = summary.toLowerCase();

  // Reconcile the saved terse passes (N = however many completed in the main run).
  const runs: { id: string; status: string }[][] = pcv.terse.map((p: { rows: { id: string; status: string }[] }) => p.rows.map((r) => ({ id: r.id, status: r.status })));
  const reconRows = reconcileStatuses(runs).rows;
  const reconScore = weighted(reconRows.map((r) => ({ id: r.id, status: r.status })), siteType);
  const counts = rubricCounts(reconRows as RubricResultRow[], scoped);
  console.log(`stripe terse: N=${runs.length} passes → reconciled score=${reconScore} | P=${counts.passes} F=${counts.fails} S=${counts.skips}`);

  // FAIL hooks: first non-empty terse evidence per id (mirrors the route's pass1.rows hooks).
  const hooks = new Map<string, string>();
  for (const p of pcv.terse) for (const r of (p.rows as Array<{ id: string; status: string; evidence?: string }>)) if (String(r.status).toUpperCase() === "FAIL" && r.evidence && !hooks.has(r.id)) hooks.set(r.id, r.evidence);
  const narrateIds = topFailIdsByPriority(reconRows as RubricResultRow[], scoped, FINDING_LIMIT, siteType);
  const withHook = narrateIds.filter((id) => hooks.has(id)).length;
  console.log(`narrate ${narrateIds.length} FAILs, ${withHook} carry a terse evidence hook`);

  // ── COST GUARD: size max_tokens so prior + worst-case(this call) ≤ $1.00, then ONE call ──
  // worst case = stripe catalog cache CREATE (cold) + input + output@max_tokens.
  const CACHE_TOK = 19_500, INPUT_TOK = 3_000;
  const worstFixed = (CACHE_TOK * RATE.cacheWrite + INPUT_TOK * RATE.in) / 1e6; // ≈ $0.082
  const room = HARD_CAP_USD - PRIOR - worstFixed;                               // $ left for output
  let maxTokens = Math.floor((room / RATE.out) * 1e6);
  maxTokens = Math.min(8000, maxTokens);
  console.log(`prior=${usd(PRIOR)} worstFixed=${usd(worstFixed)} → output room ${usd(room)} → max_tokens=${maxTokens}`);
  if (maxTokens < 1500) { console.error(`REFUSE: only ${maxTokens} output tokens fit under the $1.00 global cap (prior too high). Not running — report C as not measured.`); process.exit(2); }

  const failLines = narrateIds.map((id) => { const h = hooks.get(id); return `${id} | ${byId.get(id)?.title ?? ""}${h ? ` | observed: ${h}` : ""}`; }).join("\n");
  const pass2User = `${summaryWrap(summary)}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${failLines}`;

  if (!process.env.ANTHROPIC_API_KEY) { console.error("FATAL: ANTHROPIC_API_KEY missing"); process.exit(1); }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 280_000 });

  const stream = client.messages.stream({ model: MODEL, max_tokens: maxTokens, temperature: 0, system: buildPass2SystemBlocks(scoped), messages: [{ role: "user", content: pass2User }] });
  let timedOut = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { timedOut = true; try { stream.abort(); } catch { /* */ } }, INACTIVITY_MS); };
  stream.on("text", () => arm()); arm();
  let msg: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { msg = await stream.finalMessage(); } catch (e) { if (timedOut) throw new Error(`inactivity timeout`); throw e; } finally { clearTimeout(timer!); }
  const u = msg.usage as Usage; const c = costOf(u);
  console.log(`[pass2] in=${u.input_tokens} out=${u.output_tokens} cacheCreate=${u.cache_creation_input_tokens ?? 0} cacheRead=${u.cache_read_input_tokens ?? 0} | cost=${usd(c)} | GLOBAL TOTAL=${usd(PRIOR + c)}`);
  const block = msg.content.find((b) => b.type === "text");
  const p2 = parsePass2Narrative(block && block.type === "text" ? block.text : "");
  const findings = [...p2.narratives.entries()].map(([id, n]) => ({ id, ...n }));
  const copyRewrites = (p2.copyRewrites ?? {}) as Record<string, string>;

  // ── save ──
  pcv.pass2 = { at: new Date().toISOString(), maxTokens, reconScore, narrateIds, findings, copyRewrites, costUsd: c, globalTotalUsd: PRIOR + c };
  writeFileSync("fixtures/stripe.json", JSON.stringify(j, null, 2));

  // ── (C) analysis ──
  const baseline = (j.sonnetCalibration?.findings ?? []) as Array<{ id: string; title?: string; evidence?: string; implementation?: string }>;
  console.log(`\n${"=".repeat(82)}\n(C) FINDINGS + FABRICATION — terse→pass2 vs verbose baseline\n${"=".repeat(82)}`);
  console.log(`baseline (verbose) findings=${baseline.length} | terse findings=${findings.length}`);
  console.log(`\ncopy_rewrites: ${JSON.stringify(copyRewrites)}`);
  const crFlags = flagFabrications(Object.values(copyRewrites).join("  "), summaryLower);
  console.log(`  copy_rewrites fabrication: ${crFlags.length ? "⚠️ " + crFlags.join(" | ") : "none ✅"}`);
  let anyFlag = crFlags.length > 0;
  console.log(`\nTOP TERSE FINDINGS (verbatim):`);
  for (const f of findings.slice(0, 6)) {
    const impl = (f.implementation ?? "") + "";
    const flags = flagFabrications(`${f.title ?? ""} ${(f as any).evidence ?? ""} ${impl}`, summaryLower);
    if (flags.length) anyFlag = true;
    const inBase = baseline.some((b) => b.id === f.id);
    console.log(`\n --- ${f.id} (effort=${(f as any).effort ?? "?"}) ${inBase ? "[also in verbose baseline]" : "[terse-only]"}`);
    console.log(`     title:          ${f.title ?? ""}`);
    console.log(`     evidence:       ${(f as any).evidence ?? ""}`);
    console.log(`     implementation: ${impl}`);
    console.log(`     fabrication:    ${flags.length ? "⚠️ " + flags.join(" | ") : "none ✅"}`);
  }
  console.log(`\n→ FABRICATION OVERALL: ${anyFlag ? "⚠️ FLAGS — inspect" : "CLEAN ✅"}`);
  console.log(`\n(done — saved productionConfigValidation.pass2; no prod env change, no merge, no push)`);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
