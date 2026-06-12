"use client";
import { useState } from "react";
import DocsLayout from "@/app/docs/_components/DocsLayout";

const SM = "'Space Mono', monospace";
const SG = "'Space Grotesk', sans-serif";
const CYAN = "#00C8FF";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(240,244,255,0.4)";
const TEXT = "#F0F4FF";

const EXAMPLES = [
  {
    id: "cold-email",
    title: "Cold email enrichment",
    lang: "Node.js",
    desc: "Scan a prospect's site, extract score + top 3 findings, and format for personalized outreach.",
    code: `// cold-email-enrichment.js
const WEBDOC_API_KEY = process.env.WEBDOC_API_KEY

async function enrichProspect(domain) {
  const res = await fetch('https://api.weavn.app/v1/scan', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${WEBDOC_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: \`https://\${domain}\` })
  })
  const data = await res.json()

  const top3 = data.findings.slice(0, 3).map(f => f.title)
  const score = data.score
  const verdict = data.verdict

  return {
    domain,
    score,
    verdict,
    top_issues: top3,
    personalisation: \`I noticed your site scored \${score}/100 on conversion \` +
      \`architecture. Top issue: "\${top3[0]}". \` +
      \`Happy to share the full report.\`
  }
}

// Usage
const prospect = await enrichProspect('acmecorp.com')
console.log(prospect.personalisation)`,
  },
  {
    id: "ai-agent",
    title: "AI agent tool call",
    lang: "Claude tool use",
    desc: "Define scan as a Claude tool. The model calls it autonomously when given a domain to analyze.",
    code: `// claude-tool-use.js
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const tools = [{
  name: 'scan_website',
  description: 'Run a full conversion audit on a website URL. Returns score, verdict, and ranked findings.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The full URL to scan including https://'
      }
    },
    required: ['url']
  }
}]

async function handleToolCall(toolName, toolInput) {
  if (toolName === 'scan_website') {
    const res = await fetch('https://api.weavn.app/v1/scan', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.WEBDOC_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: toolInput.url })
    })
    return await res.json()
  }
}

// Agent loop
const response = await client.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 1024,
  tools,
  messages: [{ role: 'user', content: 'Audit https://example.com and summarize the top 3 issues.' }]
})

if (response.stop_reason === 'tool_use') {
  const toolUse = response.content.find(b => b.type === 'tool_use')
  const result = await handleToolCall(toolUse.name, toolUse.input)
  console.log(\`Score: \${result.score} — \${result.findings[0].title}\`)
}`,
  },
  {
    id: "n8n",
    title: "n8n workflow",
    lang: "n8n",
    desc: "HTTP Request node configuration for triggering a scan and mapping response fields.",
    code: `// n8n HTTP Request node configuration:
{
  "method": "POST",
  "url": "https://api.weavn.app/v1/scan",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "Authorization",
    "value": "Bearer {{ $env.WEBDOC_API_KEY }}"
  },
  "body": {
    "url": "{{ $json.website_url }}"
  },
  "responseFormat": "json"
}

// Downstream node — map fields:
// Score:    {{ $json.score }}
// Verdict:  {{ $json.verdict }}
// Finding:  {{ $json.findings[0].title }}
// Summary:  {{ $json.summary }}

// Example: update CRM record with score
// Field mapping for CRM Update node:
{
  "webdoc_score":   "{{ $json.score }}",
  "webdoc_verdict": "{{ $json.verdict }}",
  "webdoc_issue_1": "{{ $json.findings[0].title }}",
  "webdoc_issue_2": "{{ $json.findings[1].title }}",
  "webdoc_scanned": "{{ $json.scanned_at }}"
}`,
  },
  {
    id: "bulk",
    title: "Bulk scanning",
    lang: "Node.js",
    desc: "Scan multiple URLs concurrently with Promise.allSettled to handle partial failures gracefully.",
    code: `// bulk-scan.js
const WEBDOC_API_KEY = process.env.WEBDOC_API_KEY
const CONCURRENCY = 3 // stay under rate limits

async function scanUrl(url) {
  const res = await fetch('https://api.weavn.app/v1/scan', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${WEBDOC_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  })
  if (!res.ok) throw new Error(\`HTTP \${res.status} for \${url}\`)
  return res.json()
}

async function bulkScan(urls) {
  const results = []

  // Process in batches to respect concurrency limit
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(batch.map(scanUrl))

    for (let j = 0; j < settled.length; j++) {
      const outcome = settled[j]
      if (outcome.status === 'fulfilled') {
        results.push({ url: batch[j], success: true, data: outcome.value })
      } else {
        results.push({ url: batch[j], success: false, error: outcome.reason.message })
        console.warn(\`Failed: \${batch[j]} — \${outcome.reason.message}\`)
      }
    }
  }

  return results
}

// Usage
const urls = [
  'https://example.com',
  'https://acmecorp.com',
  'https://mybusiness.io',
]

const results = await bulkScan(urls)
const succeeded = results.filter(r => r.success)
const failed = results.filter(r => !r.success)

console.log(\`Completed: \${succeeded.length}/\${urls.length}\`)
succeeded.forEach(r => console.log(\`\${r.url}: \${r.data.score}/100 — \${r.data.verdict}\`))`,
  },
];

export default function ExamplesPage() {
  const [active, setActive] = useState("cold-email");
  const example = EXAMPLES.find(e => e.id === active)!;

  return (
    <DocsLayout activeId="javascript">
      <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 12 }}>CODE EXAMPLES</p>
      <h1 style={{ fontFamily: SG, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: TEXT, letterSpacing: "-1.2px", marginBottom: 40 }}>
        Complete examples
      </h1>

      {/* Tab selector */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, marginBottom: 40 }}>
        {EXAMPLES.map(ex => (
          <button
            key={ex.id}
            onClick={() => setActive(ex.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: active === ex.id ? `2px solid ${CYAN}` : "2px solid transparent",
              padding: "10px 20px",
              fontFamily: SM,
              fontSize: 12,
              color: active === ex.id ? CYAN : MUTED,
              cursor: "pointer",
              marginBottom: -1,
              whiteSpace: "nowrap",
            }}
          >
            {ex.title}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontFamily: SM, fontSize: 11, color: MUTED, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 3, padding: "3px 10px" }}>
          {example.lang}
        </span>
      </div>
      <p style={{ fontFamily: SG, fontSize: 15, color: MUTED, lineHeight: 1.7, marginBottom: 24 }}>{example.desc}</p>
      <pre style={{
        background: "rgba(0,0,0,0.6)",
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${CYAN}`,
        borderRadius: 4,
        padding: "24px 28px",
        fontFamily: SM,
        fontSize: 12,
        color: TEXT,
        overflowX: "auto",
        lineHeight: 1.75,
        margin: 0,
      }}>
        {example.code}
      </pre>
    </DocsLayout>
  );
}
