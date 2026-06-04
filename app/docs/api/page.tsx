'use client'

import { useState } from 'react'
import Label from '@/components/ui/Label'

const BG       = '#050810'
const BG_R     = '#080C14'
const BG_S     = '#0A0F1A'
const BG_I     = '#0D1420'
const BD       = '#111827'
const CYAN     = '#00C8FF'
const GREEN    = '#00C48C'
const T1       = '#F0F4FF'
const T2       = '#4A5568'
const T3       = '#2D3748'
const MONO     = "'Space Mono', 'Courier New', monospace"
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
    { id: 'post-scan',       label: 'POST /scan'       },
    { id: 'post-scan-batch', label: 'POST /scan/batch' },
    { id: 'get-scans',       label: 'GET /scans'       },
    { id: 'get-scans-id',    label: 'GET /scans/{id}'  },
  ]},
  { label: 'WEBHOOKS', items: [
    { id: 'webhooks-overview', label: 'Overview'  },
    { id: 'webhook-events',    label: 'Events'    },
    { id: 'webhook-delivery',  label: 'Delivery'  },
    { id: 'webhook-retries',   label: 'Retries'   },
  ]},
  { label: 'RESPONSE SCHEMA', items: [
    { id: 'score-schema',      label: 'Score'          },
    { id: 'findings-schema',   label: 'Findings'       },
    { id: 'benchmark-schema',  label: 'Benchmark'      },
    { id: 'copy-schema',       label: 'Rewritten copy' },
    { id: 'dimensions-schema', label: 'Dimensions'     },
    { id: 'metadata-schema',   label: 'Metadata'       },
  ]},
]

const EX: Record<string, Record<Lang, string>> = {
  introduction: {
    curl: `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yoursite.com"}'`,
    node: `const res = await fetch('https://webdocai.com/api/v1/scan', {
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
  'https://webdocai.com/api/v1/scan',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  json={'url': 'https://yoursite.com'}
)
data = res.json()`,
  },
  authentication: {
    curl: `# Include in every request
curl -H "Authorization: Bearer wdoc_live_••••" \\
  https://webdocai.com/api/v1/scans`,
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
    curl: `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yoursite.com",
    "fields": ["score", "findings", "copy_rewrites"],
    "finding_depth": "full",
    "finding_limit": 10,
    "async": false,
    "industry": "saas"
  }'`,
    node: `const res = await fetch('https://webdocai.com/api/v1/scan', {
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
    industry: 'saas',
  }),
})
const { scan_id, score, findings } = await res.json()`,
    python: `import requests

res = requests.post(
  'https://webdocai.com/api/v1/scan',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  json={
    'url': 'https://yoursite.com',
    'fields': ['score', 'findings', 'copy_rewrites'],
    'finding_depth': 'full',
    'finding_limit': 10,
    'industry': 'saas',
  }
)
data = res.json()`,
  },
  'post-scan-batch': {
    curl: `curl -X POST https://webdocai.com/api/v1/scan/batch \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": [
      "https://site-a.com",
      "https://site-b.com"
    ],
    "webhook_url": "https://yourapp.com/webhooks/webdoc"
  }'`,
    node: `const res = await fetch('https://webdocai.com/api/v1/scan/batch', {
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
  'https://webdocai.com/api/v1/scan/batch',
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
curl "https://webdocai.com/api/v1/scans" \\
  -H "Authorization: Bearer wdoc_live_••••"

# Filter by domain, paginate
curl "https://webdocai.com/api/v1/scans?limit=5&url=yoursite.com" \\
  -H "Authorization: Bearer wdoc_live_••••"`,
    node: `const res = await fetch(
  'https://webdocai.com/api/v1/scans?limit=20',
  { headers: { 'Authorization': 'Bearer wdoc_live_••••' } }
)
const { scans, next_cursor } = await res.json()`,
    python: `res = requests.get(
  'https://webdocai.com/api/v1/scans',
  headers={'Authorization': 'Bearer wdoc_live_••••'},
  params={'limit': 20}
)
data = res.json()`,
  },
  'get-scans-id': {
    curl: `curl "https://webdocai.com/api/v1/scans/wdsc_abc123" \\
  -H "Authorization: Bearer wdoc_live_••••"`,
    node: `const scanId = 'wdsc_abc123'
const res = await fetch(
  \`https://webdocai.com/api/v1/scans/\${scanId}\`,
  { headers: { 'Authorization': 'Bearer wdoc_live_••••' } }
)
const scan = await res.json()`,
    python: `scan_id = 'wdsc_abc123'
res = requests.get(
  f'https://webdocai.com/api/v1/scans/{scan_id}',
  headers={'Authorization': 'Bearer wdoc_live_••••'}
)
scan = res.json()`,
  },
  'webhooks-overview': {
    curl: `# Webhook payload posted to your webhook_url
{
  "id": "evt_xyz789",
  "type": "scan.completed",
  "created": 1717200000,
  "data": {
    "scan_id": "wdsc_abc123",
    "url": "https://yoursite.com",
    "score": 62
  }
}`,
    node: `app.post('/webhooks/webdoc', (req, res) => {
  const { type, data } = req.body
  if (type === 'scan.completed') {
    console.log(data.scan_id, data.score)
  }
  res.status(200).send('ok')
})`,
    python: `@app.route('/webhooks/webdoc', methods=['POST'])
def handle_webhook():
    payload = request.get_json()
    if payload['type'] == 'scan.completed':
        print(payload['data']['score'])
    return 'ok', 200`,
  },
  'webhook-events': {
    curl: `# scan.completed
{
  "type": "scan.completed",
  "data": { "scan_id": "wdsc_abc123", "score": 62 }
}

# scan.failed
{
  "type": "scan.failed",
  "data": {
    "scan_id": "wdsc_abc124",
    "error": "Page failed to load after 3 attempts"
  }
}`,
    node: `switch (event.type) {
  case 'scan.completed':
    await saveReport(event.data)
    break
  case 'scan.failed':
    await notifyTeam(event.data.error)
    break
}`,
    python: `handlers = {
    'scan.completed': save_report,
    'scan.failed': notify_team,
}
handler = handlers.get(payload['type'])
if handler:
    handler(payload['data'])`,
  },
  'webhook-delivery': {
    curl: `# Signature headers on every delivery
Webdoc-Signature: sha256=abc123...
Webdoc-Timestamp: 1717200000
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
    curl: `# Retry schedule (exponential backoff)
# Attempt 1: immediate
# Attempt 2: 30s
# Attempt 3: 5m
# Attempt 4: 30m
# Attempt 5: 2h`,
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
    "confidence": 0.94
  }]
}`,
    node: `const { findings } = await res.json()
findings.forEach(f => {
  console.log(\`[\${f.severity}] \${f.title}\`)
  console.log(\`Fix: \${f.fix}\`)
})`,
    python: `for f in data['findings']:
    print(f"[{f['severity']}] {f['title']}")
    print(f"Fix: {f['fix']}")`,
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
  'copy-schema': {
    curl: `{
  "copy_rewrites": {
    "headline": "Get a ranked conversion audit in 90 seconds",
    "subheadline": "See exactly which elements are losing you revenue.",
    "cta_primary": "Run free audit",
    "cta_secondary": "See sample report",
    "value_prop": "210 checks. Benchmarks. Rewritten copy."
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

const KW = new Set([
  'curl','POST','GET','import','const','let','var','await','async',
  'function','return','true','false','null','undefined','from','export',
  'default','switch','case','break','if','else','for','while','class',
  'new','typeof','in','of','print','def','requests','fetch',
  'console','headers','body','method','status','Response',
])

function highlight(code: string): string {
  const e = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return code.split('\n').map(line => {
    const t = line.trimStart()
    if (t.startsWith('#')) {
      return `<span style="color:${T3}">${e(line)}</span>`
    }
    const out: string[] = []
    let i = 0
    while (i < line.length) {
      if (line[i] === '/' && line[i + 1] === '/') {
        out.push(`<span style="color:${T3}">${e(line.slice(i))}</span>`)
        i = line.length
        continue
      }
      if (line[i] === '"') {
        let j = i + 1
        while (j < line.length) {
          if (line[j] === '\\') { j += 2; continue }
          if (line[j] === '"') { j++; break }
          j++
        }
        out.push(`<span style="color:${GREEN}">${e(line.slice(i, j))}</span>`)
        i = j; continue
      }
      if (line[i] === "'") {
        let j = i + 1
        while (j < line.length) {
          if (line[j] === '\\') { j += 2; continue }
          if (line[j] === "'") { j++; break }
          j++
        }
        out.push(`<span style="color:${GREEN}">${e(line.slice(i, j))}</span>`)
        i = j; continue
      }
      if (line[i] === '`') {
        let j = i + 1
        while (j < line.length) {
          if (line[j] === '\\') { j += 2; continue }
          if (line[j] === '`') { j++; break }
          j++
        }
        out.push(`<span style="color:${GREEN}">${e(line.slice(i, j))}</span>`)
        i = j; continue
      }
      if (/[a-zA-Z_$]/.test(line[i])) {
        let j = i
        while (j < line.length && /[\w$]/.test(line[j])) j++
        const word = line.slice(i, j)
        out.push(KW.has(word)
          ? `<span style="color:${CYAN}">${e(word)}</span>`
          : `<span style="color:#8892A4">${e(word)}</span>`)
        i = j; continue
      }
      if (/\d/.test(line[i])) {
        let j = i
        while (j < line.length && /[\d.]/.test(line[j])) j++
        out.push(`<span style="color:${CYAN}">${e(line.slice(i, j))}</span>`)
        i = j; continue
      }
      out.push(`<span style="color:#8892A4">${e(line[i])}</span>`)
      i++
    }
    return out.join('')
  }).join('\n')
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
          <span style={{ fontFamily: MONO, fontSize: 12, color: CYAN }}>{r.param}</span>
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
          <span style={{ fontFamily: MONO, fontSize: 12, color: CYAN }}>{r.param}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: T3 }}>{r.type}</span>
          <span style={{ fontFamily: DISP, fontSize: 12, color: T2 }}>{r.description}</span>
        </div>
      ))}
    </div>
  )
}

interface FR { name: string; type: string; description: string }
function FieldTable({ rows }: { rows: FR[] }) {
  const cols = '170px 90px 1fr'
  const hdrs = ['FIELD', 'TYPE', 'DESCRIPTION']
  return (
    <div style={{ border: `1px solid ${BD}`, background: BG_R }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '8px 16px', borderBottom: `1px solid ${BD}` }}>
        {hdrs.map(h => <span key={h} style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, padding: '10px 16px', borderBottom: i < rows.length - 1 ? `1px solid ${BD}` : 'none' }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: CYAN }}>{r.name}</span>
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
          <span style={{ fontFamily: MONO, fontSize: 12, color: CYAN }}>{r.code}</span>
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
  return <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: T1, margin: '16px 0', letterSpacing: '-0.4px' }}>{children}</h2>
}
function Body({ children, mb = 24 }: { children: React.ReactNode; mb?: number }) {
  return <p style={{ fontFamily: DISP, fontSize: 14, color: T2, lineHeight: 1.8, marginBottom: mb }}>{children}</p>
}
function Mono({ children }: { children: React.ReactNode }) {
  return <code style={{ display: 'block', fontFamily: MONO, fontSize: 12, color: T2, background: BG_S, border: `1px solid ${BD}`, padding: '12px 16px' }}>{children}</code>
}

const SB: React.CSSProperties = { marginBottom: 64, paddingBottom: 64, borderBottom: `1px solid ${BD}` }
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
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: CYAN, letterSpacing: '0.08em' }}>
            webdoc.ai
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: T3, marginTop: 4 }}>API v1</div>
        </div>
        <nav style={{ flex: 1, paddingBottom: 24 }}>
          {NAV_GROUPS.map(g => (
            <div key={g.label}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: T3, textTransform: 'uppercase', letterSpacing: '0.2em', padding: '8px 24px', marginTop: 16 }}>
                {g.label}
              </div>
              {g.items.map(item => {
                const on = active === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      fontFamily: DISP, fontSize: 13, padding: '8px 24px',
                      cursor: 'pointer', border: 'none', outline: 'none',
                      background: on ? BG_I : 'transparent',
                      borderLeft: `2px solid ${on ? CYAN : 'transparent'}`,
                      color: on ? T1 : T2,
                      transition: 'color 0.15s',
                    }}
                  >
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
            <H2>webdoc API</H2>
            <Body>
              The webdoc API returns a structured conversion audit for any URL. POST a URL, get back a JSON object with a score, ranked findings, AI-rewritten copy, and industry benchmarks.
            </Body>
            <p style={{ fontFamily: MONO, fontSize: 11, color: T3, marginBottom: 8 }}>Base URL</p>
            <Mono>https://webdocai.com/api/v1</Mono>
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
            <Body mb={24}>webdoc uses standard HTTP status codes.</Body>
            <ErrTable rows={[
              { code: '400', meaning: 'Bad request — missing or invalid URL' },
              { code: '401', meaning: 'Unauthorized — invalid or missing API key' },
              { code: '402', meaning: 'Insufficient credits — top up required' },
              { code: '429', meaning: 'Rate limited — slow down requests' },
              { code: '500', meaning: 'Server error — retry with backoff' },
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
              { param: 'url',           type: 'string',  required: 'required', description: 'The URL to scan. Must include protocol.' },
              { param: 'fields',        type: 'array',   required: 'optional', description: 'Fields to include in response. Default: all.' },
              { param: 'finding_depth', type: 'string',  required: 'optional', description: "'brief' or 'full'. Default: 'full'." },
              { param: 'finding_limit', type: 'number',  required: 'optional', description: 'Max findings to return. Default: 10.' },
              { param: 'async',         type: 'boolean', required: 'optional', description: 'Return immediately with scan_id. Default: false.' },
              { param: 'webhook_url',   type: 'string',  required: 'optional', description: 'Required if async: true.' },
              { param: 'industry',      type: 'string',  required: 'optional', description: 'Override auto-detected industry.' },
            ]} />
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
            <EvBlock name="scan.completed" desc="Fires when a scan finishes successfully. Payload includes the full scan result." />
            <EvBlock name="scan.failed" desc="Fires when a scan fails after retries. Payload includes error details and scan ID." />
          </section>

          <section id="webhook-delivery" style={SB}>
            <Label>WEBHOOKS</Label>
            <H2>Delivery</H2>
            <Body>
              Every webhook POST includes a{' '}
              <code style={{ fontFamily: MONO, fontSize: 12 }}>Webdoc-Signature</code>{' '}
              header. Compute HMAC-SHA256 of the raw request body using your webhook secret and compare with timing-safe equality.
            </Body>
            <Body>
              Your endpoint must respond with HTTP 200 within 10 seconds. Non-200 responses trigger a retry.
            </Body>
          </section>

          <section id="webhook-retries" style={SB}>
            <Label>WEBHOOKS</Label>
            <H2>Retries</H2>
            <Body>
              webdoc retries failed deliveries up to 5 times with exponential backoff: 30s, 5m, 30m, 2h, 8h. Acknowledge immediately with 200 and process asynchronously to avoid timeouts.
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
      <aside style={{ width: 380, flexShrink: 0, background: BG_R, borderLeft: `1px solid ${BD}`, height: '100%', overflowY: 'auto' }}>
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
                  borderBottom: lang === l.id ? `2px solid ${CYAN}` : '2px solid transparent',
                  color: lang === l.id ? CYAN : T3,
                  transition: 'color 0.15s', marginBottom: -1,
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
          <pre
            style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.7, margin: 0, padding: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: highlight(code) }}
          />
        </div>
      </aside>

    </div>
  )
}
