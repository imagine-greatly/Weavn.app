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
  "explanation": "string (max 30 words, grounded in specific page content)",
  "fix_steps": ["string (max 20 words)", "string (max 20 words)", "string (max 20 words)"],
  "rewritten_copy": "string (max 25 words, ready to paste)",
  "confidence": "high" | "medium" | "low",
  "fix_effort": "hours" | "days" | "weeks",
  "impact_tier": "high" | "medium" | "low",
  "priority_rank": "P1" | "P2" | "P3"
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
    `  "verdict": "Excellent" | "Good" | "Needs Work" | "Critical",`,
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
    `- verdict: Excellent (80+), Good (65-79), Needs Work (45-64), Critical (below 45).`,
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
    `- Every finding must name a specific visible element (quote actual copy or confirm absence).`,
  ];

  if (wantsFindings) {
    parts.push(``);
    parts.push(`FINDINGS (return max ${findingLimit}, sorted P1 first, then P2, then P3):`);
    parts.push(`- id format: "finding_001", "finding_002", etc.`);
    parts.push(`- fix_effort: "hours" = under 4 hours dev work; "days" = 1–3 days; "weeks" = more than 3 days.`);
    parts.push(`- impact_tier: "high" = 15%+ expected lift; "medium" = 5–15%; "low" = under 5%.`);
    parts.push(`- priority_rank: P1 = high impact_tier + hours fix_effort; P2 = high + days OR medium + hours; P3 = everything else.`);
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
