/**
 * scripts/captureFixtures.ts — capture scrape fixtures ONCE so all downstream scoring work
 * replays offline for free (no live scrape, no Anthropic). BROWSERLESS ONLY — makes ZERO
 * model calls, so it runs even with the Anthropic key disabled.
 *
 * Writes ./fixtures/<slug>.json per site with the COMPLETE input the scoring path consumes:
 *   url, fullHtml (the entire rendered DOM the scraper returns — NOT a fragment),
 *   cleanHtml output, scrapeRawHtml (post-truncation = what scoring actually feeds the model),
 *   extractedPage (full ExtractedPage), summary (buildSinglePageSummary output via
 *   buildPageSummary), renderBytes, complexity, and the completeness-gate verdict.
 *
 * It calls scrapeUrl() ONCE per site (which includes the networkidle2 + retry-on-thin path),
 * then derives clean/truncate/extract/summarize deterministically — mirroring scrapeSite()
 * exactly, but keeping the full pre-truncation render that scrapeSite discards.
 *
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/captureFixtures.ts
 *
 * Reads BROWSERLESS_API_KEY from .env.local. Output is gitignored; never commit fixtures.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
try { (process as unknown as { loadEnvFile: (p: string) => void }).loadEnvFile(".env.local"); } catch { /* */ }

import { mkdirSync, writeFileSync } from "fs";
import { scrapeUrl, cleanHtml, applySmartTruncation, assessRenderCompleteness, type CombinedExtraction } from "../lib/scraper";
import { detectSiteType } from "../lib/siteType";
import { extractPageData } from "../lib/analyzePipeline";
import { buildPageSummary } from "../lib/analyze";

interface Site { slug: string; url: string; note: string }
const SITES: Site[] = [
  { slug: "stripe", url: "https://stripe.com", note: "anti-bot-hard SaaS" },
  { slug: "linear", url: "https://linear.app", note: "JS-heavy SPA" },
  { slug: "plausible", url: "https://www.plausible.io", note: "ordinary content-rich SaaS" },
  { slug: "berkshire", url: "https://www.berkshirehathaway.com", note: "thin/simple static site" },
  { slug: "wikipedia-cro", url: "https://en.wikipedia.org/wiki/Conversion_rate_optimization", note: "content-heavy long page" },
];

if (!process.env.BROWSERLESS_API_KEY) { console.error("FATAL: BROWSERLESS_API_KEY missing in .env.local"); process.exit(1); }
mkdirSync("fixtures", { recursive: true });

interface Summary { slug: string; url: string; renderBytes: number; truncatedBytes: number; summaryLen: number; complexity: string; complete: boolean; reason: string; looksShell: boolean }

async function main() {
  console.log(`[capture] Browserless-only fixture capture — 0 Anthropic calls — ${SITES.length} sites, sequential\n`);
  const results: Summary[] = [];

  for (const site of SITES) {
    console.log(`\n=== ${site.slug} (${site.note}) — ${site.url} ===`);
    try {
      // ONE scrape (includes networkidle2 + retry-on-thin). Mirror scrapeSite() deterministically.
      const scraped = await scrapeUrl(site.url);
      const fullHtml = scraped.rawHtml;                          // complete rendered DOM (pre-clean/truncation)
      const cleaned = cleanHtml(fullHtml);
      const truncated = applySmartTruncation(cleaned, scraped.complexity); // == scrapeSite()'s extraction.rawHtml
      const extraction: CombinedExtraction = {
        rawHtml: truncated,
        pagesAnalyzed: [site.url],
        complexity: scraped.complexity,
        readableRatio: scraped.readableRatio,
      };
      const site_type = detectSiteType(extraction);
      const page = extractPageData(truncated, site.url, "homepage");
      const summary = buildPageSummary(extraction);
      const completeness = assessRenderCompleteness(truncated, {
        wordCount: page.wordCount,
        headlineCount: page.headlines.length,
        linkCount: page.htmlSignals.linkCount,
      });

      const fixture = {
        url: site.url,
        slug: site.slug,
        note: site.note,
        capturedAt: new Date().toISOString(),
        renderBytes: fullHtml.length,
        cleanBytes: cleaned.length,
        truncatedBytes: truncated.length,
        complexity: scraped.complexity,
        readableRatio: scraped.readableRatio,
        siteType: site_type,
        completeness,
        fullHtml,                 // FULL rendered DOM — the complete archived input
        cleanHtml: cleaned,       // cleanHtml() output
        scrapeRawHtml: truncated, // what the scoring path actually feeds the model (extraction.rawHtml)
        extractedPage: page,      // full ExtractedPage object
        summary,                  // buildSinglePageSummary output (single-page)
      };
      writeFileSync(`fixtures/${site.slug}.json`, JSON.stringify(fixture, null, 2));

      // A "shell" = a render whose full HTML is large-but-mostly-JS so the cleaned DOM
      // collapses tiny (Stripe's pre-hydration case: 185K full → ~1.4K cleaned).
      const looksShell = !completeness.complete || (fullHtml.length > 50_000 && truncated.length < 5_000);
      results.push({ slug: site.slug, url: site.url, renderBytes: fullHtml.length, truncatedBytes: truncated.length, summaryLen: summary.length, complexity: scraped.complexity, complete: completeness.complete, reason: completeness.reason, looksShell });
      console.log(`  wrote fixtures/${site.slug}.json | renderBytes=${fullHtml.length} cleaned=${cleaned.length} truncated=${truncated.length} summaryLen=${summary.length} siteType=${site_type} complete=${completeness.complete} (${completeness.reason})${looksShell ? "  ⚠ SHELL?" : ""}`);
    } catch (e) {
      console.log(`  FAILED → ${e instanceof Error ? e.message : e}`);
      results.push({ slug: site.slug, url: site.url, renderBytes: 0, truncatedBytes: 0, summaryLen: 0, complexity: "-", complete: false, reason: e instanceof Error ? e.message.slice(0, 60) : "error", looksShell: true });
    }
  }

  console.log("\n\n================ FIXTURE CAPTURE SUMMARY ================");
  console.log("slug          | renderBytes | truncated | summaryLen | cmplx   | complete | flag");
  for (const r of results) {
    console.log(`${r.slug.padEnd(13)} | ${String(r.renderBytes).padStart(11)} | ${String(r.truncatedBytes).padStart(9)} | ${String(r.summaryLen).padStart(10)} | ${r.complexity.padEnd(7)} | ${r.complete ? "Y" : "N"}        | ${r.looksShell ? "⚠ SHELL/DEGRADED — review" : "ok"}`);
  }
  const written = results.filter((r) => r.renderBytes > 0).length;
  console.log(`\n${written}/${SITES.length} fixtures written. Anthropic calls made: 0.`);
  const shells = results.filter((r) => r.looksShell);
  if (shells.length) console.log(`⚠ Review: ${shells.map((s) => s.slug).join(", ")} — full render small/incomplete (retry-on-thin may not have recovered a full page).`);
  console.log("\n(done)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
