'use client'

import { useState } from 'react'
import Label from '@/components/ui/Label'
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
    { id: 'delete-webhooks-id', label: 'DELETE /webhooks/{id}'},
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
    curl: `curl -X POST https://api.weavn.app/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yoursite.com"}'`,
    node: `const res = await fetch('https://api.weavn.app/v1/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wdoc_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: 'https://yoursite.com' }),
})
const data = await res.json()`,
    python: `import requests

res = requests.post(
  'https://api.weavn.app/v1/scan',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  json={'url': 'https://yoursite.com'}
)
data = res.json()`,
  },
  authentication: {
    curl: `# Include in every request
curl -H "Authorization: Bearer wdoc_live_••••" \\
  https://api.weavn.app/v1/scans`,
    node: `const headers = {
  'Authorization': 'Bearer wdoc_live_••••',
  'Content-Type': 'application/json',
}`,
    python: `headers = {
  'Authorization': 'Bearer wdoc_live_••••',
  'Content-Type': 'application/json',
}`,
  },
  errors: {
    curl: `# Error response shape
{
  "error": {
    "code": "unauthorized",
    "message": "Invalid or missing API key",
    "status": 401
  }
}`,
    node: `const res = await fetch(url, { headers })
if (!res.ok) {
  const { error } = await res.json()
  // error.code === 'unauthorized'
}`,
    python: `res = requests.post(url, headers=headers, json=body)
if not res.ok:
    err = res.json()['error']
    print(err['code'], err['message'])`,
  },
  'rate-limits': {
    curl: `# Rate limit headers on every response
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1717200000

# 429 response body
{
  "error": {
    "code": "rate_limited",
    "retry_after": 2
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
    curl: `curl -X POST https://api.weavn.app/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yoursite.com",
    "fields": ["score", "findings", "copy_rewrites"],
    "finding_depth": "full",
    "finding_limit": 10,
    "async": false,
    "pages": ["/pricing", "/about"],
    "site_type": "saas"
  }'`,
    node: `const res = await fetch('https://api.weavn.app/v1/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wdoc_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://yoursite.com',
    fields: ['score', 'findings', 'copy_rewrites'],
    finding_depth: 'full',
    finding_limit: 10,
    pages: ['/pricing', '/about'],
    site_type: 'saas',
  }),
})
const { scan_id, score, findings } = await res.json()`,
    python: `import requests

res = requests.post(
  'https://api.weavn.app/v1/scan',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  json={
    'url': 'https://yoursite.com',
    'fields': ['score', 'findings', 'copy_rewrites'],
    'finding_depth': 'full',
    'finding_limit': 10,
    'pages': ['/pricing', '/about'],
    'site_type': 'saas',
  }
)
data = res.json()`,
  },
  'post-scan-batch': {
    curl: `curl -X POST https://api.weavn.app/v1/scan/batch \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": [
      "https://site-a.com",
      "https://site-b.com"
    ],
    "webhook_url": "https://yourapp.com/webhooks/webdoc"
  }'`,
    node: `const res = await fetch('https://api.weavn.app/v1/scan/batch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wdoc_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    urls: ['https://site-a.com', 'https://site-b.com'],
    webhook_url: 'https://yourapp.com/webhooks/webdoc',
  }),
})
const { batch_id, scan_ids } = await res.json()`,
    python: `res = requests.post(
  'https://api.weavn.app/v1/scan/batch',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  json={
    'urls': ['https://site-a.com', 'https://site-b.com'],
    'webhook_url': 'https://yourapp.com/webhooks/webdoc',
  }
)
data = res.json()
print(data['batch_id'])`,
  },
  'get-scans': {
    curl: `# List recent scans
curl "https://api.weavn.app/v1/scans" \\
  -H "Authorization: Bearer wdoc_live_••••"

# Filter by domain, paginate
curl "https://api.weavn.app/v1/scans?limit=5&url=yoursite.com" \\
  -H "Authorization: Bearer wdoc_live_••••"`,
    node: `const res = await fetch(
  'https://api.weavn.app/v1/scans?limit=20',
  { headers: { 'Authorization': 'Bearer wdoc_live_••••' } }
)
const { scans, next_cursor } = await res.json()`,
    python: `res = requests.get(
  'https://api.weavn.app/v1/scans',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  params={'limit': 20}
)
data = res.json()`,
  },
  'get-scans-id': {
    curl: `curl "https://api.weavn.app/v1/scans/wdsc_abc123" \\
  -H "Authorization: Bearer wdoc_live_••••"`,
    node: `const scanId = 'wdsc_abc123'
const res = await fetch(
  \`https://api.weavn.app/v1/scans/\${scanId}\`,
  { headers: { 'Authorization': 'Bearer wdoc_live_••••' } }
)
const scan = await res.json()`,
    python: `scan_id = 'wdsc_abc123'
res = requests.get(
  f'https://api.weavn.app/v1/scans/{scan_id}',
  headers={'Authorization': 'Bearer wdoc_live_••••'}
)
scan = res.json()`,
  },
  'post-webhooks': {
    curl: `curl -X POST https://api.weavn.app/v1/webhooks \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhooks/webdoc",
    "events": ["scan.completed", "scan.failed"]
  }'`,
    node: `const res = await fetch('https://api.weavn.app/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer wdoc_live_••••',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://yourapp.com/webhooks/webdoc',
    events: ['scan.completed', 'scan.failed'],
  }),
})
const { webhook_id } = await res.json()`,
    python: `res = requests.post(
  'https://api.weavn.app/v1/webhooks',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  json={
    'url': 'https://yourapp.com/webhooks/webdoc',
    'events': ['scan.completed', 'scan.failed'],
  }
)
data = res.json()
print(data['webhook_id'])`,
  },
  'get-webhooks': {
    curl: `curl "https://api.weavn.app/v1/webhooks" \\
  -H "Authorization: Bearer wdoc_live_••••"`,
    node: `const res = await fetch(
  'https://api.weavn.app/v1/webhooks',
  { headers: { 'Authorization': 'Bearer wdoc_live_••••' } }
)
const { webhooks } = await res.json()`,
    python: `res = requests.get(
  'https://api.weavn.app/v1/webhooks',
  headers={'Authorization': 'Bearer wdoc_live_••••'}
)
data = res.json()`,
  },
  'delete-webhooks-id': {
    curl: `curl -X DELETE \\
  "https://api.weavn.app/v1/webhooks/wh_abc123" \\
  -H "Authorization: Bearer wdoc_live_••••"`,
    node: `await fetch(
  'https://api.weavn.app/v1/webhooks/wh_abc123',
  {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer wdoc_live_••••' },
  }
)`,
    python: `requests.delete(
  'https://api.weavn.app/v1/webhooks/wh_abc123',
  headers={'Authorization': 'Bearer wdoc_live_••••'}
)`,
  },
  'webhooks-overview': {
    curl: `# Webhook payload posted to your webhook_url
{
  "event": "scan.completed",
  "scan_id": "scan_01abc123",
  "url": "https://yoursite.com",
  "score": 61,
  "findings_count": 23,
  "timestamp": "2026-06-07T00:00:00Z"
}`,
    node: `app.post('/webhooks/webdoc', (req, res) => {
  const { event, scan_id, score } = req.body
  if (event === 'scan.completed') {
    console.log(scan_id, score)
  }
  res.status(200).send('ok')
})`,
    python: `@app.route('/webhooks/webdoc', methods=['POST'])
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
  "scan_id": "scan_01abc123",
  "url": "https://yoursite.com",
  "score": 61,
  "findings_count": 23,
  "timestamp": "2026-06-07T00:00:00Z"
}

# scan.failed
{
  "event": "scan.failed",
  "scan_id": "scan_01abc124",
  "url": "https://yoursite.com",
  "error": "Page failed to load after 3 attempts",
  "timestamp": "2026-06-07T00:01:00Z"
}`,
    node: `switch (event.event) {
  case 'scan.completed':
    await saveReport(event)
    break
  case 'scan.failed':
    await notifyTeam(event.error)
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
X-Webdoc-Signature: <HMAC-SHA256 hex of raw body>
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
app.post('/webhooks/webdoc', async (req, res) => {
  res.status(200).send('ok')
  await processAsync(req.body)
})`,
    python: `@app.route('/webhooks/webdoc', methods=['POST'])
def handle_webhook():
    payload = request.get_json()
    queue.enqueue(process_webhook, payload)
    return 'ok', 200`,
  },
  'score-schema': {
    curl: `{
  "scan_id": "wdsc_abc123",
  "score": 62,
  "benchmark": {
    "industry_avg": 48,
    "top_quartile": 74,
    "percentile": 68
  }
}`,
    node: `const { score, benchmark } = await res.json()
console.log(score)                    // 62
console.log(benchmark.percentile)     // 68`,
    python: `data = res.json()
print(data['score'])                   # 62
print(data['benchmark']['percentile']) # 68`,
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
  "score_profile": "saas_consultative"
}`,
    node: `const { score_profile } = await res.json()
// format: [site_type]_[buyer_complexity]
console.log(score_profile) // "saas_consultative"`,
    python: `data = res.json()
# format: [site_type]_[buyer_complexity]
print(data['score_profile'])  # "saas_consultative"`,
  },
  'findings-schema': {
    curl: `{
  "findings": [{
    "id": "fnd_001",
    "priority": 1,
    "severity": "critical",
    "category": "headline",
    "title": "Hero headline does not communicate outcome",
    "detail": "Your headline focuses on features...",
    "fix": "Rewrite to lead with the outcome.",
    "estimated_lift": "+8-12 pts",
    "confidence": 0.94,
    "fix_effort": "hours",
    "impact_tier": "high",
    "priority_rank": "P1"
  }]
}`,
    node: `const { findings } = await res.json()
findings.forEach(f => {
  console.log(\`[\${f.severity}] \${f.title}\`)
  console.log(\`Rank: \${f.priority_rank} | Effort: \${f.fix_effort}\`)
})`,
    python: `for f in data['findings']:
    print(f"[{f['severity']}] {f['title']}")
    print(f"Rank: {f['priority_rank']} | Effort: {f['fix_effort']}")`,
  },
  'findings-summary-schema': {
    curl: `{
  "findings_summary": {
    "p1_count": 3,
    "p2_count": 7,
    "p3_count": 13,
    "total": 23,
    "critical": 2,
    "high": 5
  }
}`,
    node: `const { findings_summary } = await res.json()
const { p1_count, p2_count, total } = findings_summary
console.log(\`P1: \${p1_count}, Total: \${total}\`)`,
    python: `fs = data['findings_summary']
print(f"P1: {fs['p1_count']}, Total: {fs['total']}")`,
  },
  'benchmark-schema': {
    curl: `{
  "benchmark": {
    "industry": "saas",
    "industry_avg": 48,
    "top_quartile": 74,
    "percentile": 68,
    "sites_compared": 2847
  }
}`,
    node: `const { benchmark } = await res.json()
const { industry_avg, top_quartile, percentile } = benchmark`,
    python: `b = data['benchmark']
print(f"Avg: {b['industry_avg']}, Top 25%: {b['top_quartile']}")`,
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
    "headline": "Get a ranked conversion audit in 90 seconds",
    "subheadline": "See exactly which elements are losing you revenue.",
    "cta_primary": "Run free audit",
    "cta_secondary": "See sample report",
    "value_prop": "264 checks. Benchmarks. Rewritten copy."
  }
}`,
    node: `const { copy_rewrites } = await res.json()
h1.textContent = copy_rewrites.headline
cta.textContent = copy_rewrites.cta_primary`,
    python: `copy = data['copy_rewrites']
print(copy['headline'])
print(copy['cta_primary'])`,
  },
  'dimensions-schema': {
    curl: `{
  "dimensions": {
    "clarity":           { "score": 58, "weight": 0.20 },
    "value_proposition": { "score": 71, "weight": 0.18 },
    "social_proof":      { "score": 44, "weight": 0.15 },
    "cta_strength":      { "score": 65, "weight": 0.14 },
    "trust":             { "score": 79, "weight": 0.13 },
    "visual_hierarchy":  { "score": 53, "weight": 0.10 },
    "objection_handling":{ "score": 41, "weight": 0.06 },
    "urgency":           { "score": 38, "weight": 0.04 }
  }
}`,
    node: `const { dimensions } = await res.json()
Object.entries(dimensions).forEach(([dim, val]) => {
  console.log(\`\${dim}: \${val.score}\`)
})`,
    python: `for dim, val in data['dimensions'].items():
    print(f"{dim}: {val['score']}")`,
  },
  'dimension-benchmarks-schema': {
    curl: `{
  "dimension_benchmarks": {
    "clarity": {
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
    "scan_id":      "wdsc_abc123",
    "url":          "https://yoursite.com",
    "status":       "completed",
    "industry":     "saas",
    "scanned_at":   "2025-06-03T12:00:00Z",
    "duration_ms":  8420,
    "model":        "claude-sonnet-4-6",
    "credits_used": 1
  }
}`,
    node: `const { metadata } = await res.json()
console.log(metadata.scan_id)     // wdsc_abc123
console.log(metadata.duration_ms) // 8420`,
    python: `m = data['metadata']
print(m['scan_id'], m['status'])
print(f"Took {m['duration_ms']}ms")`,
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

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: DISP, fontWeight: 700, fontSize: 28, color: T1,
      margin: '16px 0', letterSpacing: '-0.4px',
      borderLeft: '2px solid rgba(111,155,198,0.25)',
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

const SB: React.CSSProperties = { marginBottom: 64, paddingBottom: 64, borderBottom: '1px solid rgba(111,155,198,0.12)' }
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
            webdoc.ai
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
                      background: on ? 'rgba(0,196,140,0.04)' : 'transparent',
                      borderLeft: `2px solid ${on ? GREEN : 'transparent'}`,
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
            <Label>OVERVIEW</Label>
            <H2>API Reference · v1</H2>
            <Body>
              The Weavn API returns a structured conversion audit for any URL. POST a URL, get back a JSON object with a score, ranked findings, AI-rewritten copy, and industry benchmarks.
            </Body>
            <p style={{ fontFamily: MONO, fontSize: 11, color: T3, marginBottom: 8 }}>Base URL</p>
            <Mono>https://api.weavn.app/v1</Mono>
          </section>

          <section id="authentication" style={SB}>
            <Label>OVERVIEW</Label>
            <H2>Authentication</H2>
            <Body mb={16}>
              All API requests require a Bearer token in the Authorization header. Get your API key from the developer portal.
            </Body>
            <Mono>Authorization: Bearer wdoc_live_••••</Mono>
            <p style={{ fontFamily: DISP, fontSize: 12, color: T3, marginTop: 12 }}>
              Keep your API key secret. Do not expose it in client-side code.
            </p>
          </section>

          <section id="errors" style={SB}>
            <Label>OVERVIEW</Label>
            <H2>Errors</H2>
            <Body mb={24}>webdoc uses standard HTTP status codes. Error responses include a machine-readable <code style={{ fontFamily: MONO, fontSize: 12 }}>code</code> field for programmatic handling.</Body>
            <ErrTable rows={[
              { code: '400', meaning: 'Bad request — missing or invalid URL' },
              { code: '401', meaning: 'Unauthorized — invalid or missing API key' },
              { code: '402', meaning: 'Insufficient credits — top up required' },
              { code: '422', meaning: 'BOT_BLOCKED — URL is protected by bot detection (e.g. Cloudflare Enterprise) that prevents automated access. Try a different URL.' },
              { code: '422', meaning: 'EXTRACTION_FAILED — Could not extract content from this URL. The page may require authentication or be otherwise inaccessible.' },
              { code: '429', meaning: 'Rate limited — slow down requests' },
              { code: '500', meaning: 'SCAN_FAILED — Internal scan error. Retry with exponential backoff.' },
            ]} />
          </section>

          <section id="rate-limits" style={SB}>
            <Label>OVERVIEW</Label>
            <H2>Rate limits</H2>
            <Body>
              10 concurrent requests per API key. No per-minute limit. Batch endpoint accepts up to 10 URLs per request.
            </Body>
          </section>

          <section id="post-scan" style={SB}>
            <Label>ENDPOINTS</Label>
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
              { param: 'pages',         type: 'string[]', required: 'optional', description: 'Additional page paths to scan beyond the base URL. Max 5 paths. Forces async mode. Each page consumes one scan credit. Example: ["/pricing", "/about"]' },
              { param: 'site_type',     type: 'string',   required: 'optional', description: "Override automatic site type classification. One of: 'saas' | 'ecommerce' | 'service' | 'b2b' | 'creator' | 'local'. If omitted, the scanner classifies the site automatically before running checks." },
            ]} />
            <p style={{ fontFamily: MONO, fontSize: 11, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 24, marginBottom: 8 }}>
              RESPONSE · 200 OK
            </p>
            <CodeBlock language="json" code={`{
  "scan_id": "scan_01HXYZ7K2M9N3P4Q",
  "url": "https://acme-saas.com",
  "score": 61,
  "industry": "B2B SaaS",
  "benchmark": {
    "industry_avg": 54,
    "top_quartile": 78,
    "percentile": 63
  },
  "findings": [
    {
      "priority": 1,
      "severity": "critical",
      "category": "value_proposition",
      "title": "Hero headline is feature-led, not outcome-led",
      "estimated_lift": "12-18% conversion uplift",
      "fix": "Rewrite to outcome-led, present tense."
    }
  ],
  "rewritten_copy": {
    "headline": "Ship projects on time, every time.",
    "cta_primary": "Start free — no credit card"
  },
  "cost_usd": 0.15,
  "duration_ms": 87340
}`} />
          </section>

          <section id="post-scan-batch" style={SB}>
            <Label>ENDPOINTS</Label>
            <H2>POST /api/v1/scan/batch</H2>
            <Body mb={24}>
              Submit up to 10 URLs in a single request. Always async — results delivered via webhook.
            </Body>
            <ParamTable rows={[
              { param: 'urls',          type: 'array',  required: 'required', description: 'Array of URLs to scan. Max 10 per request.' },
              { param: 'webhook_url',   type: 'string', required: 'required', description: 'URL to receive results when each scan completes.' },
              { param: 'fields',        type: 'array',  required: 'optional', description: 'Fields to include in response. Default: all.' },
              { param: 'finding_depth', type: 'string', required: 'optional', description: "'brief' or 'full'. Default: 'full'." },
              { param: 'finding_limit', type: 'number', required: 'optional', description: 'Max findings per scan. Default: 10.' },
            ]} />
          </section>

          <section id="get-scans" style={SB}>
            <Label>ENDPOINTS</Label>
            <H2>GET /api/v1/scans</H2>
            <Body mb={24}>Retrieve a list of your scans, most recent first.</Body>
            <QueryTable rows={[
              { param: 'limit',  type: 'number', description: 'Results per page. Default: 20. Max: 100.' },
              { param: 'before', type: 'string', description: 'Cursor — return scans before this ID.' },
              { param: 'after',  type: 'string', description: 'Cursor — return scans after this ID.' },
              { param: 'url',    type: 'string', description: 'Filter by domain.' },
            ]} />
          </section>

          <section id="get-scans-id" style={SB}>
            <Label>ENDPOINTS</Label>
            <H2>{'GET /api/v1/scans/{id}'}</H2>
            <Body mb={24}>Retrieve a single scan by ID.</Body>
            <QueryTable rows={[
              { param: 'id', type: 'string', description: 'The scan_id returned from a scan response.' },
            ]} />
          </section>

          <section id="post-webhooks" style={SB}>
            <Label>ENDPOINTS</Label>
            <H2>POST /api/v1/webhooks</H2>
            <Body mb={24}>
              Register a webhook endpoint. webdoc will POST a signed payload to your URL whenever the specified events occur.
            </Body>
            <ParamTable rows={[
              { param: 'url',    type: 'string', required: 'required', description: 'The delivery endpoint that will receive webhook payloads.' },
              { param: 'events', type: 'array',  required: 'optional', description: "Events to subscribe to. Default: all. Options: 'scan.completed' | 'scan.failed'" },
            ]} />
          </section>

          <section id="get-webhooks" style={SB}>
            <Label>ENDPOINTS</Label>
            <H2>GET /api/v1/webhooks</H2>
            <Body mb={24}>List all registered webhook endpoints for your API key.</Body>
          </section>

          <section id="delete-webhooks-id" style={SB}>
            <Label>ENDPOINTS</Label>
            <H2>{'DELETE /api/v1/webhooks/{id}'}</H2>
            <Body mb={24}>Remove a registered webhook. No further deliveries will be attempted to this endpoint.</Body>
            <QueryTable rows={[
              { param: 'id', type: 'string', description: 'The webhook_id returned when the webhook was created.' },
            ]} />
          </section>

          <section id="webhooks-overview" style={SB}>
            <Label>WEBHOOKS</Label>
            <H2>Webhooks</H2>
            <Body>
              webdoc sends a POST request to your webhook URL when an async scan completes or fails.
            </Body>
            <Body>Register webhooks in the developer portal or via the webhooks API.</Body>
          </section>

          <section id="webhook-events" style={SB}>
            <Label>WEBHOOKS</Label>
            <H2>Events</H2>
            <EvBlock name="scan.completed" desc="Fires when a scan finishes successfully. Payload includes scan_id, url, score, findings_count, and timestamp." />
            <EvBlock name="scan.failed" desc="Fires when a scan fails after retries. Payload includes scan_id, url, error message, and timestamp." />
          </section>

          <section id="webhook-delivery" style={SB}>
            <Label>WEBHOOKS</Label>
            <H2>Delivery</H2>
            <Body>
              Every webhook POST includes an{' '}
              <code style={{ fontFamily: MONO, fontSize: 12 }}>X-Webdoc-Signature</code>{' '}
              header containing the HMAC-SHA256 hex of the raw request body. Verify it against your webhook secret using timing-safe comparison.
            </Body>
            <Body>
              Your endpoint must respond with HTTP 200 within 10 seconds. Non-200 responses trigger a retry.
            </Body>
          </section>

          <section id="webhook-retries" style={SB}>
            <Label>WEBHOOKS</Label>
            <H2>Retries</H2>
            <Body>
              Webhooks are retried up to 3 times on failure. Attempt 1: immediate. Attempt 2: 5 minutes after failure. Attempt 3: 30 minutes after failure. Each attempt has a 10-second timeout. After 3 failures the webhook is marked failed and no further retries occur. Acknowledge immediately with 200 and process asynchronously to avoid timeouts.
            </Body>
          </section>

          <section id="score-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
            <H2>Score</H2>
            <Body mb={24}>
              Integer 0–100. Benchmarked against all sites webdoc has scanned in the same industry category.
            </Body>
            <FieldTable rows={[
              { name: 'score',                  type: 'integer', description: 'Overall conversion score, 0–100.' },
              { name: 'benchmark.industry_avg', type: 'integer', description: 'Mean score for the detected industry.' },
              { name: 'benchmark.top_quartile', type: 'integer', description: 'Score at the 75th percentile.' },
              { name: 'benchmark.percentile',   type: 'integer', description: 'Percentile rank vs. industry peers.' },
            ]} />
          </section>

          <section id="page-type-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
            <H2>Page type</H2>
            <Body mb={24}>
              The page type classified by the scanner before check execution. Determines which page-type-specific checks apply.
            </Body>
            <FieldTable rows={[
              { name: 'page_type', type: 'string', description: "Classified page type. One of: 'homepage' | 'pricing' | 'product' | 'about' | 'landing' | 'other'" },
            ]} />
          </section>

          <section id="score-profile-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
            <H2>Score profile</H2>
            <Body mb={24}>
              The weight profile used to compute the overall score. Reflects how dimension scores were weighted for this site's classification.
            </Body>
            <FieldTable rows={[
              { name: 'score_profile', type: 'string', description: "Weight profile applied to dimension scores. Format: [site_type]_[buyer_complexity]. Example: 'saas_consultative'" },
            ]} />
          </section>

          <section id="findings-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
            <H2>Findings</H2>
            <FieldTable rows={[
              { name: 'id',             type: 'string',  description: 'Unique finding identifier.' },
              { name: 'priority',       type: 'integer', description: 'Rank order — lower is higher priority.' },
              { name: 'severity',       type: 'string',  description: "'critical' | 'high' | 'medium' | 'low'" },
              { name: 'category',       type: 'string',  description: 'Conversion dimension this finding belongs to.' },
              { name: 'title',          type: 'string',  description: 'Short headline for the finding.' },
              { name: 'detail',         type: 'string',  description: 'Full explanation of the problem and impact.' },
              { name: 'fix',            type: 'string',  description: 'Specific, actionable fix recommendation.' },
              { name: 'estimated_lift', type: 'string',  description: 'Projected score improvement if fixed.' },
              { name: 'confidence',     type: 'number',  description: 'Model confidence, 0.0–1.0.' },
              { name: 'fix_effort',     type: 'string',  description: "Estimated implementation effort. 'hours' = copywriting or minor HTML change. 'days' = new section or content addition. 'weeks' = architectural or design change." },
              { name: 'impact_tier',    type: 'string',  description: "Projected conversion impact if this finding is addressed. One of: 'high' | 'medium' | 'low'" },
              { name: 'priority_rank',  type: 'string',  description: "Derived priority. 'P1' = high impact + hours effort (fix this week). 'P2' = high impact or hours effort. 'P3' = everything else." },
            ]} />
          </section>

          <section id="findings-summary-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
            <H2>Findings summary</H2>
            <Body mb={24}>
              Triage counts computed from the findings array. Use this for dashboard display without iterating all findings.
            </Body>
            <FieldTable rows={[
              { name: 'findings_summary',          type: 'object', description: 'Triage counts computed from the findings array.' },
              { name: 'findings_summary.p1_count', type: 'number', description: 'Fix this week: high impact, low effort findings.' },
              { name: 'findings_summary.p2_count', type: 'number', description: 'Fix this month: high impact or low effort.' },
              { name: 'findings_summary.p3_count', type: 'number', description: 'Fix when you can: lower priority improvements.' },
              { name: 'findings_summary.total',    type: 'number', description: 'Total finding count.' },
              { name: 'findings_summary.critical', type: 'number', description: 'Critical severity count.' },
              { name: 'findings_summary.high',     type: 'number', description: 'High severity count.' },
            ]} />
          </section>

          <section id="benchmark-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
            <H2>Benchmark</H2>
            <FieldTable rows={[
              { name: 'industry',       type: 'string',  description: 'Auto-detected or overridden industry slug.' },
              { name: 'industry_avg',   type: 'integer', description: 'Mean score across industry sites.' },
              { name: 'top_quartile',   type: 'integer', description: 'Score at the 75th percentile.' },
              { name: 'percentile',     type: 'integer', description: 'Where this site ranks among industry peers.' },
              { name: 'sites_compared', type: 'integer', description: 'Number of sites in the benchmark pool.' },
            ]} />
          </section>

          <section id="strengths-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
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
            <Label>RESPONSE SCHEMA</Label>
            <H2>Rewritten copy</H2>
            <Body mb={24}>AI-rewritten alternatives for the most conversion-critical copy elements on the page.</Body>
            <FieldTable rows={[
              { name: 'headline',      type: 'string', description: 'Rewritten hero headline.' },
              { name: 'subheadline',   type: 'string', description: 'Rewritten subheadline or deck copy.' },
              { name: 'cta_primary',   type: 'string', description: 'Rewritten primary call-to-action.' },
              { name: 'cta_secondary', type: 'string', description: 'Rewritten secondary CTA if present.' },
              { name: 'value_prop',    type: 'string', description: 'Rewritten value proposition statement.' },
            ]} />
          </section>

          <section id="dimensions-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
            <H2>Dimensions</H2>
            <Body mb={24}>Scores across each of the 8 revenue dimensions. Each contributes a weighted portion of the overall score.</Body>
            <FieldTable rows={[
              { name: 'clarity',            type: 'object', description: '{ score: integer, weight: number }' },
              { name: 'value_proposition',  type: 'object', description: '{ score: integer, weight: number }' },
              { name: 'social_proof',       type: 'object', description: '{ score: integer, weight: number }' },
              { name: 'cta_strength',       type: 'object', description: '{ score: integer, weight: number }' },
              { name: 'trust',              type: 'object', description: '{ score: integer, weight: number }' },
              { name: 'visual_hierarchy',   type: 'object', description: '{ score: integer, weight: number }' },
              { name: 'objection_handling', type: 'object', description: '{ score: integer, weight: number }' },
              { name: 'urgency',            type: 'object', description: '{ score: integer, weight: number }' },
            ]} />
          </section>

          <section id="dimension-benchmarks-schema" style={SB}>
            <Label>RESPONSE SCHEMA</Label>
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
            <Label>RESPONSE SCHEMA</Label>
            <H2>Metadata</H2>
            <FieldTable rows={[
              { name: 'scan_id',      type: 'string',  description: 'Unique scan identifier (wdsc_...).' },
              { name: 'url',          type: 'string',  description: 'The URL that was scanned.' },
              { name: 'status',       type: 'string',  description: "'completed' | 'failed' | 'pending'" },
              { name: 'industry',     type: 'string',  description: 'Auto-detected or overridden industry.' },
              { name: 'scanned_at',   type: 'string',  description: 'ISO 8601 timestamp of scan completion.' },
              { name: 'duration_ms',  type: 'integer', description: 'Total scan duration in milliseconds.' },
              { name: 'model',        type: 'string',  description: 'Claude model used for analysis.' },
              { name: 'credits_used', type: 'integer', description: 'API credits consumed by this scan.' },
            ]} />
          </section>

        </div>
      </main>

      {/* ── RIGHT CODE PANEL ── */}
      <aside style={{ width: 380, flexShrink: 0, background: BG_R, borderLeft: '0.5px solid rgba(128,128,192,0.15)', height: '100%', overflowY: 'auto', boxShadow: 'inset 1px 0 0 rgba(128,128,192,0.1)', position: 'relative' }}>
        {/* Faint purple bloom */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            background: 'radial-gradient(ellipse 400px 800px at 50% 40%, rgba(128,128,192,0.06) 0%, transparent 60%)',
          }}
        />
        <div style={{ position: 'sticky', top: 0, padding: '40px 24px', zIndex: 1 }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, marginBottom: 20 }}>
            {LANGS.map(l => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                style={{
                  fontFamily: MONO, fontSize: 12,
                  padding: '8px 14px', cursor: 'pointer',
                  border: 'none', outline: 'none', background: 'transparent',
                  borderBottom: lang === l.id ? `2px solid ${GREEN}` : '2px solid transparent',
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
