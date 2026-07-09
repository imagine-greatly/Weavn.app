'use client'

import { useState } from 'react'
import { CodeBlock } from '@/components/ui/CodeBlock'

const BG       = 'transparent'
const BG_R     = '#06090F'
const BG_S     = '#0A0E18'
const BG_I     = '#0D1420'
const BD       = 'rgba(255,255,255,0.06)'
const WD_BLUE  = '#6F9BC6'
const GREEN    = '#00C48C'
const T1       = '#E6E9EE'
const T2       = '#9398A8'
const T3       = '#6E7587'
const MONO     = "'IBM Plex Mono', monospace"
const DISP     = "'Space Grotesk', sans-serif"
const ACCENT   = '#9D8CFF'  // purple — rationed to active nav / tab affordances

type Lang = 'curl' | 'node' | 'python'

const NAV_GROUPS: { label: string; items: { id: string; label: string }[] }[] = [
  { label: 'OVERVIEW', items: [
    { id: 'introduction',   label: 'Introduction'   },
    { id: 'authentication', label: 'Authentication' },
    { id: 'errors',         label: 'Errors'         },
    { id: 'rate-limits',    label: 'Rate limits'    },
  ]},
  { label: 'ENDPOINTS', items: [
    { id: 'post-scan',          label: 'POST /scan'           },
    { id: 'post-scan-batch',    label: 'POST /scan/batch'     },
    { id: 'get-scans',          label: 'GET /scans'           },
    { id: 'get-scans-id',       label: 'GET /scans/{id}'      },
    { id: 'post-webhooks',      label: 'POST /webhooks'       },
    { id: 'get-webhooks',       label: 'GET /webhooks'        },
    { id: 'delete-webhooks-id', label: 'DELETE /webhooks'   },
  ]},
  { label: 'WEBHOOKS', items: [
    { id: 'webhooks-overview', label: 'Overview'  },
    { id: 'webhook-events',    label: 'Events'    },
    { id: 'webhook-delivery',  label: 'Delivery'  },
    { id: 'webhook-retries',   label: 'Retries'   },
  ]},
  { label: 'RESPONSE SCHEMA', items: [
    { id: 'score-schema',                label: 'Score'                },
    { id: 'page-type-schema',            label: 'Page type'            },
    { id: 'score-profile-schema',        label: 'Score profile'        },
    { id: 'findings-schema',             label: 'Findings'             },
    { id: 'findings-summary-schema',     label: 'Findings summary'     },
    { id: 'benchmark-schema',            label: 'Benchmark'            },
    { id: 'strengths-schema',            label: 'Strengths'            },
    { id: 'copy-schema',                 label: 'Rewritten copy'       },
    { id: 'dimensions-schema',           label: 'Dimensions'           },
    { id: 'dimension-benchmarks-schema', label: 'Dimension benchmarks' },
    { id: 'metadata-schema',             label: 'Metadata'             },
  ]},
]

const EX: Record<string, Record<Lang, string>> = {
  introduction: {
    curl: `curl -X POST https://weavn.app/api/v1/scan \\
  -H "Authorization: Bearer weavn_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yoursite.com"}'`,
    node: `const res = await fetch('https://weavn.app/api/v1/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer weavn_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: 'https://yoursite.com' }),
})
const data = await res.json()`,
    python: `import requests

res = requests.post(
  'https://weavn.app/api/v1/scan',
  headers={'Authorization': 'Bearer weavn_live_••••'},
  json={'url': 'https://yoursite.com'}
)
data = res.json()`,
  },
  authentication: {
    curl: `# Include in every request
curl -H "Authorization: Bearer weavn_live_••••" \\
  https://weavn.app/api/v1/scans`,
    node: `const headers = {
  'Authorization': 'Bearer weavn_live_••••',
  'Content-Type': 'application/json',
}`,
    python: `headers = {
  'Authorization': 'Bearer weavn_live_••••',
  'Content-Type': 'application/json',
}`,
  },
  errors: {
    curl: `# Error response shape
{
  "error": {
    "code": "AUTH_INVALID",
    "message": "Invalid API key",
    "status": 401
  }
}`,
    node: `const res = await fetch(url, { headers })
if (!res.ok) {
  const { error } = await res.json()
  // error.code === 'AUTH_INVALID'
}`,
    python: `res = requests.post(url, headers=headers, json=body)
if not res.ok:
    err = res.json()['error']
    print(err['code'], err['message'])`,
  },
  'rate-limits': {
    curl: `# Rate-limit headers on every response (monthly scan budget)
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 993
X-RateLimit-Reset: 1717200000
X-RateLimit-Plan: dev

# 429 — per-minute request limit exceeded.
# Retry-After header (seconds) + standard error envelope.
Retry-After: 12
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded (60 requests/min). Retry in 12s.",
    "status": 429
  }
}`,
    node: `if (res.status === 429) {
  const retry = res.headers.get('Retry-After')
  await new Promise(r => setTimeout(r, Number(retry) * 1000))
}`,
    python: `if res.status_code == 429:
    retry = int(res.headers.get('Retry-After', 2))
    time.sleep(retry)`,
  },
  'post-scan': {
    curl: `curl -X POST https://weavn.app/api/v1/scan \\
  -H "Authorization: Bearer weavn_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yoursite.com",
    "fields": ["score", "findings", "copy_rewrites"],
    "finding_depth": "full",
    "finding_limit": 10,
    "async": false,
    "pages": ["/pricing", "/about"]
  }'`,
    node: `const res = await fetch('https://weavn.app/api/v1/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer weavn_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://yoursite.com',
    fields: ['score', 'findings', 'copy_rewrites'],
    finding_depth: 'full',
    finding_limit: 10,
    pages: ['/pricing', '/about'],
  }),
})
const { scan_id, score, findings } = await res.json()`,
    python: `import requests

res = requests.post(
  'https://weavn.app/api/v1/scan',
  headers={'Authorization': 'Bearer weavn_live_••••'},
  json={
    'url': 'https://yoursite.com',
    'fields': ['score', 'findings', 'copy_rewrites'],
    'finding_depth': 'full',
    'finding_limit': 10,
    'pages': ['/pricing', '/about'],
  }
)
data = res.json()`,
  },
  'post-scan-batch': {
    curl: `# async: true → 202 with batch_id, scan_ids, poll_urls.
# Register a webhook (POST /webhooks) to receive each result,
# or poll the returned poll_urls. Omit async for a sync
# response: { results, summary }.
curl -X POST https://weavn.app/api/v1/scan/batch \\
  -H "Authorization: Bearer weavn_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": [
      "https://site-a.com",
      "https://site-b.com"
    ],
    "async": true
  }'`,
    node: `const res = await fetch('https://weavn.app/api/v1/scan/batch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer weavn_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    urls: ['https://site-a.com', 'https://site-b.com'],
    async: true,
  }),
})
// async → 202 { batch_id, scan_ids, poll_urls }
const { batch_id, scan_ids, poll_urls } = await res.json()`,
    python: `res = requests.post(
  'https://weavn.app/api/v1/scan/batch',
  headers={'Authorization': 'Bearer weavn_live_••••'},
  json={
    'urls': ['https://site-a.com', 'https://site-b.com'],
    'async': True,
  }
)
data = res.json()
print(data['batch_id'], data['scan_ids'])`,
  },
  'get-scans': {
    curl: `# List recent scans (most recent first)
curl "https://weavn.app/api/v1/scans?limit=20" \\
  -H "Authorization: Bearer weavn_live_••••"

# Fetch the next page with next_cursor from the previous response
curl "https://weavn.app/api/v1/scans?limit=20&cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0wNi0xNFQ..." \\
  -H "Authorization: Bearer weavn_live_••••"`,
    node: `const res = await fetch(
  'https://weavn.app/api/v1/scans?limit=20',
  { headers: { 'Authorization': 'Bearer weavn_live_••••' } }
)
const { scans, next_cursor, has_more } = await res.json()`,
    python: `res = requests.get(
  'https://weavn.app/api/v1/scans',
  headers={'Authorization': 'Bearer weavn_live_••••'},
  params={'limit': 20}
)
data = res.json()`,
  },
  'get-scans-id': {
    curl: `curl "https://weavn.app/api/v1/scans/sc_3f9a2c7e8b1d4f60" \\
  -H "Authorization: Bearer weavn_live_••••"`,
    node: `const scanId = 'sc_3f9a2c7e8b1d4f60'
const res = await fetch(
  \`https://weavn.app/api/v1/scans/\${scanId}\`,
  { headers: { 'Authorization': 'Bearer weavn_live_••••' } }
)
const scan = await res.json()`,
    python: `scan_id = 'sc_3f9a2c7e8b1d4f60'
res = requests.get(
  f'https://weavn.app/api/v1/scans/{scan_id}',
  headers={'Authorization': 'Bearer weavn_live_••••'}
)
scan = res.json()`,
  },
  'post-webhooks': {
    curl: `curl -X POST https://weavn.app/api/v1/webhooks \\
  -H "Authorization: Bearer weavn_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/weavn",
    "events": ["scan.completed", "scan.failed"]
  }'`,
    node: `const res = await fetch('https://weavn.app/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer weavn_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://yourapp.com/webhooks/weavn',
    events: ['scan.completed', 'scan.failed'],
  }),
})
// 201 → { id, url, secret, created_at } — secret is shown only here
const { id, secret } = await res.json()`,
    python: `res = requests.post(
  'https://weavn.app/api/v1/webhooks',
  headers={'Authorization': 'Bearer weavn_live_••••'},
  json={
    'url': 'https://yourapp.com/webhooks/weavn',
    'events': ['scan.completed', 'scan.failed'],
  }
)
data = res.json()  # { id, url, secret, created_at }
print(data['id'], data['secret'])`,
  },
  'get-webhooks': {
    curl: `curl "https://weavn.app/api/v1/webhooks" \\
  -H "Authorization: Bearer weavn_live_••••"`,
    node: `const res = await fetch(
  'https://weavn.app/api/v1/webhooks',
  { headers: { 'Authorization': 'Bearer weavn_live_••••' } }
)
const { webhooks } = await res.json()`,
    python: `res = requests.get(
  'https://weavn.app/api/v1/webhooks',
  headers={'Authorization': 'Bearer weavn_live_••••'}
)
data = res.json()`,
  },
  'delete-webhooks-id': {
    curl: `curl -X DELETE https://weavn.app/api/v1/webhooks \\
  -H "Authorization: Bearer weavn_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "b1e4c9a2-7f3d-4a10-9c6e-2f8b1d5a0e33"}'`,
    node: `await fetch('https://weavn.app/api/v1/webhooks', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer weavn_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ id: 'b1e4c9a2-7f3d-4a10-9c6e-2f8b1d5a0e33' }),
})
// → { deleted: true }`,
    python: `requests.delete(
  'https://weavn.app/api/v1/webhooks',
  headers={'Authorization': 'Bearer weavn_live_••••'},
  json={'id': 'b1e4c9a2-7f3d-4a10-9c6e-2f8b1d5a0e33'}
)`,
  },
  'webhooks-overview': {
    curl: `# Webhook payload POSTed to your registered endpoint
{
  "event": "scan.completed",
  "scan_id": "sc_3f9a2c7e8b1d4f60",
  "url": "https://yoursite.com",
  "score": 61,
  "data": { "domain": "yoursite.com", "verdict": "Fair" }
}`,
    node: `app.post('/webhooks/weavn', (req, res) => {
  const { event, scan_id, score } = req.body
  if (event === 'scan.completed') {
    console.log(scan_id, score)
  }
  res.status(200).send('ok')
})`,
    python: `@app.route('/webhooks/weavn', methods=['POST'])
def handle_webhook():
    payload = request.get_json()
    if payload['event'] == 'scan.completed':
        print(payload['scan_id'], payload['score'])
    return 'ok', 200`,
  },
  'webhook-events': {
    curl: `# scan.completed
{
  "event": "scan.completed",
  "scan_id": "sc_3f9a2c7e8b1d4f60",
  "url": "https://yoursite.com",
  "score": 61,
  "data": { "domain": "yoursite.com", "verdict": "Fair" }
}

# scan.failed
{
  "event": "scan.failed",
  "scan_id": "sc_5b1d4f60a7c3e9f2",
  "url": "https://yoursite.com",
  "score": null,
  "data": { "domain": "yoursite.com", "blocked": true, "code": "BOT_BLOCKED" }
}`,
    node: `switch (event.event) {
  case 'scan.completed':
    await saveReport(event)
    break
  case 'scan.failed':
    await notifyTeam(event.data)
    break
}`,
    python: `handlers = {
    'scan.completed': save_report,
    'scan.failed': notify_team,
}
handler = handlers.get(payload['event'])
if handler:
    handler(payload)`,
  },
  'webhook-delivery': {
    curl: `# Signature header on every delivery
X-Weavn-Signature: <HMAC-SHA256 hex of raw body>
Content-Type: application/json`,
    node: `import crypto from 'crypto'

function verify(payload: string, sig: string, secret: string) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(sig), Buffer.from(expected)
  )
}`,
    python: `import hmac, hashlib

def verify(payload, sig, secret):
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(sig, expected)`,
  },
  'webhook-retries': {
    curl: `# Retry schedule (3 attempts on failure)
# Attempt 1: immediate
# Attempt 2: 5 minutes after failure
# Attempt 3: 30 minutes after failure
# Each attempt has a 10-second timeout
# After 3 failures — marked failed, no further retries`,
    node: `// Respond 200 immediately, process async
app.post('/webhooks/weavn', async (req, res) => {
  res.status(200).send('ok')
  await processAsync(req.body)
})`,
    python: `@app.route('/webhooks/weavn', methods=['POST'])
def handle_webhook():
    payload = request.get_json()
    queue.enqueue(process_webhook, payload)
    return 'ok', 200`,
  },
  'score-schema': {
    curl: `{
  "scan_id": "sc_3f9a2c7e8b1d4f60",
  "score": 61,
  "verdict": "Fair",
  "benchmark": {
    "industry_average": 54,
    "industry_percentile": 63,
    "top_10_percent_score": 78,
    "sample_size": 2847
  }
}`,
    node: `const { score, benchmark } = await res.json()
console.log(score)                          // 61
console.log(benchmark.industry_percentile)  // 63`,
    python: `data = res.json()
print(data['score'])                            # 61
print(data['benchmark']['industry_percentile']) # 63`,
  },
  'page-type-schema': {
    curl: `{
  "page_type": "homepage"
}`,
    node: `const { page_type } = await res.json()
console.log(page_type) // "homepage"`,
    python: `data = res.json()
print(data['page_type'])  # "homepage"`,
  },
  'score-profile-schema': {
    curl: `{
  "score_profile": {
    "weighted_score": 61,
    "profile_used": "saas_medium",
    "weights": {
      "conversion_architecture": 0.22,
      "trust_signals": 0.15,
      "message_clarity": 0.18,
      "traffic_readiness": 0.10,
      "technical_foundation": 0.08,
      "objection_handling": 0.12,
      "offer_clarity": 0.15
    }
  }
}`,
    node: `const { score_profile } = await res.json()
console.log(score_profile.weighted_score) // 61
console.log(score_profile.profile_used)   // "saas_medium"`,
    python: `sp = res.json()['score_profile']
print(sp['weighted_score'])  # 61
print(sp['profile_used'])    # "saas_medium"`,
  },
  'findings-schema': {
    curl: `{
  "findings": [{
    "id": "finding_001",
    "title": "Hero headline is feature-led, not outcome-led",
    "severity": "critical",
    "dimension": "Conversion Architecture",
    "impact": "high",
    "impact_estimate": "12-18% conversion lift",
    "explanation": "Headline names the feature set, not the customer outcome.",
    "fix_steps": [
      "Lead with the outcome the visitor gets",
      "Name the specific audience",
      "Cut the feature list to one supporting line"
    ],
    "rewritten_copy": "Ship every project on time — wherever your team works.",
    "confidence": "high",
    "fix_effort": "hours",
    "priority": 1
  }]
}`,
    node: `const { findings } = await res.json()
findings.forEach(f => {
  console.log(\`[\${f.severity}] \${f.title}\`)
  console.log(\`P\${f.priority} | \${f.impact_estimate} | \${f.fix_effort}\`)
})`,
    python: `for f in data['findings']:
    print(f"[{f['severity']}] {f['title']}")
    print(f"P{f['priority']} | {f['impact_estimate']} | {f['fix_effort']}")`,
  },
  'findings-summary-schema': {
    curl: `{
  "findings_summary": 23
}`,
    node: `const { findings_summary } = await res.json()
console.log(\`Total findings: \${findings_summary}\`)`,
    python: `print(f"Total findings: {data['findings_summary']}")`,
  },
  'benchmark-schema': {
    curl: `{
  "benchmark": {
    "industry_average": 54,
    "industry_percentile": 63,
    "top_10_percent_score": 78,
    "sample_size": 2847
  }
}`,
    node: `const { benchmark } = await res.json()
const { industry_average, industry_percentile, top_10_percent_score } = benchmark`,
    python: `b = data['benchmark']
print(f"Avg: {b['industry_average']}, Top 10%: {b['top_10_percent_score']}")`,
  },
  'strengths-schema': {
    curl: `{
  "strengths": [{
    "check_id": "social_proof_logos",
    "label": "Customer logo wall",
    "observation": "Displays 12 recognizable brand logos above the fold with clear visual hierarchy."
  }]
}`,
    node: `const { strengths } = await res.json()
strengths.forEach(s => {
  console.log(s.label)
  console.log(s.observation)
})`,
    python: `for s in data['strengths']:
    print(s['label'])
    print(s['observation'])`,
  },
  'copy-schema': {
    curl: `{
  "copy_rewrites": {
    "headline": "Ship every project on time — wherever your team works",
    "subheadline": "The project workspace built for distributed teams.",
    "cta": "Start free"
  }
}`,
    node: `const { copy_rewrites } = await res.json()
h1.textContent = copy_rewrites.headline
cta.textContent = copy_rewrites.cta`,
    python: `copy = data['copy_rewrites']
print(copy['headline'])
print(copy['cta'])`,
  },
  'dimensions-schema': {
    curl: `{
  "dimensions": {
    "conversion_architecture": 58,
    "trust_signals":           79,
    "message_clarity":         71,
    "traffic_readiness":       44,
    "technical_foundation":    65,
    "objection_handling":      41,
    "offer_clarity":           53
  }
}`,
    node: `const { dimensions } = await res.json()
Object.entries(dimensions).forEach(([dim, score]) => {
  console.log(\`\${dim}: \${score}\`)
})`,
    python: `for dim, score in data['dimensions'].items():
    print(f"{dim}: {score}")`,
  },
  'dimension-benchmarks-schema': {
    curl: `{
  "dimension_benchmarks": {
    "conversion_architecture": {
      "score": 58,
      "average": 52,
      "percentile_label": "Industry average",
      "p10": 28,
      "p90": 81
    }
  }
}`,
    node: `const { dimension_benchmarks } = await res.json()
Object.entries(dimension_benchmarks).forEach(([dim, val]) => {
  console.log(\`\${dim}: \${val.percentile_label}\`)
})`,
    python: `for dim, val in data['dimension_benchmarks'].items():
    print(dim, val['percentile_label'])`,
  },
  'metadata-schema': {
    curl: `{
  "metadata": {
    "word_count": 1240,
    "cta_count": 3,
    "tech_stack": ["Next.js", "Vercel"]
  },
  "scan_meta": {
    "complexity": "medium",
    "duration_ms": 87340,
    "cached": false,
    "finding_limit": 10,
    "finding_depth": "full",
    "site_type": "saas",
    "cost_usd": 0.15,
    "tokens_used": 18240
  }
}`,
    node: `const { metadata, scan_meta } = await res.json()
console.log(metadata.tech_stack)   // ["Next.js", "Vercel"]
console.log(scan_meta.duration_ms) // 87340`,
    python: `m = data['metadata']
sm = data['scan_meta']
print(m['word_count'], m['cta_count'])
print(f"Took {sm['duration_ms']}ms, cost {sm['cost_usd']}")`,
  },
}

// ── helpers ────────────────────────────────────────────────────────────────

interface PR { param: string; type: string; required: string; description: string }
function ParamTable({ rows }: { rows: PR[] }) {
  const cols = '150px 72px 88px 1fr'
  const hdrs = ['PARAMETER', 'TYPE', 'REQUIRED', 'DESCRIPTION']
  return (
    <div style={{ border: `1px solid ${BD}`, background: BG_R, marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '8px 16px', borderBottom: `1px solid ${BD}` }}>
        {hdrs.map(h => <span key={h} style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, padding: '10px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${BD}` : 'none' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: WD_BLUE }}>{r.param}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T3 }}>{r.type}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: r.required === 'required' ? '#F5A623' : T3 }}>{r.required}</span>
          <span style={{ fontFamily: DISP, fontSize: 12, color: T2 }}>{r.description}</span>
        </div>
      ))}
    </div>
  )
}

interface QR { param: string; type: string; description: string }
function QueryTable({ rows }: { rows: QR[] }) {
  const cols = '120px 80px 1fr'
  const hdrs = ['PARAMETER', 'TYPE', 'DESCRIPTION']
  return (
    <div style={{ border: `1px solid ${BD}`, background: BG_R, marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '8px 16px', borderBottom: `1px solid ${BD}` }}>
        {hdrs.map(h => <span key={h} style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, padding: '10px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${BD}` : 'none' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: WD_BLUE }}>{r.param}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T3 }}>{r.type}</span>
          <span style={{ fontFamily: DISP, fontSize: 12, color: T2 }}>{r.description}</span>
        </div>
      ))}
    </div>
  )
}

interface FR { name: string; type: string; description: string }
function FieldTable({ rows }: { rows: FR[] }) {
  const cols = '220px 90px 1fr'
  const hdrs = ['FIELD', 'TYPE', 'DESCRIPTION']
  return (
    <div style={{ border: `1px solid ${BD}`, background: BG_R }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '8px 16px', borderBottom: `1px solid ${BD}` }}>
        {hdrs.map(h => <span key={h} style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, padding: '10px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${BD}` : 'none' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: WD_BLUE }}>{r.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T3 }}>{r.type}</span>
          <span style={{ fontFamily: DISP, fontSize: 12, color: T2 }}>{r.description}</span>
        </div>
      ))}
    </div>
  )
}

function ErrTable({ rows }: { rows: { code: string; meaning: string }[] }) {
  return (
    <div style={{ border: `1px solid ${BD}`, background: BG_R }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', padding: '8px 16px', borderBottom: `1px solid ${BD}` }}>
        {['CODE', 'MEANING'].map(h => <span key={h} style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', padding: '10px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${BD}` : 'none' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: WD_BLUE }}>{r.code}</span>
          <span style={{ fontFamily: DISP, fontSize: 12, color: T2 }}>{r.meaning}</span>
        </div>
      ))}
    </div>
  )
}

function EvBlock({ name, desc }: { name: string; desc: string }) {
  return (
    <div style={{ background: BG_S, border: `1px solid ${BD}`, padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ fontFamily: MONO, fontSize: 13, color: T1 }}>{name}</div>
      <div style={{ fontFamily: DISP, fontSize: 12, color: T2, marginTop: 4 }}>{desc}</div>
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', fontFamily: MONO, fontSize: 11, color: T3,
      textTransform: 'uppercase', letterSpacing: '0.18em',
      borderLeft: '2px solid rgba(255,255,255,0.14)', paddingLeft: 10, marginBottom: 4,
    }}>
      {children}
    </span>
  )
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: DISP, fontWeight: 700, fontSize: 28, color: T1,
      margin: '16px 0', letterSpacing: '-0.4px',
      borderLeft: '2px solid rgba(255,255,255,0.12)',
      paddingLeft: 12, marginLeft: -14,
    }}>
      {children}
    </h2>
  )
}
function Body({ children, mb = 24 }: { children: React.ReactNode; mb?: number }) {
  return <p style={{ fontFamily: DISP, fontSize: 14, color: T2, lineHeight: 1.8, marginBottom: mb }}>{children}</p>
}
function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      display: 'block', fontFamily: MONO, fontSize: 12, color: T2,
      background: BG_S,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      padding: '12px 16px',
    }}>
      {children}
    </code>
  )
}

const SB: React.CSSProperties = { marginBottom: 64, paddingBottom: 64, borderBottom: '1px solid rgba(255,255,255,0.06)' }
const SL: React.CSSProperties = { paddingBottom: 64 }

// ── page ───────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [active, setActive] = useState('introduction')
  const [lang, setLang] = useState<Lang>('curl')

  function goTo(id: string) {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const code = EX[active]?.[lang] ?? EX.introduction[lang]
  const LANGS: { id: Lang; label: string }[] = [
    { id: 'curl', label: 'curl' },
    { id: 'node', label: 'Node' },
    { id: 'python', label: 'Python' },
  ]

  return (
    <div style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', display: 'flex', background: BG }}>

      {/* ── LEFT NAV ── */}
      <aside style={{ width: 220, flexShrink: 0, background: BG_R, borderRight: `1px solid ${BD}`, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
          <div style={{ fontFamily: DISP, fontSize: 13, fontWeight: 700, color: T1, letterSpacing: '0.04em' }}>
            Weavn
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: T3, marginTop: 4 }}>API v1</div>
        </div>
        <nav style={{ flex: 1, paddingBottom: 24 }}>
          {NAV_GROUPS.map(g => (
            <div key={g.label}>
              <div style={{
                fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase',
                letterSpacing: '0.2em', padding: '8px 24px', marginTop: 16,
                borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: 2,
              }}>
                {g.label}
              </div>
              {g.items.map(item => {
                const on = active === item.id
                // Detect HTTP method badge from item id
                const methodRaw = item.id.startsWith('post-') ? 'POST'
                  : item.id.startsWith('get-') ? 'GET'
                  : item.id.startsWith('delete-') ? 'DEL'
                  : null
                const METHOD_STYLE: Record<string, { bg: string; color: string }> = {
                  POST: { bg: 'rgba(0,196,140,0.1)',    color: GREEN    },
                  GET:  { bg: 'rgba(111,155,198,0.1)',  color: WD_BLUE  },
                  DEL:  { bg: 'rgba(232,99,95,0.1)',    color: '#E8635F' },
                }
                const ms = methodRaw ? METHOD_STYLE[methodRaw] : null
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      width: '100%', textAlign: 'left',
                      fontFamily: MONO, fontSize: 13, padding: '8px 24px',
                      cursor: 'pointer', border: 'none', outline: 'none',
                      background: on ? 'rgba(157,140,255,0.06)' : 'transparent',
                      borderLeft: `2px solid ${on ? ACCENT : 'transparent'}`,
                      color: on ? T1 : T2,
                      transition: 'color 0.15s',
                    }}
                  >
                    {ms && (
                      <span style={{ fontFamily: MONO, fontSize: 9, background: ms.bg, color: ms.color, padding: '2px 5px', flexShrink: 0 }}>
                        {methodRaw}
                      </span>
                    )}
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── CENTER ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', minWidth: 0 }}>
        <div style={{ maxWidth: 640 }}>

          <section id="introduction" style={SB}>
            <Eyebrow>OVERVIEW</Eyebrow>
            <H2>API Reference · v1</H2>
            <Body>
              The Weavn API returns a structured conversion audit for any URL. POST a URL, get back a JSON object with a score, ranked findings, AI-rewritten copy, and industry benchmarks.
            </Body>
            <p style={{ fontFamily: MONO, fontSize: 11, color: T3, marginBottom: 8 }}>Base URL</p>
            <Mono>https://weavn.app/api/v1</Mono>
          </section>

          <section id="authentication" style={SB}>
            <Eyebrow>OVERVIEW</Eyebrow>
            <H2>Authentication</H2>
            <Body mb={16}>
              All API requests require a Bearer token in the Authorization header. Get your API key from the developer portal.
            </Body>
            <Mono>Authorization: Bearer weavn_live_••••</Mono>
            <p style={{ fontFamily: DISP, fontSize: 12, color: T3, marginTop: 12 }}>
              Keep your API key secret. Do not expose it in client-side code.
            </p>
          </section>

          <section id="errors" style={SB}>
            <Eyebrow>OVERVIEW</Eyebrow>
            <H2>Errors</H2>
            <Body mb={24}>Weavn uses standard HTTP status codes. Error responses include a machine-readable <code style={{ fontFamily: MONO, fontSize: 12 }}>code</code> field for programmatic handling.</Body>
            <ErrTable rows={[
              { code: '400', meaning: 'INVALID_URL / INVALID_REQUEST — URL missing, malformed, or no valid domain.' },
              { code: '401', meaning: 'AUTH_INVALID — Bearer token absent, malformed, or revoked.' },
              { code: '402', meaning: 'INSUFFICIENT_CREDITS — multi-page scan requested with no remaining credits.' },
              { code: '402', meaning: 'TRIAL_EXHAUSTED — free 25-scan trial exhausted; upgrade plan to continue.' },
              { code: '422', meaning: 'BOT_BLOCKED — URL is protected by bot detection (e.g. Cloudflare Enterprise) that prevents automated access. Try a different URL.' },
              { code: '422', meaning: 'EXTRACTION_FAILED — Could not extract content from this URL after two attempts. The page may require authentication or be otherwise inaccessible.' },
              { code: '429', meaning: 'RATE_LIMITED — request rate limit exceeded; back off and retry.' },
              { code: '500', meaning: 'SCAN_FAILED / INTERNAL_ERROR — analysis or infrastructure error; safe to retry with exponential backoff.' },
            ]} />
            <Body mb={0}>Retry 429 and 5xx responses with exponential backoff. Do not retry 400, 401, 402, or 422 — they will fail identically until the request or account state changes.</Body>
          </section>

          <section id="rate-limits" style={SB}>
            <Eyebrow>OVERVIEW</Eyebrow>
            <H2>Rate limits</H2>
            <Body>
              60 requests per minute per API key — a 429 with a Retry-After header (seconds) when exceeded. Each key also has a monthly scan quota, surfaced via the X-RateLimit-* response headers. The batch endpoint accepts up to 10 URLs per request.
            </Body>
          </section>

          <section id="post-scan" style={SB}>
            <Eyebrow>ENDPOINTS</Eyebrow>
            <H2>POST /api/v1/scan</H2>
            <Body mb={24}>
              Submit a URL for a full conversion audit. Returns synchronously by default, or via webhook in async mode.
            </Body>
            <ParamTable rows={[
              { param: 'url',           type: 'string',   required: 'required', description: 'The URL to scan. Must include protocol.' },
              { param: 'fields',        type: 'array',    required: 'optional', description: 'Fields to include in response. Default: all.' },
              { param: 'finding_depth', type: 'string',   required: 'optional', description: "'brief' or 'full'. Default: 'full'." },
              { param: 'finding_limit', type: 'number',   required: 'optional', description: 'Max findings to return. Default: 10.' },
              { param: 'async',         type: 'boolean',  required: 'optional', description: 'Return immediately with scan_id. Default: false.' },
              { param: 'webhook_url',   type: 'string',   required: 'optional', description: 'Required if async: true.' },
              { param: 'pages',         type: 'number | string[]', required: 'optional', description: 'Page count (1–5), or an explicit array of paths (max 5) to scan beyond the base URL. An array returns 202 with a poll_url. Each page consumes one scan credit. Example: ["/pricing", "/about"]' },
            ]} />
            <p style={{ fontFamily: MONO, fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 24, marginBottom: 8 }}>
              RESPONSE · 200 OK
            </p>
            <CodeBlock language="json" code={`{
  "scan_id": "sc_3f9a2c7e8b1d4f60",
  "url": "https://acme-saas.com",
  "score": 61,
  "verdict": "Fair",
  "scanned_at": "2026-06-14T12:00:00.000Z",
  "pages_scanned": 1,
  "page_type": "homepage",
  "findings_summary": 23,
  "dimensions": {
    "conversion_architecture": 58,
    "trust_signals": 79,
    "message_clarity": 71,
    "traffic_readiness": 44,
    "technical_foundation": 65,
    "objection_handling": 41,
    "offer_clarity": 53
  },
  "findings": [
    {
      "id": "finding_001",
      "title": "Hero headline is feature-led, not outcome-led",
      "severity": "critical",
      "dimension": "Conversion Architecture",
      "impact": "high",
      "impact_estimate": "12-18% conversion lift",
      "explanation": "Headline names the feature set, not the customer outcome.",
      "fix_steps": ["Lead with the outcome", "Name the audience", "Trim to one supporting line"],
      "rewritten_copy": "Ship every project on time — wherever your team works.",
      "confidence": "high",
      "fix_effort": "hours",
      "priority": 1
    }
  ],
  "copy_rewrites": {
    "headline": "Ship every project on time — wherever your team works",
    "subheadline": "The project workspace built for distributed teams.",
    "cta": "Start free"
  },
  "metadata": { "word_count": 1240, "cta_count": 3, "tech_stack": ["Next.js", "Vercel"] },
  "scan_meta": { "site_type": "saas", "duration_ms": 87340, "cost_usd": 0.15, "tokens_used": 18240, "cached": false }
}`} />
          </section>

          <section id="post-scan-batch" style={SB}>
            <Eyebrow>ENDPOINTS</Eyebrow>
            <H2>POST /api/v1/scan/batch</H2>
            <Body mb={24}>
              Submit up to 10 URLs in a single request. Synchronous by default — returns a results array plus a summary object. Pass async: true for a 202 with batch_id, scan_ids, and poll_urls; each result is delivered to your registered webhook endpoints as it completes.
            </Body>
            <ParamTable rows={[
              { param: 'urls',          type: 'array',   required: 'required', description: 'Array of URLs to scan. Max 10 per request.' },
              { param: 'async',         type: 'boolean', required: 'optional', description: 'Return a 202 immediately with batch_id and scan_ids; results delivered to registered webhooks. Default: false (synchronous).' },
              { param: 'fields',        type: 'array',   required: 'optional', description: 'Fields to include in response. Default: all.' },
              { param: 'finding_depth', type: 'string',  required: 'optional', description: "'brief' or 'full'. Default: 'full'." },
              { param: 'finding_limit', type: 'number',  required: 'optional', description: 'Max findings per scan. Default: 10.' },
            ]} />
          </section>

          <section id="get-scans" style={SB}>
            <Eyebrow>ENDPOINTS</Eyebrow>
            <H2>GET /api/v1/scans</H2>
            <Body mb={24}>Retrieve a list of your scans, most recent first.</Body>
            <QueryTable rows={[
              { param: 'limit',  type: 'number', description: 'Results per page. Default: 20. Max: 100 (out-of-range values are clamped).' },
              { param: 'cursor', type: 'string', description: 'Opaque keyset cursor. Pass next_cursor from the previous response to fetch the next page.' },
            ]} />
            <Body mb={0}>Each response adds <code style={{ fontFamily: MONO, fontSize: 12 }}>next_cursor</code> (a string, or null on the last page) and <code style={{ fontFamily: MONO, fontSize: 12 }}>has_more</code> (boolean) alongside <code style={{ fontFamily: MONO, fontSize: 12 }}>scans</code>. Paginate by passing <code style={{ fontFamily: MONO, fontSize: 12 }}>next_cursor</code> back as <code style={{ fontFamily: MONO, fontSize: 12 }}>cursor</code> until <code style={{ fontFamily: MONO, fontSize: 12 }}>has_more</code> is false.</Body>
          </section>

          <section id="get-scans-id" style={SB}>
            <Eyebrow>ENDPOINTS</Eyebrow>
            <H2>{'GET /api/v1/scans/{id}'}</H2>
            <Body mb={24}>Retrieve a single scan by ID.</Body>
            <QueryTable rows={[
              { param: 'id', type: 'string', description: 'The scan_id returned from a scan response.' },
            ]} />
          </section>

          <section id="post-webhooks" style={SB}>
            <Eyebrow>ENDPOINTS</Eyebrow>
            <H2>POST /api/v1/webhooks</H2>
            <Body mb={24}>
              Register a webhook endpoint. Weavn will POST a signed payload to your URL whenever the specified events occur.
            </Body>
            <ParamTable rows={[
              { param: 'url',    type: 'string', required: 'required', description: 'The delivery endpoint that will receive webhook payloads.' },
              { param: 'events', type: 'array',  required: 'optional', description: "Events to subscribe to. Default: all. Options: 'scan.completed' | 'scan.failed'" },
            ]} />
          </section>

          <section id="get-webhooks" style={SB}>
            <Eyebrow>ENDPOINTS</Eyebrow>
            <H2>GET /api/v1/webhooks</H2>
            <Body mb={24}>List all registered webhook endpoints for your API key.</Body>
          </section>

          <section id="delete-webhooks-id" style={SB}>
            <Eyebrow>ENDPOINTS</Eyebrow>
            <H2>DELETE /api/v1/webhooks</H2>
            <Body mb={24}>Remove a registered webhook by id, passed in the JSON body. No further deliveries are attempted to that endpoint. Returns a deleted:true acknowledgement.</Body>
            <ParamTable rows={[
              { param: 'id', type: 'string', required: 'required', description: 'The id (UUID) returned when the webhook was created.' },
            ]} />
          </section>

          <section id="webhooks-overview" style={SB}>
            <Eyebrow>WEBHOOKS</Eyebrow>
            <H2>Webhooks</H2>
            <Body>
              Weavn sends a POST request to your webhook URL when an async scan completes or fails.
            </Body>
            <Body>Register webhooks in the developer portal or via the webhooks API.</Body>
          </section>

          <section id="webhook-events" style={SB}>
            <Eyebrow>WEBHOOKS</Eyebrow>
            <H2>Events</H2>
            <EvBlock name="scan.completed" desc="Fires when a scan finishes successfully. Payload: event, scan_id, url, score, and a data object with domain and verdict." />
            <EvBlock name="scan.failed" desc="Fires when a scan fails. Payload: event, scan_id, url, score (null), and a data object with domain, blocked, and code." />
          </section>

          <section id="webhook-delivery" style={SB}>
            <Eyebrow>WEBHOOKS</Eyebrow>
            <H2>Delivery</H2>
            <Body>
              Every webhook POST includes an{' '}
              <code style={{ fontFamily: MONO, fontSize: 12 }}>X-Weavn-Signature</code>{' '}
              header containing the HMAC-SHA256 hex of the raw request body. Verify it against your webhook secret using timing-safe comparison.
            </Body>
            <Body>
              Your endpoint must respond with HTTP 200 within 10 seconds. Non-200 responses trigger a retry.
            </Body>
          </section>

          <section id="webhook-retries" style={SB}>
            <Eyebrow>WEBHOOKS</Eyebrow>
            <H2>Retries</H2>
            <Body>
              Webhooks are retried up to 3 times on failure. Attempt 1: immediate. Attempt 2: 5 minutes after failure. Attempt 3: 30 minutes after failure. Each attempt has a 10-second timeout. After 3 failures the webhook is marked failed and no further retries occur. Acknowledge immediately with 200 and process asynchronously to avoid timeouts.
            </Body>
          </section>

          <section id="score-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Score</H2>
            <Body mb={24}>
              Integer 0–100. Benchmarked against all sites Weavn has scanned in the same industry category.
            </Body>
            <FieldTable rows={[
              { name: 'score',                          type: 'integer', description: 'Overall conversion score, 0–100.' },
              { name: 'verdict',                        type: 'string',  description: "Quality band derived from score. One of: 'Poor' | 'Needs Work' | 'Fair' | 'Good' | 'Excellent'." },
              { name: 'benchmark.industry_average',     type: 'integer', description: "Mean score across scanned sites in this site's vertical." },
              { name: 'benchmark.industry_percentile',  type: 'integer', description: 'Percentile rank vs. vertical peers (0–99).' },
              { name: 'benchmark.top_10_percent_score', type: 'integer', description: '90th-percentile score for the vertical.' },
              { name: 'benchmark.sample_size',          type: 'integer', description: 'Number of sites in the benchmark pool.' },
            ]} />
          </section>

          <section id="page-type-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Page type</H2>
            <Body mb={24}>
              The page type classified by the scanner before check execution. Determines which page-type-specific checks apply.
            </Body>
            <FieldTable rows={[
              { name: 'page_type', type: 'string', description: "Classified page type. One of: 'homepage' | 'pricing' | 'product' | 'about' | 'landing' | 'other'" },
            ]} />
          </section>

          <section id="score-profile-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Score profile</H2>
            <Body mb={24}>
              How the overall score was weighted for this site&apos;s classification. An object carrying the weighted score, the profile label, and the per-dimension weights applied.
            </Body>
            <FieldTable rows={[
              { name: 'score_profile.weighted_score', type: 'integer', description: 'The overall score, recomputed as the weighted sum of the 7 dimension scores.' },
              { name: 'score_profile.profile_used',   type: 'string',  description: "Profile label. Format: [site_type]_[complexity]. Example: 'saas_medium'." },
              { name: 'score_profile.weights',        type: 'object',  description: 'Per-dimension weights (keyed by dimension) used in the weighted sum; sum to 1.0.' },
            ]} />
          </section>

          <section id="findings-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Findings</H2>
            <Body mb={24}>
              Full-depth findings (the default). With finding_depth: &apos;brief&apos;, each finding is trimmed to id, title, severity, dimension, explanation, and confidence.
            </Body>
            <FieldTable rows={[
              { name: 'id',              type: 'string',   description: 'Finding identifier, e.g. "finding_001".' },
              { name: 'title',           type: 'string',   description: 'Short headline for the finding (≈10 words).' },
              { name: 'severity',        type: 'string',   description: "'critical' | 'high' | 'medium' | 'low'." },
              { name: 'dimension',       type: 'string',   description: "The revenue dimension label, e.g. 'Conversion Architecture'." },
              { name: 'impact',          type: 'string',   description: "'high' | 'medium' | 'low'." },
              { name: 'impact_estimate', type: 'string',   description: 'Directional projection, e.g. "12-18% conversion lift".' },
              { name: 'explanation',     type: 'string',   description: 'What was found — quotes the exact on-page element or cites the named absence.' },
              { name: 'fix_steps',       type: 'string[]', description: 'Ordered, actionable steps specific to this page (3 items at full depth).' },
              { name: 'rewritten_copy',  type: 'string',   description: 'Ready-to-paste replacement copy for the cited element.' },
              { name: 'confidence',      type: 'string',   description: "'high' | 'medium' | 'low'." },
              { name: 'fix_effort',      type: 'string',   description: "'hours' | 'days' | 'weeks'." },
              { name: 'priority',        type: 'integer',  description: '1-based rank; lower is higher priority. Findings are sorted by this. Display as "P" + priority.' },
            ]} />
          </section>

          <section id="findings-summary-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Findings summary</H2>
            <Body mb={24}>
              A single integer: the total number of findings in the findings array. Use it for dashboard display without iterating the array.
            </Body>
            <FieldTable rows={[
              { name: 'findings_summary', type: 'integer', description: 'Total count of findings returned in the findings array.' },
            ]} />
          </section>

          <section id="benchmark-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Benchmark</H2>
            <FieldTable rows={[
              { name: 'industry_average',     type: 'integer', description: "Mean score across scanned sites in this site's vertical." },
              { name: 'industry_percentile',  type: 'integer', description: 'Where this site ranks among vertical peers (0–99).' },
              { name: 'top_10_percent_score', type: 'integer', description: '90th-percentile score for the vertical.' },
              { name: 'sample_size',          type: 'integer', description: 'Number of sites in the benchmark pool.' },
            ]} />
          </section>

          <section id="strengths-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Strengths</H2>
            <Body mb={24}>
              Top passing checks where this site performs genuinely above average. Only returned when checks pass with specific visible evidence. Array may be empty — never padded.
            </Body>
            <FieldTable rows={[
              { name: 'check_id',    type: 'string', description: 'The diagnostic check ID.' },
              { name: 'label',       type: 'string', description: 'Short strength label.' },
              { name: 'observation', type: 'string', description: 'One sentence describing specifically what the site does well, referencing visible page content.' },
            ]} />
          </section>

          <section id="copy-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Rewritten copy</H2>
            <Body mb={24}>AI-rewritten alternatives for the most conversion-critical copy elements on the page.</Body>
            <FieldTable rows={[
              { name: 'headline',    type: 'string', description: 'Rewritten hero headline (≈12 words).' },
              { name: 'subheadline', type: 'string', description: 'Rewritten subheadline (≈20 words).' },
              { name: 'cta',         type: 'string', description: 'Rewritten primary call-to-action (≈5 words).' },
            ]} />
          </section>

          <section id="dimensions-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Dimensions</H2>
            <Body mb={24}>Coverage scores across the 7 revenue dimensions. Each value is an integer 0–100; the weight each dimension contributes to the overall score is returned separately in score_profile.weights.</Body>
            <FieldTable rows={[
              { name: 'conversion_architecture', type: 'integer', description: 'Coverage 0–100 — the structural machinery that moves a visitor to action (hero, CTA, checkout, conversion path).' },
              { name: 'trust_signals',           type: 'integer', description: 'Coverage 0–100 — credibility and proof the offer is real (testimonials, logos, guarantees).' },
              { name: 'message_clarity',         type: 'integer', description: 'Coverage 0–100 — how clearly the page communicates what it is and why it matters.' },
              { name: 'traffic_readiness',       type: 'integer', description: 'Coverage 0–100 — getting found and capturing arriving traffic (SEO, metadata).' },
              { name: 'technical_foundation',    type: 'integer', description: 'Coverage 0–100 — page speed and technical health.' },
              { name: 'objection_handling',      type: 'integer', description: 'Coverage 0–100 — anticipating and answering buyer objections.' },
              { name: 'offer_clarity',           type: 'integer', description: 'Coverage 0–100 — how clear and compelling the offer and pricing are.' },
            ]} />
          </section>

          <section id="dimension-benchmarks-schema" style={SB}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Dimension benchmarks</H2>
            <Body mb={24}>
              Per-dimension scores benchmarked against corpus data for this site's vertical. Only present when the benchmark field is requested or the fields array is empty.
            </Body>
            <FieldTable rows={[
              { name: 'dimension_benchmarks',                    type: 'object', description: 'Keyed by dimension name. Each value is a benchmark object for that dimension.' },
              { name: '[dimension].score',                       type: 'number', description: "This site's score for the dimension." },
              { name: '[dimension].average',                     type: 'number', description: "Industry average for this dimension in the site's vertical." },
              { name: '[dimension].percentile_label',            type: 'string', description: 'Human-readable label. Examples: "Top 10% of SaaS sites", "Below average", "Industry average".' },
              { name: '[dimension].p10',                         type: 'number', description: '10th percentile threshold for this dimension.' },
              { name: '[dimension].p90',                         type: 'number', description: '90th percentile threshold for this dimension.' },
            ]} />
          </section>

          <section id="metadata-schema" style={SL}>
            <Eyebrow>RESPONSE SCHEMA</Eyebrow>
            <H2>Metadata &amp; scan_meta</H2>
            <Body mb={24}>
              Two objects accompany every scan: metadata describes the scanned page, scan_meta describes the run and its billing. Note scan_id, url, and scanned_at are top-level response fields — not nested here.
            </Body>
            <FieldTable rows={[
              { name: 'metadata.word_count',     type: 'integer',  description: 'Readable words on the scanned page.' },
              { name: 'metadata.cta_count',      type: 'integer',  description: 'Detected calls-to-action.' },
              { name: 'metadata.tech_stack',     type: 'string[]', description: 'Structured-data / framework signals detected.' },
              { name: 'scan_meta.complexity',    type: 'string',   description: "'simple' | 'medium' | 'complex' — render complexity." },
              { name: 'scan_meta.duration_ms',   type: 'integer',  description: 'Total scan duration in milliseconds.' },
              { name: 'scan_meta.cached',        type: 'boolean',  description: 'Whether the result was served from cache (billed at 0).' },
              { name: 'scan_meta.finding_limit', type: 'integer',  description: 'The finding_limit applied to this scan.' },
              { name: 'scan_meta.finding_depth', type: 'string',   description: "'brief' | 'full'." },
              { name: 'scan_meta.site_type',     type: 'string',   description: 'Detected site type used to scope checks.' },
              { name: 'scan_meta.cost_usd',      type: 'number',   description: 'Amount billed to your account for this scan.' },
              { name: 'scan_meta.tokens_used',   type: 'integer',  description: 'Model tokens consumed (when available).' },
            ]} />
          </section>

        </div>
      </main>

      {/* ── RIGHT CODE PANEL ── */}
      <aside style={{ width: 380, flexShrink: 0, background: BG_R, borderLeft: `1px solid ${BD}`, height: '100%', overflowY: 'auto', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, padding: '40px 24px' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, marginBottom: 20 }}>
            {LANGS.map(l => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                style={{
                  fontFamily: MONO, fontSize: 12,
                  padding: '8px 14px', cursor: 'pointer',
                  border: 'none', outline: 'none', background: 'transparent',
                  borderBottom: lang === l.id ? `2px solid ${ACCENT}` : '2px solid transparent',
                  color: lang === l.id ? T1 : T3,
                  transition: 'color 0.15s', marginBottom: -1,
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="wd-panel">
            <CodeBlock
              code={code}
              language={code.trimStart().startsWith('{') || code.trimStart().startsWith('[') ? 'json' : 'bash'}
            />
          </div>
        </div>
      </aside>

    </div>
  )
}
