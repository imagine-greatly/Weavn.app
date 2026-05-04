import Anthropic from "@anthropic-ai/sdk";
import type { ParsedPage } from "./parser";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface CategoryScores {
  traffic: number;
  conversion: number;
  clarity: number;
  seo: number;
  ux: number;
}

export interface Leak {
  title: string;
  description: string;
  recommendation: string;
}

export interface HeroRewrite {
  headline: string;
  subheadline: string;
  cta: string;
}

export interface AnalysisResult {
  healthScore: number;
  categoryScores: CategoryScores;
  topLeak: Leak & { evidence: string };
  leaks: Leak[];
  heroRewrite: HeroRewrite;
  analyzedAt: string;
  domain: string;
  h1?: string;
  metaDescription?: string;
}

export async function analyzeWebsite(
  page: ParsedPage,
  domain: string
): Promise<AnalysisResult> {
  const pageData = {
    url: page.url,
    title: page.title,
    metaDescription: page.metaDescription,
    headings: page.headings,
    buttons: page.buttons.slice(0, 15),
    paragraphs: page.paragraphs.slice(0, 12),
    wordCount: page.wordCount,
  };

  const prompt = `You are a senior revenue analyst and website growth strategist, not an SEO tool. When identifying issues, explain them through visitor behavior and revenue impact, not technical metrics alone.

Never say: "keyword density is low"
Always say: "visitors are searching for their pain, not your product name — your headline speaks the wrong language"

Never say: "CTA is generic"
Always say: "your CTA asks for commitment before earning trust — the visitor isn't ready"

Every finding must answer three questions:
1. What is the human behavior this affects?
2. What is the visitor thinking/feeling at this moment?
3. What specific change fixes the revenue disconnect?

Cite named revenue mechanisms where relevant: Cialdini's 6 principles, loss aversion, cognitive load theory, the 8-second rule, benefit vs feature framing.

Analyze the website data below and identify problems ("growth leaks") that may hurt traffic, engagement, or conversions.

Focus on:
- messaging clarity: Is the value proposition immediately obvious? Is the language compelling?
- hero headline strength: Is the main headline specific, benefit-driven, and memorable?
- CTA effectiveness: Are calls-to-action clear, compelling, and well-placed?
- trust signals: Social proof, testimonials, credentials, security badges, guarantees
- SEO signals: Title tag quality, meta description, H1 usage, keyword relevance
- UX readability: Content structure, scannability, overwhelming or thin content

WEBSITE DATA:
${JSON.stringify(pageData, null, 2)}

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "healthScore": <integer 0-100>,
  "categoryScores": {
    "traffic": <integer 0-100>,
    "conversion": <integer 0-100>,
    "clarity": <integer 0-100>,
    "seo": <integer 0-100>,
    "ux": <integer 0-100>
  },
  "topLeak": {
    "title": "<short problem title>",
    "description": "<2-3 sentence description of the problem and its business impact>",
    "evidence": "<specific quote or observation from the website data that proves this problem>",
    "recommendation": "<specific, actionable fix with an example if applicable>"
  },
  "leaks": [
    {
      "title": "<short problem title>",
      "description": "<1-2 sentence description>",
      "recommendation": "<specific actionable fix>"
    }
  ],
  "heroRewrite": {
    "headline": "<rewritten hero headline — specific, benefit-driven, under 12 words>",
    "subheadline": "<rewritten subheadline — 1 sentence expanding on the headline's promise>",
    "cta": "<rewritten primary CTA button text — action-oriented, 2-5 words>"
  }
}

Rules:
- leaks array must contain 3 to 6 items (not including topLeak)
- healthScore is an average reflection of all category scores with extra weight on conversion and clarity
- Be specific and direct — avoid vague advice like "improve your content"
- heroRewrite must be meaningfully better than what exists, not just a paraphrase
- Write all titles, descriptions, and recommendations in the same voice as above (human behavior, visitor state of mind, revenue disconnect). Never use technical or SEO-jargon framing.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("AI returned no text content.");
  }

  // Strip any accidental markdown fences
  const raw = textContent.text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  let result: Omit<AnalysisResult, "analyzedAt" | "domain">;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // Validate and clamp scores
  result.healthScore = clamp(result.healthScore, 0, 100);
  for (const key of Object.keys(result.categoryScores) as Array<keyof CategoryScores>) {
    result.categoryScores[key] = clamp(result.categoryScores[key], 0, 100);
  }

  const h1 = page.headings.find((h) => h.level === "H1")?.text ?? "";

  return {
    ...result,
    domain,
    h1,
    metaDescription: page.metaDescription,
    analyzedAt: new Date().toISOString(),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
