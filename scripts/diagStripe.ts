/**
 * scripts/diagStripe.ts — PART A diagnosis (READ-ONLY). One stripe.com diagnostic run.
 *
 * Captures, for stripe.com, the scrape + summary fingerprints, the pass-1 status denominator,
 * and the exact SKIP set — so 3 sequential invocations can fork the score instability:
 *   summary hash DIFFERS across runs  → scrape inconsistency
 *   summary hash SAME, skip-set DIFFERS → model nondeterminism (pass-1 temp=0)
 *   skip-set SAME every run            → summary missing signal for those checks
 *
 * Pass `--raw` to also run a raw-HTML pass-1 (only needed on one run) so skips can be
 * classified: summary-skip ∩ raw-ANSWERED = wrongful (signal should be in summary);
 * summary-skip ∩ raw-SKIP = DOM-deep/runtime (unobservable either way).
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/diagStripe.ts --label=run1 --raw
 *
 * Writes diag_run_<label>.json. Read-only on all scoring/scan logic.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

import { createHash } from "crypto";
import { writeFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { scrapeSite } from "../lib/scraper";
import { detectSiteType } from "../lib/siteType";
import { extractPageData } from "../lib/analyzePipeline";
import { buildPageSummary } from "../lib/analyze";
import { type DiagnosticCheck } from "../lib/diagnosticRubric";
import {
  scopeChecksForScan, buildPass1SystemBlocks, parseStatusRows,
  computeApiDimensions, rubricCounts, CATEGORY_TO_DIMENSION, API_DIMENSION_KEYS,
  type ApiDimensionKey,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";

const urlArg = process.argv.find((a) => a.startsWith("--url="));
const URL_ = urlArg ? urlArg.slice("--url=".length) : "https://stripe.com";
const PASS1_MAX_TOKENS = 8000;
const PASS1_RETRY_MAX_TOKENS = 12000;
const MODEL_INACTIVITY_TIMEOUT_MS = 200_000;
const labelArg = process.argv.find((a) => a.startsWith("--label="));
const LABEL = labelArg ? labelArg.slice("--label=".length) : "run";
const WITH_RAW = process.argv.includes("--raw");

if (!process.env.ANTHROPIC_API_KEY || !process.env.BROWSERLESS_API_KEY) { console.error("FATAL: keys missing in .env.local"); process.exit(1); }
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 290_000 });
const sha1 = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);

async function call(maxTokens: number, system: ReturnType<typeof buildPass1SystemBlocks>, userContent: string) {
  const stream = client.messages.stream({ model: "claude-sonnet-4-6", max_tokens: maxTokens, temperature: 0, system, messages: [{ role: "user", content: userContent }] });
  let timedOut = false; let timer: NodeJS.Timeout;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => { timedOut = true; try { stream.abort(); } catch { /* */ } }, MODEL_INACTIVITY_TIMEOUT_MS); };
  stream.on("text", () => arm()); arm();
  let msg: Awaited<ReturnType<typeof stream.finalMessage>>;
  try { msg = await stream.finalMessage(); }
  catch (e) { if (timedOut) throw new Error(`inactivity timeout`); throw e; }
  finally { clearTimeout(timer!); }
  const block = msg.content.find((c) => c.type === "text");
  return { text: block && block.type === "text" ? block.text : "" };
}

function skipIds(rows: { id: string; status: string }[]): string[] {
  return rows.filter((r) => String(r.status).toUpperCase() === "SKIP").map((r) => r.id).sort();
}
function answeredIds(rows: { id: string; status: string }[]): Set<string> {
  return new Set(rows.filter((r) => { const s = String(r.status).toUpperCase(); return s === "PASS" || s === "FAIL"; }).map((r) => r.id));
}
function tfCounts(rows: { id: string; status: string }[], scoped: DiagnosticCheck[]) {
  const idToCat = new Map(scoped.map((c) => [c.id, c.category]));
  let ans = 0, skip = 0;
  for (const r of rows) {
    if ((CATEGORY_TO_DIMENSION[idToCat.get(r.id) ?? ""] as ApiDimensionKey) !== "technical_foundation") continue;
    const s = String(r.status).toUpperCase();
    if (s === "PASS" || s === "FAIL") ans++; else skip++;
  }
  return { ans, skip };
}

async function main() {
  console.log(`[diag ${LABEL}] scraping ${URL_} ...`);
  const extraction = await scrapeSite(URL_);
  const site_type = detectSiteType(extraction);
  const scopedChecks = scopeChecksForScan(site_type);
  const idToCat = new Map(scopedChecks.map((c) => [c.id, c.category]));

  // ── Fingerprints ──
  const rawHtmlBytes = extraction.rawHtml.length;
  const page = extractPageData(extraction.rawHtml, URL_, "homepage");
  const keyFields = {
    heroHeadline: page.hero.headline, heroSub: page.hero.subheadline, heroCta: page.hero.ctaText,
    h1s: page.headlines.filter((h) => h.tag === "h1").map((h) => h.text),
    h2count: page.headlines.filter((h) => h.tag === "h2").length,
    ctas: page.buttons.map((b) => b.text), metaTitle: page.meta.title, metaDesc: page.meta.description,
    pricing: page.pricing.map((p) => `${p.planName}:${p.price}`), testimonialCount: page.testimonials.length,
    social: page.socialProof, nav: page.navigation, htmlSignals: page.htmlSignals,
    wordCount: page.wordCount, ctaCount: page.ctaCount,
  };
  const extractHash = sha1(JSON.stringify(keyFields));
  const summary = buildPageSummary(extraction);
  const summaryLen = summary.length;
  const summaryHash = sha1(summary);
  const summaryContent = `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;

  console.log(`[diag ${LABEL}] siteType=${site_type} scoped=${scopedChecks.length} rawBytes=${rawHtmlBytes} extractHash=${extractHash} summaryLen=${summaryLen} summaryHash=${summaryHash}`);

  // ── SUMMARY pass-1 (status) — retry once if incomplete, exactly like the route ──
  let p1 = parseStatusRows((await call(PASS1_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), summaryContent)).text, scopedChecks);
  let retried = false;
  if (p1.truncated || p1.backfilledIds.length > 0) { retried = true; p1 = parseStatusRows((await call(PASS1_RETRY_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), summaryContent)).text, scopedChecks); }
  const rows = p1.rows;
  const counts = rubricCounts(rows, scopedChecks);
  const skipRate = counts.skips / scopedChecks.length;
  const backfill = p1.backfilledIds.length;
  const lowConfidence = skipRate > 0.80 || (counts.skips > 0 && backfill / counts.skips > 0.10);
  const dims = computeApiDimensions(rows);
  const w = getWeightProfile(site_type);
  const score = lowConfidence ? null : Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
  const tf = tfCounts(rows, scopedChecks);
  const sSkip = skipIds(rows);

  console.log(`[diag ${LABEL}] SUMMARY pass1: score=${score ?? "LOWc"} answered=${counts.passes + counts.fails}/${scopedChecks.length} skip=${counts.skips} (${(skipRate * 100).toFixed(1)}%) tf=${tf.ans}/${tf.skip} truncated=${p1.truncated} backfill=${backfill} retried=${retried} skipHash=${sha1(sSkip.join(","))}`);

  // ── RAW-HTML pass-1 (only when --raw) — for wrongful-vs-DOM-deep classification ──
  let rawSkip: string[] | null = null;
  let rawAnswered: Set<string> | null = null;
  let rawScore: number | null = null;
  let rawTf: { ans: number; skip: number } | null = null;
  if (WITH_RAW) {
    const complexity = extraction.complexity ?? "medium";
    const hardCap = complexity === "simple" ? 40_000 : complexity === "medium" ? 55_000 : 70_000;
    const rawContent = `Analyze the following website HTML and return JSON analysis:\n\n=== HOMEPAGE: ${URL_} ===\n${extraction.rawHtml.slice(0, hardCap)}`;
    const rp = parseStatusRows((await call(PASS1_MAX_TOKENS, buildPass1SystemBlocks(scopedChecks), rawContent)).text, scopedChecks);
    const rCounts = rubricCounts(rp.rows, scopedChecks);
    rawSkip = skipIds(rp.rows);
    rawAnswered = answeredIds(rp.rows);
    const rdims = computeApiDimensions(rp.rows);
    rawScore = Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (rdims[k] ?? 0), 0))));
    rawTf = tfCounts(rp.rows, scopedChecks);
    console.log(`[diag ${LABEL}] RAW pass1: score=${rawScore} answered=${rCounts.passes + rCounts.fails}/${scopedChecks.length} skip=${rCounts.skips} tf=${rawTf.ans}/${rawTf.skip}`);
    // wrongful = summary skipped but raw answered; domDeep = both skipped
    const wrongful = sSkip.filter((id) => rawAnswered!.has(id));
    const domDeep = sSkip.filter((id) => !rawAnswered!.has(id));
    console.log(`[diag ${LABEL}] CLASSIFY summary-skips: total=${sSkip.length} wrongful(raw answered)=${wrongful.length} domDeep(raw also skipped)=${domDeep.length}`);
    const byCat = (ids: string[]) => { const m: Record<string, number> = {}; for (const id of ids) { const c = idToCat.get(id) ?? "?"; m[c] = (m[c] ?? 0) + 1; } return m; };
    console.log(`[diag ${LABEL}] wrongful by category: ${JSON.stringify(byCat(wrongful))}`);
    console.log(`[diag ${LABEL}] domDeep by category:  ${JSON.stringify(byCat(domDeep))}`);
  }

  const out = {
    label: LABEL, site_type, scoped: scopedChecks.length,
    rawHtmlBytes, extractHash, summaryLen, summaryHash,
    score, skipRate, answered: counts.passes + counts.fails, skip: counts.skips,
    tfAns: tf.ans, tfSkip: tf.skip, truncated: p1.truncated, backfill, retried, lowConfidence,
    summarySkipIds: sSkip, summarySkipHash: sha1(sSkip.join(",")),
    summarySkipByCat: sSkip.reduce<Record<string, number>>((m, id) => { const c = idToCat.get(id) ?? "?"; m[c] = (m[c] ?? 0) + 1; return m; }, {}),
    rawScore, rawTf, rawSkipIds: rawSkip,
  };
  writeFileSync(`diag_run_${LABEL}.json`, JSON.stringify(out, null, 2));
  console.log(`DIAGJSON ${JSON.stringify({ label: LABEL, rawHtmlBytes, extractHash, summaryLen, summaryHash, score, skip: counts.skips, skipRate: +skipRate.toFixed(3), tfAns: tf.ans, tfSkip: tf.skip, truncated: p1.truncated, backfill, lowConfidence, summarySkipHash: out.summarySkipHash })}`);
  console.log(`[diag ${LABEL}] wrote diag_run_${LABEL}.json — (done)`);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
