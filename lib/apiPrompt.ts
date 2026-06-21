const ALL_FIELDS = ["summary", "findings", "copy_rewrites", "growth_blueprint", "benchmark"];

const BRIEF_FINDING = `{
  "id": "finding_001",
  "title": "string (max 10 words)",
  "severity": "critical" | "high" | "medium" | "low",
  "dimension": "string",
  "explanation": "string (max 20 words, specific to visible page content)",
  "confidence": "high" | "medium" | "low"
}`;

const FULL_FINDING = `{
  "id": "finding_001",
  "title": "string (max 10 words)",
  "severity": "critical" | "high" | "medium" | "low",
  "dimension": "Conversion Architecture" | "Trust Signals" | "Message Clarity" | "Traffic Readiness" | "Technical Foundation" | "Objection Handling" | "Offer Clarity",
  "impact": "high" | "medium" | "low",
  "impact_estimate": "string (max 10 words, e.g. 8-15% conversion lift)",
  "explanation": "string (max 30 words; QUOTE the exact element — headline/CTA/testimonial/price — or cite the literal signal confirmed absent; never paraphrase or invent)",
  "fix_steps": ["string (max 20 words, specific to this page's content)", "string (max 20 words)", "string (max 20 words)"],
  "rewritten_copy": "string (max 25 words; a ready-to-paste replacement for the exact element named in explanation — drop-in copy only, no labels or advice)",
  "confidence": "high" | "medium" | "low",
  "fix_effort": "hours" | "days" | "weeks",
  "priority": number
}`;

export function buildApiPrompt(params: {
  fields: string[];
  findingLimit: number;
  findingDepth: "brief" | "full";
  siteType: string;
  pageCount: number;
}): { systemPrompt: string; responseSchema: string } {
  const { fields, findingLimit, findingDepth, siteType, pageCount } = params;
  const ef = fields.length === 0 ? ALL_FIELDS : fields;
  const wantsSummary = ef.includes("summary");
  const wantsFindings = ef.includes("findings");
  const wantsCopy = ef.includes("copy_rewrites");
  const wantsBlueprint = ef.includes("growth_blueprint");

  const pageDesc = pageCount === 1 ? "single page" : `${pageCount} pages`;
  const findingShape = findingDepth === "brief" ? BRIEF_FINDING : FULL_FINDING;

  const schemaLines: string[] = [
    `{`,
    `  "score": number,`,
    `  "verdict": "Poor" | "Needs Work" | "Fair" | "Good" | "Excellent",`,
    `  "page_type": "homepage" | "pricing" | "product" | "about" | "landing",`,
    `  "dimensions": {`,
    `    "conversion_architecture": number,`,
    `    "trust_signals": number,`,
    `    "message_clarity": number,`,
    `    "traffic_readiness": number,`,
    `    "technical_foundation": number,`,
    `    "objection_handling": number,`,
    `    "offer_clarity": number`,
    `  },`,
    `  "findings_summary": number,`,
  ];
  if (wantsSummary) schemaLines.push(`  "summary": "string (max 3 sentences)",`);
  if (wantsFindings) {
    schemaLines.push(`  "findings": [`);
    schemaLines.push(`    ${findingShape}`);
    schemaLines.push(`  ],`);
    schemaLines.push(`  "strengths": [`);
    schemaLines.push(`    {`);
    schemaLines.push(`      "check_id": "string (e.g. TRUST_001)",`);
    schemaLines.push(`      "label": "string (passLabel — max 6 words)",`);
    schemaLines.push(`      "observation": "string (max 20 words — cite specific page evidence)"`);
    schemaLines.push(`    }`);
    schemaLines.push(`  ],`);
  }
  if (wantsCopy) {
    schemaLines.push(`  "copy_rewrites": {`);
    schemaLines.push(`    "headline": "string (max 12 words)",`);
    schemaLines.push(`    "subheadline": "string (max 20 words)",`);
    schemaLines.push(`    "cta": "string (max 5 words)"`);
    schemaLines.push(`  },`);
  }
  if (wantsBlueprint) {
    schemaLines.push(`  "growth_blueprint": [`);
    schemaLines.push(`    {`);
    schemaLines.push(`      "priority": number,`);
    schemaLines.push(`      "action": "string (max 15 words)",`);
    schemaLines.push(`      "effort": "low" | "medium" | "high",`);
    schemaLines.push(`      "impact": "low" | "medium" | "high",`);
    schemaLines.push(`      "timeframe": "Week 1" | "Weeks 2-4" | "Month 2"`);
    schemaLines.push(`    }`);
    schemaLines.push(`  ]`);
  }
  schemaLines.push(`}`);
  const responseSchema = schemaLines.join("\n");

  const parts: string[] = [
    `You are a conversion intelligence analyst examining fully-rendered HTML from a ${siteType} site (${pageDesc}).`,
    ``,
    `STEP 1 — PAGE TYPE CLASSIFICATION:`,
    `Identify the page type from the HTML. Choose one: homepage, pricing, product, about, landing.`,
    `Set "page_type" in the response. Only evaluate checks whose pageType matches this page type or is "any".`,
    `Skip checks scoped to other page types (e.g. skip product-page checks when analyzing a homepage).`,
    ``,
    `STEP 2 — SITE TYPE CONTEXT:`,
    `This site has been detected as: ${siteType}.`,
    `Apply checks scoped to this site type plus all "universal" checks.`,
    `Skip checks marked for other site types (e.g. skip ecommerce-specific checks on a saas site).`,
    ``,
    `SCORING:`,
    `- score 0-100. FORBIDDEN: 10,15,20,25,30,35,40,45,50,55,60,62,65,70,75,80,85,90.`,
    `- verdict: Excellent (80+), Good (65-79), Fair (50-64), Needs Work (35-49), Poor (below 35).`,
    `- All 7 dimension scores 0-100, distinct, non-forbidden.`,
    ``,
    `DIMENSION EVALUATION:`,
    `- trust_signals: Score presence AND quality. For social proof, assess: are testimonials outcome-specific with named roles and companies (not generic praise)? Does social proof appear before the CTA? Are logos contextualized or purely decorative? Do case studies include measurable results? Weak proof quality lowers this score even when proof is present. Example finding: "Testimonials present but generic — no outcomes, numbers, or named roles visible. Generic praise does not convert as well as outcome-based proof."`,
    `- objection_handling: Score 0-100. Evaluate whether the page anticipates and neutralizes buyer doubt: risk reversal near CTA (guarantee, free trial, no credit card required); explicit positioning against competitors; FAQ addressing purchase hesitations not just product questions; ROI or value framing near pricing; effort or setup time signal ("live in X minutes"); ICP clarity — who it is and is not for; security, data handling, or compliance signals; third-party credibility (press, investors, accelerator badges, awards); exit path for not-ready visitors. Fire a finding when objections are unaddressed even if the product pitch is otherwise strong.`,
    `- offer_clarity: Score 0-100. Evaluate the offer as a complete unit: can a cold visitor understand what it does, who it is for, and what it costs in under 10 seconds? Is the primary differentiator explicitly stated rather than implied? Is the outcome concrete and verifiable ("cut review cycles by 40%") not abstract ("save time")? Is time to value communicated? Is there at least one specific verifiable claim (a number, a customer count, a named result)? Are headline, subheadline, and CTA consistent with each other and pointing toward the same outcome? Fire a finding when the offer is vague, generic, or internally inconsistent.`,
    ``,
    `OUTPUT RULES:`,
    `- Return ONLY valid JSON. No markdown. No preamble. Start with {.`,
    `- Every string field has a hard word limit — stay under it.`,
    `- Never fabricate. Only reference content literally visible in the HTML.`,
    ``,
    `EVIDENCE DISCIPLINE (a peak finding is drop-in specific — it names the exact element, quotes the evidence, gives an impact estimate, a plain-English fix, and a ready-to-paste rewrite):`,
    `- Every finding must QUOTE the exact on-page element it is about — the actual headline, CTA text, testimonial, or price — verbatim, OR cite the specific element confirmed absent. No paraphrase, no generic restatement of the check.`,
    `- explanation cites that quoted evidence. impact_estimate gives a concrete directional number (e.g. "8-15% conversion lift"), not "varies".`,
    `- fix_steps reference this page's real content and say what to change and to what. rewritten_copy is a literal drop-in replacement for the cited element — paste-ready, no "Option A", no commentary.`,
    `- If a finding cannot be grounded in a quoted string or a named absence, drop it rather than pad.`,
    `- NO INVENTED NUMBERS OR OFFERS: rewritten_copy and fix_steps must not add a statistic (%, $, count, "Nx", "N-day", "N+ customers") or an offer (free trial, money-back guarantee, discount, "no credit card required", "cancel anytime") that is not literally present in the HTML. Restate only numbers/offers the page actually shows; when none exists, use qualitative language ("trusted by leading teams", not "10,000+ teams"). impact_estimate is your analytical projection and may stay numeric — the page-facing rewritten_copy may not invent page claims.`,
  ];

  if (wantsFindings) {
    parts.push(``);
    parts.push(`FINDINGS (return max ${findingLimit}, sorted by priority ascending — priority 1 first):`);
    parts.push(`- id format: "finding_001", "finding_002", etc.`);
    parts.push(`- fix_effort: "hours" = under 4 hours dev work; "days" = 1–3 days; "weeks" = more than 3 days.`);
    parts.push(`- priority: 1-based integer rank. Assign 1 to the highest-leverage fix (greatest expected lift for least effort), then 2, 3, … with no ties. Sort the findings array by this rank.`);
    if (findingDepth === "full") {
      parts.push(`- fix_steps: exactly 3 items, each actionable and specific to this page's actual content.`);
      parts.push(`- rewritten_copy: ready-to-paste replacement text only — no labels, no "Option A".`);
    }
    parts.push(``);
    parts.push(`STRENGTHS (return top 5 genuinely excellent implementations, or empty array [] if none qualify):`);
    parts.push(`A strength entry is only valid when ALL 4 criteria are met:`);
    parts.push(`  1. The check has a defined passLabel — only checks with explicit passLabels in the rubric are eligible.`);
    parts.push(`  2. The implementation is genuinely above average for its category — not merely present.`);
    parts.push(`  3. The specific element is correctly placed (e.g. proof before CTA, guarantee near CTA) — not just anywhere on the page.`);
    parts.push(`  4. You can cite specific page evidence — quote the actual copy or name the precise element.`);
    parts.push(`Return every check that genuinely qualifies as a strength — whether that is 1, 2, 5, or zero. Do not suppress real strengths because the count is low. Do not pad to reach any minimum. If zero checks genuinely qualify under the four criteria, return an empty array.`);
  }

  if (wantsSummary) {
    parts.push(``);
    parts.push(`SUMMARY: Exactly 3 sentences. Sentence 1: site classification and primary conversion goal. Sentence 2: dominant suppression pattern. Sentence 3: highest-leverage resolution.`);
  }

  parts.push(``);
  parts.push(`JSON SCHEMA TO RETURN:`);
  parts.push(responseSchema);

  return { systemPrompt: parts.join("\n"), responseSchema };
}
