/**
 * Finding brief expansion — server-only. Uses Anthropic SDK.
 * For pure parsing (safe in client components), use lib/expandFindingBriefParser.ts.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  EXPAND_FINDING_BRIEF_SYSTEM_PROMPT,
  buildExpandFindingBriefUserMessage,
  type ExpandFindingBriefFindingInput,
  type ExpandFindingBriefRelated,
} from "@/lib/prompts";
import {
  parseFindingBriefFromModelText,
  type FindingBriefExpansion,
} from "@/lib/expandFindingBriefParser";
export {
  parseFindingBriefFromModelText,
  parseFindingBriefFromStoredValue,
  type FindingBriefExpansion,
} from "@/lib/expandFindingBriefParser";

export type ExpandFindingBriefRequestBody = {
  domain: string;
  overallScore: number;
  finding: ExpandFindingBriefFindingInput;
  relatedFindings: ExpandFindingBriefRelated[];
  pageSummary?: string;
  siteType?: string;
};

function extractRelevantSummarySection(pageSummary: string, category: string, title: string): string {
  const signal = `${category} ${title}`.toLowerCase();

  let sectionHeaders: string[];
  if (/trust|testimonial|review|social.proof|credib|authority|proof/i.test(signal)) {
    sectionHeaders = ['TESTIMONIALS', 'SOCIAL PROOF', 'TRUST SIGNALS'];
  } else if (/pric|plan|tier|cost|package|billing/i.test(signal)) {
    sectionHeaders = ['PRICING'];
  } else if (/cta|call.to.action|button|convert|signup|form|lead/i.test(signal)) {
    sectionHeaders = ['CTAs', 'FORMS', 'HERO'];
  } else if (/seo|meta|search|schema|structured|canonical/i.test(signal)) {
    sectionHeaders = ['META', 'SCHEMA.ORG', 'H1', 'H2', 'H3'];
  } else if (/hero|headline|message|clarity|copy|value.prop/i.test(signal)) {
    sectionHeaders = ['HERO', 'H1', 'H2'];
  } else if (/faq|question|support|help/i.test(signal)) {
    sectionHeaders = ['FAQ', 'SECTIONS'];
  } else {
    return pageSummary.slice(0, 4000);
  }

  const extracted: string[] = [];
  for (const header of sectionHeaders) {
    const idx = pageSummary.search(new RegExp(`\\b${header}\\b`, 'i'));
    if (idx === -1) continue;
    const chunk = pageSummary.slice(idx, idx + 1500);
    extracted.push(chunk);
    if (extracted.join('\n\n').length >= 3000) break;
  }

  if (extracted.length === 0) return pageSummary.slice(0, 4000);
  const combined = extracted.join('\n\n');
  return combined.length > 4000 ? combined.slice(0, 4000) : combined;
}

/** Calls Claude and returns parsed expansion, or null on failure. */
export async function expandFindingBriefWithAnthropic(
  body: ExpandFindingBriefRequestBody
): Promise<FindingBriefExpansion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const relevantSummary = body.pageSummary
    ? extractRelevantSummarySection(
        body.pageSummary,
        String((body.finding as Record<string, unknown>).category ?? ''),
        String((body.finding as Record<string, unknown>).title ?? '')
      )
    : undefined;

  const userMessage = buildExpandFindingBriefUserMessage({
    domain: body.domain,
    overallScore: body.overallScore,
    finding: body.finding,
    related: body.relatedFindings,
    pageSummary: relevantSummary,
    siteType: body.siteType,
  });

  const anthropic = new Anthropic({ apiKey, timeout: 55_000 });
  let rawText = "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      system: [{ type: "text", text: EXPAND_FINDING_BRIEF_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = msg.content.find((b) => b.type === "text");
    rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    console.log(`[expand-finding] claude done | stop_reason=${msg.stop_reason} output_tokens=${msg.usage?.output_tokens}`);
  } catch (err) {
    console.error("[expand-finding] claude API error", err instanceof Error ? err.message : String(err));
    throw err;
  }
  const parsed = parseFindingBriefFromModelText(rawText);
  if (!parsed && rawText.trim()) {
    console.error("[expand-finding] parse failed | raw_len=" + rawText.length, rawText.slice(0, 800));
  }
  return parsed;
}
