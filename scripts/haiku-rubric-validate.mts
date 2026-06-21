/**
 * scripts/haiku-rubric-validate.mts — HAIKU model-validation of the gated rubric (OFFLINE replay, HARD-CAPPED).
 *
 * Runs the full gated rubric path (PASS 1 status + PASS 2 findings) against each fixture's SAVED
 * summary input. Haiku ONLY. NO scrape, NO web, NO Browserless. Does NOT flip WEAVN_RUBRIC_SCORING,
 * does NOT write Supabase, does NOT merge/push. Calls the real rubricScan functions (no re-impl).
 *
 *   3 fixtures (stripe/plausible/berkshire) × 5 sequential runs × (pass1 + pass2) = 15 Haiku scans.
 *
 * COST GUARD: prints per-call tokens + est cost + a RUNNING total. HARD STOP if the running total
 * reaches the cap ($0.75) — reports what ran. Expected ~$0.40.
 *
 * Saves all 15 status sets + the pass-2 findings into fixtures/<slug>.json under `haikuValidation`
 * (gitignored, non-destructive — existing fields untouched) so downstream N-tuning / inspection
 * replays offline for $0.
 *
 *   npx tsx scripts/haiku-rubric-validate.mts --dry     # offline recon, $0, ZERO API calls
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/haiku-rubric-validate.mts
 */
import { readFileSync, writeFileSync } from "fs";
import {
  scopeChecksForScan,
  buildPass1SystemBlocks,
  buildPass2SystemBlocks,
  parseStatusRows,
  parsePass2Narrative,
  topFailIdsByPriority,
  rubricCounts,
  computeApiDimensions,
  API_DIMENSION_KEYS,
} from "../lib/rubricScan";
import { getWeightProfile } from "../lib/benchmarks";
import type { RubricResultRow } from "../lib/processFindings";
import type { SiteType } from "../lib/reportSchema";
import type { DiagnosticCheck } from "../lib/diagnosticRubric";

try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

const DRY = process.argv.includes("--dry");
const MODEL = "claude-haiku-4-5-20251001"; // Haiku 4.5 ONLY — never Sonnet.
const RUNS = 5;
const FIXTURES = ["stripe", "plausible", "berkshire"]; // service / saas / local(thin)
const PASS1_MAX_TOKENS = 8000;
const PASS1_RETRY_MAX_TOKENS = 12000;
const PASS2_MAX_TOKENS = 16000;
const FINDING_LIMIT = 10; // production default (route.ts: min(20,max(1, finding_limit ?? 10)))
const HARD_CAP_USD = 0.75;
const TIMEOUT_MS = 200_000;

// Haiku 4.5 $/MTok (confirmed via the claude-api skill): input 1, output 5, cache-write(5m) 1.25, cache-read 0.10.
const RATE = { in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.10 };
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
// Current Anthropic semantics: input_tokens is the UNCACHED remainder; cache tokens are reported separately (additive).
function costOf(u: Usage): number {
  const i = u.input_tokens ?? 0, o = u.output_tokens ?? 0, cw = u.cache_creation_input_tokens ?? 0, cr = u.cache_read_input_tokens ?? 0;
  return (i * RATE.in + o * RATE.out + cw * RATE.cacheWrite + cr * RATE.cacheRead) / 1e6;
}
const usd = (n: number) => `$${n.toFixed(4)}`;

// summaryContent wrapper — VERBATIM from app/api/v1/scan/route.ts so the --model input matches the real path.
function summaryWrap(summary: string): string {
  return `Below is a STRUCTURED OBSERVABLE SUMMARY of the fully-rendered page(s), extracted directly from the HTML. Treat every listed signal as an authoritative observation of what is actually on the page — copy, structure, CTAs, trust/social proof, pricing, forms, and the TECHNICAL / HTML SIGNALS block (viewport, image alt coverage, scripts, mobile nav, video, chat, …). A signal explicitly reported as ABSENT is an OBSERVATION: FAIL the matching check rather than SKIP it. Only SKIP when the signal is genuinely not represented here and cannot be derived from it (true runtime/rendering behavior such as load speed or Core Web Vitals).\n\n${summary}`;
}

// The judgment "c-list" — the 53 check ids sharpened in commit b5f3874
// ("sharpen 52 judgment checks into mechanical criteria"). Authoritative judgment set.
const JUDGMENT_IDS = new Set<string>([
  "CTA_002","CTA_005","CTA_009","DIFF_001","DIFF_004","DIFF_010","DIFF_012",
  "HERO_001","HERO_002","HERO_003","HERO_006","HERO_013","MSG_001","MSG_002",
  "MSG_004","MSG_006","MSG_007","MSG_010","MSG_011","MSG_012","MSG_014",
  "NARR_001","NARR_002","NARR_003","NARR_005","NARR_006","NARR_007","NARR_008",
  "NARR_009","NARR_010","NARR_012","NARR_015","OFC_003","OFC_008","PSY_001",
  "PSY_004","PSY_006","PSY_007","PSY_010","PSY_014","SAAS_004","SAAS_006",
  "SAAS_016","SOCIAL_007","SPEC_001","SPEC_005","SPEC_008","SPEC_009","SPQ_001",
  "SPQ_003","SPQ_007","TRUST_004","TRUST_013",
]);

function weighted(dims: Record<string, number>, siteType: string): number {
  const w = getWeightProfile(siteType);
  return Math.min(100, Math.max(0, Math.round(API_DIMENSION_KEYS.reduce((s, k) => s + (w[k] ?? 0) * (dims[k] ?? 0), 0))));
}

interface Fixture { url: string; slug: string; siteType: string; summary: string; }
interface SavedFinding { id: string; title?: string; evidence?: string; exitTrigger?: string; conversionCost?: string; implementation?: string; effort?: string; }
interface SavedRun {
  run: number;
  statusRows: { id: string; status: string }[];
  findings: SavedFinding[];
  summary: string;
  copyRewrites: unknown;
  headline: number;
  skipRate: number;
  counts: ReturnType<typeof rubricCounts>;
  narrateIds: string[];
  usage: { pass1: Usage; pass1Retry?: Usage; pass2?: Usage };
  costUsd: number;
}

let running = 0;
let callCount = 0;
let stopped = false;

async function haikuCall(client: import("@anthropic-ai/sdk").default, system: ReturnType<typeof buildPass1SystemBlocks>, userContent: string, maxTokens: number, label: string): Promise<{ text: string; usage: Usage }> {
  const msg = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, temperature: 0,
    system, messages: [{ role: "user", content: userContent }],
  });
  const u = msg.usage as Usage;
  const c = costOf(u);
  running += c;
  callCount++;
  console.log(`    [call ${callCount}] ${label}: in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0} cacheCreate=${u.cache_creation_input_tokens ?? 0} cacheRead=${u.cache_read_input_tokens ?? 0} | cost=${usd(c)} | RUNNING=${usd(running)}`);
  const block = msg.content.find((b) => b.type === "text");
  return { text: block && block.type === "text" ? block.text : "", usage: u };
}

async function main() {
  console.log(`\n=== HAIKU RUBRIC VALIDATION ${DRY ? "(DRY — offline recon, $0, ZERO API calls)" : `(model=${MODEL})`} ===`);
  console.log(`fixtures=${FIXTURES.join(",")} runs=${RUNS} pass2 findingLimit=${FINDING_LIMIT} HARD_CAP=${usd(HARD_CAP_USD)} judgment-c-list=${JUDGMENT_IDS.size}\n`);

  let client: import("@anthropic-ai/sdk").default | null = null;
  if (!DRY) {
    if (!process.env.ANTHROPIC_API_KEY) { console.error("FATAL: ANTHROPIC_API_KEY missing (.env.local)"); process.exit(1); }
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS });
  }

  const perFixture: Record<string, SavedRun[]> = {};

  for (const slug of FIXTURES) {
    const fixture = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8")) as Fixture;
    if (!fixture.summary || typeof fixture.summary !== "string") { console.error(`FATAL: fixtures/${slug}.json has no .summary`); process.exit(1); }
    const siteType = fixture.siteType as SiteType;
    const scoped = scopeChecksForScan(siteType);
    const byId = new Map(scoped.map((c) => [c.id, c]));
    const judgmentInScope = scoped.filter((c) => JUDGMENT_IDS.has(c.id));
    const catalogChars = buildPass1SystemBlocks(scoped)[0].text.length;

    console.log("=".repeat(80));
    console.log(`${slug}  siteType=${siteType}  scopedChecks=${scoped.length}  judgmentInScope=${judgmentInScope.length}`);
    console.log(`  summaryChars=${fixture.summary.length}  catalogChars≈${catalogChars} (~${Math.round(catalogChars / 4)} tok)`);

    if (DRY) {
      // crude projection: catalog cache (write once, read 9×), summary input ×5, pass1 out ~ scoped*16, pass2 in ~ summary, pass2 out ~ 1.6k
      const cat = catalogChars / 4, sum = fixture.summary.length / 4;
      const p1out = scoped.length * 16, p2out = 1600;
      const proj = (cat * RATE.cacheWrite + cat * RATE.cacheRead * 9 + sum * RATE.in * 10
        + p1out * RATE.out * RUNS + p2out * RATE.out * RUNS) / 1e6;
      console.log(`  projected fixture cost ≈ ${usd(proj)} (rough)`);
      continue;
    }

    const runs: SavedRun[] = [];
    for (let r = 1; r <= RUNS; r++) {
      if (running >= HARD_CAP_USD) { stopped = true; console.log(`  ⛔ COST CAP reached (${usd(running)} ≥ ${usd(HARD_CAP_USD)}) — stopping before ${slug} run ${r}`); break; }
      console.log(`  --- ${slug} run ${r}/${RUNS} ---`);
      const runCost0 = running;

      // PASS 1 — status only (+ one retry if incomplete, mirroring production)
      const c1 = await haikuCall(client!, buildPass1SystemBlocks(scoped), summaryWrap(fixture.summary), PASS1_MAX_TOKENS, `${slug} r${r} pass1`);
      let p1 = parseStatusRows(c1.text, scoped);
      const usage: SavedRun["usage"] = { pass1: c1.usage };
      if ((p1.truncated || p1.backfilledIds.length > 0) && running < HARD_CAP_USD) {
        console.log(`      pass1 incomplete (truncated=${p1.truncated} backfilled=${p1.backfilledIds.length}) → retry @ ${PASS1_RETRY_MAX_TOKENS}`);
        const c1b = await haikuCall(client!, buildPass1SystemBlocks(scoped), summaryWrap(fixture.summary), PASS1_RETRY_MAX_TOKENS, `${slug} r${r} pass1-retry`);
        p1 = parseStatusRows(c1b.text, scoped);
        usage.pass1Retry = c1b.usage;
      }

      const statusRows = p1.rows;
      const counts = rubricCounts(statusRows, scoped);
      const dims = computeApiDimensions(statusRows);
      const headline = weighted(dims, siteType);
      const skipRate = counts.skips / scoped.length;
      const narrateIds = topFailIdsByPriority(statusRows, scoped, FINDING_LIMIT);

      // PASS 2 — narrative for top FAIL ids only (non-fatal; mirrors production)
      let findings: SavedFinding[] = [];
      let pass2Summary = "";
      let copyRewrites: unknown = {};
      if (narrateIds.length > 0 && running < HARD_CAP_USD) {
        try {
          const failLines = narrateIds.map((id) => `${id} | ${byId.get(id)?.title ?? ""}`).join("\n");
          const pass2User = `${summaryWrap(fixture.summary)}\n\n=== FAILED CHECKS (write the narrative for EACH; do not re-evaluate or add others) ===\n${failLines}`;
          const c2 = await haikuCall(client!, buildPass2SystemBlocks(scoped), pass2User, PASS2_MAX_TOKENS, `${slug} r${r} pass2`);
          usage.pass2 = c2.usage;
          const p2 = parsePass2Narrative(c2.text);
          pass2Summary = p2.summary;
          copyRewrites = p2.copyRewrites;
          findings = [...p2.narratives.entries()].map(([id, n]) => ({ id, ...n }));
        } catch (e) {
          console.error(`      pass2 error (non-fatal): ${e instanceof Error ? e.message : e}`);
        }
      } else if (narrateIds.length === 0) {
        console.log(`      (no FAILs to narrate — pass2 skipped)`);
      }

      const runCost = running - runCost0;
      console.log(`      result: score=${headline} skipRate=${(skipRate * 100).toFixed(1)}% P=${counts.passes} F=${counts.fails} S=${counts.skips} narrated=${findings.length}/${narrateIds.length} | runCost=${usd(runCost)}`);

      runs.push({
        run: r,
        statusRows: statusRows.map((r2) => ({ id: r2.id, status: String(r2.status).toUpperCase() })),
        findings, summary: pass2Summary, copyRewrites, headline, skipRate, counts, narrateIds, usage, costUsd: runCost,
      });

      if (running >= HARD_CAP_USD) { stopped = true; console.log(`  ⛔ COST CAP reached after ${slug} run ${r} (${usd(running)}) — stopping.`); break; }
    }

    perFixture[slug] = runs;

    // Persist non-destructively into the fixture (gitignored).
    if (runs.length > 0) {
      const full = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8"));
      full.haikuValidation = { model: MODEL, at: new Date().toISOString(), findingLimit: FINDING_LIMIT, judgmentClistSize: JUDGMENT_IDS.size, runs };
      writeFileSync(`fixtures/${slug}.json`, JSON.stringify(full, null, 2));
      console.log(`  saved ${runs.length} run(s) → fixtures/${slug}.json (haikuValidation)`);
    }
    if (stopped) break;
  }

  if (DRY) { console.log("\n(dry run complete — no API calls, nothing written)"); return; }

  // ──────────────── ANALYSIS ────────────────
  console.log(`\n${"#".repeat(80)}\n# ANALYSIS\n${"#".repeat(80)}`);
  console.log(`TOTAL COST: ${usd(running)} over ${callCount} Haiku calls${stopped ? "  (RUN STOPPED EARLY BY COST CAP)" : ""}`);

  for (const slug of FIXTURES) {
    const runs = perFixture[slug];
    if (!runs || runs.length === 0) { console.log(`\n[${slug}] no runs`); continue; }
    const n = runs.length;
    // rebuild scoped + judgment for this fixture
    const fixture = JSON.parse(readFileSync(`fixtures/${slug}.json`, "utf8")) as Fixture;
    const scoped = scopeChecksForScan(fixture.siteType as SiteType);
    const judgmentScopedIds = scoped.filter((c) => JUDGMENT_IDS.has(c.id)).map((c) => c.id);

    // status matrix: id -> [status per run]
    const matrix = new Map<string, string[]>();
    for (const c of scoped) matrix.set(c.id, []);
    for (const run of runs) for (const row of run.statusRows) { const a = matrix.get(row.id); if (a) a.push(row.status); }

    const flip = (ids: string[]) => {
      const flippers: { id: string; split: string }[] = [];
      for (const id of ids) {
        const arr = matrix.get(id) ?? [];
        if (arr.length < n) continue;
        const uniq = new Set(arr);
        if (uniq.size > 1) {
          const tally: Record<string, number> = {};
          for (const s of arr) tally[s] = (tally[s] ?? 0) + 1;
          flippers.push({ id, split: Object.entries(tally).map(([s, c]) => `${s}×${c}`).join("/") });
        }
      }
      return flippers;
    };

    const allFlip = flip(scoped.map((c) => c.id));
    const judgFlip = flip(judgmentScopedIds);

    const scores = runs.map((r) => r.headline);
    const skips = runs.map((r) => +(r.skipRate * 100).toFixed(1));

    console.log(`\n${"=".repeat(80)}\n[${slug}] siteType=${fixture.siteType} runs=${n} scoped=${scoped.length} judgmentInScope=${judgmentScopedIds.length}`);
    console.log(`  B — GENERALIZATION: scores=[${scores.join(", ")}] spread=${Math.max(...scores) - Math.min(...scores)} | skipRate%=[${skips.join(", ")}] spread=${(Math.max(...skips) - Math.min(...skips)).toFixed(1)}`);
    console.log(`  A — STABILITY: ALL-scoped flaky=${allFlip.length}/${scoped.length}  |  JUDGMENT-clist flaky=${judgFlip.length}/${judgmentScopedIds.length}`);
    if (judgFlip.length) console.log(`     judgment flippers: ${judgFlip.map((f) => `${f.id}(${f.split})`).join(", ")}`);
    else console.log(`     judgment flippers: NONE (all ${judgmentScopedIds.length} stable across ${n} runs)`);
    if (allFlip.length) {
      const nonJudg = allFlip.filter((f) => !JUDGMENT_IDS.has(f.id));
      console.log(`     non-judgment flippers (${nonJudg.length}): ${nonJudg.map((f) => `${f.id}(${f.split})`).join(", ") || "none"}`);
    }
  }
  console.log(`\n(done — fixtures saved; nothing pushed, no flag flipped, no merge)`);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
