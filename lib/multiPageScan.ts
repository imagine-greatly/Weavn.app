import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { scrapeSite } from "@/lib/scraper";
import { detectSiteType } from "@/lib/siteType";
import { extractPageData } from "@/lib/analyzePipeline";
import { buildApiPrompt } from "@/lib/apiPrompt";
import { logScanUsage, deductCredits, InsufficientCreditsError } from "@/lib/usageTracking";
import { realScanCostUsd } from "@/lib/scanCost";
import { dispatchMultiPageWebhook } from "@/lib/webhooks";

export const MULTI_PAGE_CONCURRENCY = 2;

export { InsufficientCreditsError };

export interface ScanOptions {
  effectiveFields: string[];
  findingLimit: number;
  findingDepth: "brief" | "full";
  creditsAlreadyDeducted?: boolean;
  parentScanId?: string;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

function scoreToVerdict(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Needs Work";
  return "Poor";
}

interface ChildScanResult {
  scanId: string;
  score: number;
  url: string;
  path: string;
}

async function scanPageForMulti(
  url: string,
  pagePath: string,
  parentScanId: string,
  apiKeyId: string,
  domain: string,
  options: ScanOptions
): Promise<ChildScanResult> {
  const scanStart = Date.now();
  const supabase = getServiceClient();
  let childScanId: string = randomUUID() as string;

  try {
    const { data } = await supabase.from("reports").insert([{
      domain,
      user_id: null,
      status: "pending",
      health_score: 0,
      verdict: "pending",
      analysis: {},
      share_token: randomUUID() as string,
      api_key_id: apiKeyId,
      scan_type: "child",
      parent_scan_id: parentScanId,
      page_path: pagePath,
    }]).select("id").single();
    const id = (data as { id?: string } | null)?.id;
    if (id) childScanId = id;
  } catch { /* use generated uuid */ }

  const markFailed = async () => {
    try {
      await supabase.from("reports").update([{ status: "failed" }]).eq("id", childScanId);
    } catch { /* ignore */ }
  };

  // Scrape with one retry
  let extraction: Awaited<ReturnType<typeof scrapeSite>> | undefined;
  try {
    extraction = await scrapeSite(url);
  } catch {
    try {
      await new Promise(r => setTimeout(r, 5_000));
      extraction = await scrapeSite(url);
    } catch {
      await markFailed();
      console.error(`[multiPageScan] scrape failed | url=${url}`);
      return { scanId: childScanId, score: 0, url, path: pagePath };
    }
  }

  if (!extraction?.rawHtml) {
    await markFailed();
    return { scanId: childScanId, score: 0, url, path: pagePath };
  }

  const siteType = detectSiteType(extraction);
  let wordCount = 0;
  let ctaCount = 0;
  try {
    const pageData = extractPageData(
      extraction.rawHtml,
      url,
      pagePath === "/" ? "homepage" : pagePath.replace(/^\//, "")
    );
    wordCount = pageData.wordCount;
    ctaCount = pageData.ctaCount;
  } catch { /* best-effort */ }

  const { systemPrompt } = buildApiPrompt({
    fields: options.effectiveFields,
    findingLimit: options.findingLimit,
    findingDepth: options.findingDepth,
    siteType,
    pageCount: 1,
  });

  const complexity = extraction.complexity ?? "medium";
  const hardCap = complexity === "simple" ? 40_000 : complexity === "medium" ? 55_000 : 70_000;
  const safeHtml = extraction.rawHtml.slice(0, hardCap);
  const userContent = `Analyze the following website HTML and return JSON analysis:\n\n=== PAGE: ${url} ===\n${safeHtml}`;

  const analyzeTimeoutMs = 120_000;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: analyzeTimeoutMs });

  let rawJson: string;
  let tokensUsed: number | undefined;
  let realCostUsd = 0;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 5000,
      temperature: 0,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });
    tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    realCostUsd = realScanCostUsd(message.usage);
    const block = message.content.find(c => c.type === "text");
    if (!block || block.type !== "text") throw new Error("No text content from model.");
    rawJson = block.text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
  } catch (err) {
    console.error(`[multiPageScan] analyze error | url=${url} | ${err instanceof Error ? err.message : err}`);
    await markFailed();
    return { scanId: childScanId, score: 0, url, path: pagePath };
  }

  type ApiResponse = {
    score: number;
    verdict: string;
    dimensions: Record<string, number>;
    summary?: string;
    findings?: unknown[];
    copy_rewrites?: Record<string, string | undefined>;
    growth_blueprint?: unknown[];
  };

  let parsed: ApiResponse;
  try {
    parsed = JSON.parse(rawJson) as ApiResponse;
  } catch {
    await markFailed();
    return { scanId: childScanId, score: 0, url, path: pagePath };
  }

  const score = Math.min(100, Math.max(0, Math.round(parsed.score ?? 50)));
  const verdict = scoreToVerdict(score);
  const durationMs = Date.now() - scanStart;

  try {
    await supabase.from("reports").update([{
      status: "completed",
      health_score: score,
      verdict,
      analysis: {
        score,
        dimensions: parsed.dimensions ?? {},
        summary: parsed.summary ?? "",
        findings: parsed.findings ?? [],
        copy_rewrites: parsed.copy_rewrites ?? {},
        growth_blueprint: parsed.growth_blueprint ?? [],
        word_count: wordCount,
        cta_count: ctaCount,
        duration_ms: durationMs,
        tokens_used: tokensUsed,
      },
    }]).eq("id", childScanId);
  } catch (err) {
    console.error(`[multiPageScan] child record update failed | id=${childScanId}`, err);
  }

  void logScanUsage(apiKeyId, {
    url,
    score,
    responseTimeMs: durationMs,
    status: "success",
    statusCode: 200,
    endpoint: "scan",
    pageCount: 1,
    costUsd: realCostUsd,
    cached: false,
  });

  return { scanId: childScanId, score, url, path: pagePath };
}

export async function runMultiPageScan(
  baseUrl: string,
  pages: string[],
  userId: string,
  apiKeyId: string,
  options: ScanOptions
): Promise<string> {
  const base = baseUrl.replace(/\/+$/, "");

  // Build full URL list — homepage always first, then explicit paths
  const rawUrls = [base, ...pages.map(p => `${base}${p}`)];

  // Deduplicate preserving order
  const seen = new Set<string>();
  const urlList: Array<{ url: string; path: string }> = [];
  for (const u of rawUrls) {
    const dedupeKey = u.toLowerCase().replace(/\/+$/, "");
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      try {
        const parsed = new URL(u);
        urlList.push({ url: u, path: parsed.pathname || "/" });
      } catch { /* skip invalid */ }
    }
  }

  // Cap at 5 silently
  const capped = urlList.slice(0, 5);

  if (!options.creditsAlreadyDeducted) {
    await deductCredits(userId, capped.length);
  }

  const domain = (() => {
    try { return new URL(base).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
  })();

  const supabase = getServiceClient();

  // Create or update the parent scan record
  const parentScanId: string = options.parentScanId ?? (randomUUID() as string);

  if (options.parentScanId) {
    // Route pre-created a pending record; mark it as a multi scan
    try {
      await supabase.from("reports").update([{
        scan_type: "multi",
        user_id: userId,
        domain,
        api_key_id: apiKeyId,
      }]).eq("id", parentScanId);
    } catch { /* non-fatal */ }
  } else {
    try {
      await supabase.from("reports").insert([{
        id: parentScanId,
        domain,
        user_id: userId,
        status: "pending",
        health_score: 0,
        verdict: "pending",
        analysis: {},
        share_token: randomUUID() as string,
        api_key_id: apiKeyId,
        scan_type: "multi",
      }]);
    } catch { /* non-fatal */ }
  }

  console.log(`[multiPageScan] START | parentScanId=${parentScanId} pages=${capped.length} domain=${domain}`);

  // Scan pages in batches of MULTI_PAGE_CONCURRENCY
  const childResults: ChildScanResult[] = [];
  for (let i = 0; i < capped.length; i += MULTI_PAGE_CONCURRENCY) {
    const batch = capped.slice(i, i + MULTI_PAGE_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(({ url, path }) =>
        scanPageForMulti(url, path, parentScanId, apiKeyId, domain, options)
      )
    );
    childResults.push(...batchResults);
  }

  // Aggregate score from successful child scans
  const successfulScores = childResults.filter(r => r.score > 0).map(r => r.score);
  const aggregateScore = successfulScores.length > 0
    ? Math.round(successfulScores.reduce((a, b) => a + b, 0) / successfulScores.length)
    : 0;

  const childScanIds = childResults.map(r => r.scanId);

  // Update parent record to completed
  try {
    await supabase.from("reports").update([{
      status: "completed",
      health_score: aggregateScore,
      verdict: scoreToVerdict(aggregateScore),
      child_scan_ids: childScanIds,
      analysis: {
        aggregate_score: aggregateScore,
        page_count: capped.length,
        child_scan_ids: childScanIds,
        pages: childResults.map(r => ({
          url: r.url,
          path: r.path,
          score: r.score,
          scan_id: r.scanId,
        })),
      },
    }]).eq("id", parentScanId);
  } catch (err) {
    console.error(`[multiPageScan] parent record update failed | id=${parentScanId}`, err);
  }

  dispatchMultiPageWebhook(apiKeyId, {
    scan_id: parentScanId,
    type: "multi",
    page_count: capped.length,
    aggregate_score: aggregateScore,
    scans: childResults.map(r => ({
      url: r.url,
      path: r.path,
      score: r.score,
      scan_id: r.scanId,
    })),
    credits_used: capped.length,
  });

  console.log(`[multiPageScan] COMPLETE | parentScanId=${parentScanId} aggregateScore=${aggregateScore}`);
  return parentScanId;
}
