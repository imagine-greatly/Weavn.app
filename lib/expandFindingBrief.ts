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
};

/** Calls Claude and returns parsed expansion, or null on failure. */
export async function expandFindingBriefWithAnthropic(
  body: ExpandFindingBriefRequestBody
): Promise<FindingBriefExpansion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const userMessage = buildExpandFindingBriefUserMessage({
    domain: body.domain,
    overallScore: body.overallScore,
    finding: body.finding,
    related: body.relatedFindings,
  });

  const anthropic = new Anthropic({ apiKey, timeout: 55_000 });
  let rawText = "";
  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
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
