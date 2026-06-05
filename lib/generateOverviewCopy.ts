/**
 * Second-pass Claude call: diagnostic overview from tier-1 rubric findings.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { DiagnosticFinding } from "@/lib/processFindings";
import type { OverviewCopy } from "@/lib/reportSchema";

const DEFAULT_MODEL = "claude-sonnet-4-6";

function extractFirstTextBlock(response: {
  content: Array<{ type: string; text?: string }>;
}): string {
  const block = response.content[0];
  return block?.type === "text" && typeof block.text === "string" ? block.text : "";
}

function parseOverviewJson(text: string): Partial<OverviewCopy> | null {
  const stripped = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(stripped) as Partial<OverviewCopy>;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1)) as Partial<OverviewCopy>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export type OverviewCopyInput = {
  domain: string;
  siteType: string;
  heroHeadline: string | null;
  topFindings: DiagnosticFinding[];
  totalFailed: number;
  criticalCount: number;
};

/**
 * Build evidence text for the overview from top money-leak findings.
 */
export function buildTopFindingsTextForOverview(findings: DiagnosticFinding[]): string {
  return findings
    .slice(0, 8)
    .map((f) => {
      const head = (f.revenueTitle?.trim() || f.title).trim();
      const ev = (f.evidence?.trim() || "").trim();
      return `${f.id} (${f.severity} ${f.mode}): ${head}${ev ? ` — ${ev}` : ""}`;
    })
    .join("\n");
}

export async function generateOverviewCopy(
  anthropic: Anthropic,
  input: OverviewCopyInput,
  options?: { model?: string }
): Promise<OverviewCopy> {
  const model = options?.model ?? DEFAULT_MODEL;
  const {
    domain,
    siteType,
    heroHeadline,
    topFindings,
    totalFailed,
    criticalCount,
  } = input;

  const topFindingsText = buildTopFindingsTextForOverview(topFindings);

  const prompt = `You are a senior revenue consultant who has just analyzed ${domain}. You have found specific failures costing this business money. Write a diagnostic overview that tells the business owner exactly why their website is not making more money right now.

Use the following findings as your evidence:
${topFindingsText}

Hero headline found: ${heroHeadline ?? "Not detected"}
Site type: ${siteType}
Total failures: ${totalFailed} of 264 checks
Critical issues: ${criticalCount}

Write these fields:

verdict:
One paragraph, 3-5 sentences. Written like a consultant talking directly to the business owner. Specific to what you found on this site. References actual evidence. Explains the pattern of failures and what it is costing them. No technical jargon. No bullet points. No hedging. Blunt and specific.

Example of a good verdict:
'Ascend Labs is losing the vast majority of its potential customers at two predictable points. First, visitors who arrive and want to buy cannot find a reason to trust an unknown supplement brand — there is no guarantee, no named customer proof, and no credential that reduces purchase risk. Second, every visitor who does not buy on their first visit is permanently lost — there is no email capture, no retargeting hook, and no mechanism to bring them back. The site is spending money to drive traffic to a funnel that loses 97% of visitors with no recovery path. These are not design problems — they are revenue infrastructure problems that are fixable within a week.'

biggestOpportunity:
One sentence under 20 words. The single fix that would have the most immediate measurable impact on revenue. Be specific to this site.

estimatedImpact:
One sentence. What fixing the top 3 issues could realistically do for their revenue. Ground it in their specific business type, their specific failures, and real conversion benchmarks. Do not be vague.

Return ONLY this JSON:
{
  'verdict': '...',
  'biggestOpportunity': '...',
  'estimatedImpact': '...'
}`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const text = extractFirstTextBlock(response);
  const parsed = parseOverviewJson(text);
  if (parsed) {
    return {
      verdict: String(parsed.verdict ?? ""),
      diagnosis: String(parsed.diagnosis ?? ""),
      heroHeadlineNote: String(parsed.heroHeadlineNote ?? ""),
      biggestOpportunity: String(parsed.biggestOpportunity ?? ""),
      estimatedImpact: String(parsed.estimatedImpact ?? ""),
    };
  }

  return {
    verdict: "Structured rubric audit completed.",
    diagnosis: "",
    heroHeadlineNote: "",
    biggestOpportunity: "Address the highest-severity diagnostic findings first.",
    estimatedImpact: "Fixing the top issues could materially improve conversion.",
  };
}
