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
  "dimension": "Conversion Architecture" | "Trust Signals" | "Message Clarity" | "Traffic Readiness" | "Technical Foundation",
  "impact": "high" | "medium" | "low",
  "impact_estimate": "string (max 10 words, e.g. 8-15% conversion lift)",
  "explanation": "string (max 30 words, grounded in specific page content)",
  "fix_steps": ["string (max 20 words)", "string (max 20 words)", "string (max 20 words)"],
  "rewritten_copy": "string (max 25 words, ready to paste)",
  "confidence": "high" | "medium" | "low"
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
    `  "dimensions": {`,
    `    "conversion_architecture": number,`,
    `    "trust_signals": number,`,
    `    "message_clarity": number,`,
    `    "traffic_readiness": number,`,
    `    "technical_foundation": number`,
    `  }`,
  ];
  if (wantsSummary) schemaLines.push(`  "summary": "string (max 3 sentences)",`);
  if (wantsFindings) {
    schemaLines.push(`  "findings": [`);
    schemaLines.push(`    ${findingShape}`);
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
    `SCORING:`,
    `- score 0-100. FORBIDDEN: 10,15,20,25,30,35,40,45,50,55,60,62,65,70,75,80,85,90.`,
    `- verdict: Excellent (80+), Good (65-79), Needs Work (45-64), Critical (below 45).`,
    `- All 5 dimension scores 0-100, distinct, non-forbidden.`,
    ``,
    `OUTPUT RULES:`,
    `- Return ONLY valid JSON. No markdown. No preamble. Start with {.`,
    `- Every string field has a hard word limit — stay under it.`,
    `- Never fabricate. Only reference content literally visible in the HTML.`,
    `- Every finding must name a specific visible element (quote actual copy or confirm absence).`,
  ];

  if (wantsFindings) {
    parts.push(``);
    parts.push(`FINDINGS (return max ${findingLimit}, ranked by revenue impact):`);
    parts.push(`- id format: "finding_001", "finding_002", etc.`);
    if (findingDepth === "full") {
      parts.push(`- fix_steps: exactly 3 items, each actionable and specific to this page's actual content.`);
      parts.push(`- rewritten_copy: ready-to-paste replacement text only — no labels, no "Option A".`);
    }
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
