/**
 * scripts/diagScrape.ts — PART A: characterize scrape variance (SCRAPE ONLY, no model calls).
 * Scrapes stripe / plausible / linear 3× SEQUENTIALLY and reports, per scrape: rendered HTML
 * byte size, extracted-key-field hash, summary hash, wall-time, which attempt was accepted,
 * HTTP statuses, whether an attempt timed out, blocked flags, and any Browserless error.
 *
 * Fork: if ordinary sites (plausible/linear) ALSO swing in render size run-to-run → SYSTEMIC
 * (wait-condition/timeout bug). If only stripe swings → TARGET-SPECIFIC (anti-bot).
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/diagScrape.ts
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

import { createHash } from "crypto";
import { scrapeSite } from "../lib/scraper";
import { detectSiteType } from "../lib/siteType";
import { extractPageData } from "../lib/analyzePipeline";
import { buildPageSummary } from "../lib/analyze";

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const SITES = [
  { label: "stripe", url: "https://stripe.com" },
  { label: "plausible", url: "https://www.plausible.io" },
  { label: "linear", url: "https://linear.app" },
];
const RUNS = 3;

// Capture scraper telemetry (it logs via console.log + process.stderr.write) into a buffer
// while still passing everything through to the real streams (so the log file is intact).
let buf: string[] = [];
const realLog = console.log.bind(console);
const realErr = process.stderr.write.bind(process.stderr);
console.log = (...a: unknown[]) => { buf.push(a.map(String).join(" ")); realLog(...a); };
process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => { buf.push(String(chunk)); // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (realErr as any)(chunk, ...rest); }) as typeof process.stderr.write;

function parseTelemetry(lines: string[]) {
  const text = lines.join("\n");
  const num = (re: RegExp) => { const m = text.match(re); return m ? parseInt(m[1], 10) : null; };
  const renderChars = num(/raw html chars: (\d+)/);
  const cleanChars = num(/clean:(\d+)/);
  const truncatedChars = num(/truncated html chars: (\d+)/);
  const complexity = (text.match(/\[SCAN\] complexity=(\w+)/) ?? [])[1] ?? "?";
  const statuses = Array.from(text.matchAll(/attempt(\d) response \| status=(\d+)/g)).map((m) => `a${m[1]}:${m[2]}`);
  const blocked = Array.from(text.matchAll(/attempt(\d) parsed \|.*?blocked=(true|false)/g)).map((m) => `a${m[1]}:${m[2]}`);
  const readables = Array.from(text.matchAll(/attempt(\d) parsed \|.*?readable=(\d+)/g)).map((m) => `a${m[1]}:${m[2]}`);
  const timeouts = Array.from(text.matchAll(/attempt(\d) ERROR \| ABORTED/g)).map((m) => `a${m[1]}`);
  const accepted = /attempt1 ACCEPTED/.test(text) ? "attempt1"
    : /attempt3 ACCEPTED/.test(text) ? "attempt3"
    : /sequence retry ACCEPTED/.test(text) ? "seqRetry"
    : /complexity re-evaluated|final proxy attempts/.test(text) ? "attempt2/best"
    : "?";
  const httpErr = (text.match(/FAILED \| HTTP (\d+)/) ?? [])[1] ?? null;
  const botBlocked = /BOT_BLOCKED/.test(text);
  return { renderChars, cleanChars, truncatedChars, complexity, statuses, blocked, readables, timeouts, accepted, httpErr, botBlocked };
}

interface Row { label: string; run: number; ok: boolean; workingBytes: number; renderChars: number | null; truncatedChars: number | null; extractHash: string; summaryHash: string; summaryLen: number; wallMs: number; complexity: string; accepted: string; statuses: string; blocked: string; timeouts: string; error: string; }

async function main() {
  const rows: Row[] = [];
  for (const site of SITES) {
    for (let run = 1; run <= RUNS; run++) {
      buf = [];
      const t0 = Date.now();
      let r: Row;
      try {
        const extraction = await scrapeSite(site.url);
        const wallMs = Date.now() - t0;
        const tel = parseTelemetry(buf);
        const page = extractPageData(extraction.rawHtml, site.url, "homepage");
        const keyFields = {
          hero: page.hero.headline, sub: page.hero.subheadline, cta: page.hero.ctaText,
          h1s: page.headlines.filter((h) => h.tag === "h1").map((h) => h.text),
          ctas: page.buttons.map((b) => b.text), title: page.meta.title, desc: page.meta.description,
          pricing: page.pricing.map((p) => `${p.planName}:${p.price}`), nav: page.navigation,
          htmlSignals: page.htmlSignals, wordCount: page.wordCount, ctaCount: page.ctaCount,
        };
        const summary = buildPageSummary(extraction);
        r = {
          label: site.label, run, ok: true, workingBytes: extraction.rawHtml.length,
          renderChars: tel.renderChars, truncatedChars: tel.truncatedChars,
          extractHash: sha1(JSON.stringify(keyFields)), summaryHash: sha1(summary), summaryLen: summary.length,
          wallMs, complexity: tel.complexity, accepted: tel.accepted,
          statuses: tel.statuses.join(",") || "-", blocked: tel.blocked.join(",") || "-",
          timeouts: tel.timeouts.join(",") || "-", error: "-",
        };
      } catch (e) {
        const tel = parseTelemetry(buf);
        r = {
          label: site.label, run, ok: false, workingBytes: 0, renderChars: tel.renderChars, truncatedChars: tel.truncatedChars,
          extractHash: "-", summaryHash: "-", summaryLen: 0, wallMs: Date.now() - t0, complexity: tel.complexity,
          accepted: tel.accepted, statuses: tel.statuses.join(",") || "-", blocked: tel.blocked.join(",") || "-",
          timeouts: tel.timeouts.join(",") || "-", error: tel.botBlocked ? "BOT_BLOCKED" : tel.httpErr ? `HTTP ${tel.httpErr}` : (e instanceof Error ? e.message.slice(0, 60) : String(e)),
        };
      }
      rows.push(r);
      realLog(`ROWJSON ${JSON.stringify(r)}`);
    }
  }

  // restore
  console.log = realLog;
  process.stderr.write = realErr;

  console.log("\n\n================ PART A — SCRAPE VARIANCE (3× sequential, scrape-only) ================");
  console.log("site      | run | ok | render_chars | working | trunc | summaryLen | summaryHash | extractHash | wall_s | cmplx | accepted     | statuses | blocked | timeouts | error");
  for (const r of rows) {
    console.log(`${r.label.padEnd(9)} | ${r.run}   | ${r.ok ? "Y" : "N"}  | ${String(r.renderChars ?? "-").padStart(12)} | ${String(r.workingBytes).padStart(7)} | ${String(r.truncatedChars ?? "-").padStart(6)} | ${String(r.summaryLen).padStart(10)} | ${r.summaryHash.padEnd(12)} | ${r.extractHash.padEnd(12)} | ${(r.wallMs / 1000).toFixed(0).padStart(5)} | ${r.complexity.padEnd(5)} | ${r.accepted.padEnd(12)} | ${r.statuses.padEnd(8)} | ${r.blocked.padEnd(7)} | ${r.timeouts.padEnd(8)} | ${r.error}`);
  }

  console.log("\n--- per-site variance ---");
  const swung: Record<string, boolean> = {};
  for (const site of SITES) {
    const rs = rows.filter((r) => r.label === site.label);
    const renders = rs.map((r) => r.renderChars ?? 0);
    const summaryHashes = new Set(rs.map((r) => r.summaryHash));
    const extractHashes = new Set(rs.map((r) => r.extractHash));
    const min = Math.min(...renders), max = Math.max(...renders);
    const spreadPct = max > 0 ? ((max - min) / max * 100) : 0;
    const swings = summaryHashes.size > 1 || spreadPct > 25;
    swung[site.label] = swings;
    console.log(`${site.label.padEnd(9)}: render ${min}–${max} (spread ${spreadPct.toFixed(0)}%) | distinct summaryHashes=${summaryHashes.size} extractHashes=${extractHashes.size} → ${swings ? "SWINGS" : "stable"}`);
  }

  console.log("\n--- FORK VERDICT ---");
  const ordinarySwings = swung["plausible"] || swung["linear"];
  if (ordinarySwings) {
    console.log("SYSTEMIC → ordinary content-rich/SPA sites ALSO swing run-to-run. The scrape returns");
    console.log("  before the page settles (wait-condition/timeout bug) — every scan rolls dice.");
  } else if (swung["stripe"]) {
    console.log("TARGET-SPECIFIC → only stripe (anti-bot-hard) swings; ordinary sites are stable.");
    console.log("  Variance is anti-bot/partial-render on hard targets, not a systemic wait bug.");
  } else {
    console.log("STABLE → no site swung materially in this batch.");
  }
  console.log("\n(done)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
