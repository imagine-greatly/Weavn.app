/**
 * GET /api/analyze/preview?url= — Fast homepage fetch for loading UI (H1, CTAs, sections).
 * No AI. No rate limit (lightweight); consider adding if abused.
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import {
  validateAndNormalizeUrl,
  detectSiteType,
  discoverPages,
  extractPageData,
} from "@/lib/analyzePipeline";
import { detectSectionsFromHtml, type WireSectionKey } from "@/lib/detectWireframeSections";

const AXIOS_OPTIONS = {
  timeout: 12000,
  maxRedirects: 5,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; webdoc-scanner/1.0)",
    Accept: "text/html",
  },
  validateStatus: () => true,
};

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url") ?? "";
  const validated = validateAndNormalizeUrl(urlParam);
  if ("error" in validated) {
    return NextResponse.json(
      { error: validated.error, code: "PREVIEW_INVALID_URL" },
      { status: 400 }
    );
  }
  const { url, domain } = validated;
  const t0 = Date.now();

  try {
    const axiosRes = await axios.get(url, AXIOS_OPTIONS);
    if (axiosRes.status !== 200) {
      return NextResponse.json(
        {
          error: `Could not fetch website (HTTP ${axiosRes.status}).`,
          code: "PREVIEW_HTTP_ERROR",
          domain,
        },
        { status: 422 }
      );
    }
    const ct = axiosRes.headers["content-type"] ?? "";
    if (!String(ct).includes("html")) {
      return NextResponse.json(
        { error: "Not HTML.", code: "PREVIEW_NOT_HTML", domain },
        { status: 422 }
      );
    }

    const homepageHtml = axiosRes.data as string;
    const $ = cheerio.load(homepageHtml);
    const linkHrefs: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      if (href && !href.startsWith("#") && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
        linkHrefs.push(href);
      }
    });

    const siteType = detectSiteType(homepageHtml, linkHrefs);
    const extraUrls = discoverPages(linkHrefs, url, siteType);
    const extracted = extractPageData(homepageHtml, url, "homepage");
    const sections: WireSectionKey[] = detectSectionsFromHtml(homepageHtml);
    const firstHeadline = extracted.headlines[0];
    const headlineText =
      typeof firstHeadline === "object" && firstHeadline?.text
        ? firstHeadline.text.trim()
        : "";
    const headline =
      headlineText ||
      extracted.meta.title?.trim() ||
      "(no H1 detected)";
    const ctaSample =
      Array.isArray(extracted.buttons) && extracted.buttons[0]
        ? (typeof extracted.buttons[0] === "object" && extracted.buttons[0] !== null && "text" in extracted.buttons[0]
            ? String((extracted.buttons[0] as { text: string }).text)
            : String(extracted.buttons[0])
          ).slice(0, 80)
        : "No primary CTA detected";

    const fetchMs = Date.now() - t0;

    return NextResponse.json({
      domain,
      url,
      headline,
      h1: extracted.headlines[0] ?? "",
      cta: ctaSample,
      buttons: (extracted.buttons ?? []).slice(0, 4).map((b) =>
        typeof b === "object" && b !== null && "text" in b
          ? String((b as { text: string }).text).slice(0, 60)
          : String(b).slice(0, 60)
      ),
      siteType,
      pagesDiscovered: 1 + extraUrls.length,
      sections,
      fetchMs,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Preview fetch failed.";
    console.error("[analyze/preview]", err);
    return NextResponse.json(
      { error: message, code: "PREVIEW_FETCH_FAILED", domain },
      { status: 502 }
    );
  }
}
