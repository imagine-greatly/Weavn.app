'use client'

import Link from 'next/link'
import { CodeBlock } from '@/components/ui/CodeBlock'

// ── Data ──────────────────────────────────────────────────────────────────────

const CURL_CODE = `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer wdoc_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-site.com"}'`

const RATE_POINTS = [
  { label: 'PLAYGROUND', price: '$0.25', color: '#6F9BC6' },
  { label: 'DEV',        price: '$0.19', color: '#6F9BC6' },
  { label: 'BUILDER',    price: '$0.17', color: '#6F9BC6' },
  { label: 'SCALE',      price: '$0.15', color: '#00C48C' },
  { label: 'ENTERPRISE', price: '$0.11', color: '#00C48C' },
]

type SpecEntry = { k: string; v: string }

const API_SPECS: Record<string, SpecEntry[]> = {
  playground: [
    { k: 'trial_scans',     v: '25 free' },
    { k: 'then',            v: '$0.25/scan' },
    { k: 'async_mode',      v: 'false' },
    { k: 'batch_endpoint',  v: 'false' },
    { k: 'webhooks',        v: 'false' },
    { k: 'rate_limits',     v: 'standard' },
  ],
  dev: [
    { k: 'scans_per_month', v: '300' },
    { k: 'overage_rate',    v: '$0.19/scan' },
    { k: 'async_mode',      v: 'true' },
    { k: 'batch_endpoint',  v: 'false' },
    { k: 'webhooks',        v: 'true' },
    { k: 'rate_limits',     v: 'standard' },
  ],
  builder: [
    { k: 'scans_per_month', v: '1,000' },
    { k: 'overage_rate',    v: '$0.17/scan' },
    { k: 'async_mode',      v: 'true' },
    { k: 'batch_endpoint',  v: 'true' },
    { k: 'webhooks',        v: 'true' },
    { k: 'rate_limits',     v: 'standard' },
  ],
  scale: [
    { k: 'scans_per_month', v: '3,000' },
    { k: 'overage_rate',    v: '$0.15/scan' },
    { k: 'async_mode',      v: 'true' },
    { k: 'batch_endpoint',  v: 'true' },
    { k: 'webhooks',        v: 'true' },
    { k: 'rate_limits',     v: 'dedicated' },
  ],
  enterprise: [
    { k: 'scans_per_month', v: 'custom' },
    { k: 'overage_rate',    v: 'from $0.11/scan' },
    { k: 'async_mode',      v: 'true' },
    { k: 'batch_endpoint',  v: 'true' },
    { k: 'webhooks',        v: 'true' },
    { k: 'rate_limits',     v: 'dedicated' },
  ],
}

const TABLE_ROWS: { feature: string; values: string[] }[] = [
  { feature: 'scans / month',   values: ['25 free', '300',    '1,000',   '3,000',   'custom'    ] },
  { feature: 'overage rate',    values: ['$0.25',   '$0.18',  '$0.14',   '$0.11',   'custom'    ] },
  { feature: 'async mode',      values: ['✗',       '✓',      '✓',       '✓',       '✓'         ] },
  { feature: 'batch endpoint',  values: ['✗',       '✗',      '✓',       '✓',       '✓'         ] },
  { feature: 'webhooks',        values: ['✗',       '✗',      '✓',       '✓',       '✓'         ] },
  { feature: 'rate limits',     values: ['5/min',   '60/min', '200/min', '500/min', 'dedicated' ] },
  { feature: 'JSON response',   values: ['✓',       '✓',      '✓',       '✓',       '✓'         ] },
  { feature: 'cache hits free', values: ['✓',       '✓',      '✓',       '✓',       '✓'         ] },
]

function cellColor(v: string): string {
  if (v === '✓') return '#00C48C'
  if (v === '✗') return '#6E7587'
  if (v === 'dedicated' || v === 'custom') return '#9D8CFF'
  if (/^\$/.test(v) || /^[\d,]/.test(v) || v.includes('/min')) return '#6F9BC6'
  return '#9398A8'
}

const KEY_FACTS = [
  {
    name: 'CACHE POLICY',
    value: 'Cache policy',
    detail: 'Identical URL rescanned within 24h returns cached result at zero cost.',
    why: "Scan the same URL multiple times in your pipeline for free.",
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C', margin: 0 }}>
        cache_hit: true · cost_usd: 0.00
      </p>
    ),
  },
  {
    name: 'ASYNC MODE',
    value: 'Async mode',
    detail: 'POST with async: true. Result delivered to your endpoint when ready.',
    why: "Don't block your process waiting 90 seconds — fire and forget.",
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, margin: 0 }}>
        <span style={{ color: '#8080C0' }}>async</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#00C48C' }}>true</span>
        <span style={{ color: '#9398A8' }}> · </span>
        <span style={{ color: '#8080C0' }}>webhook_url</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#00C48C' }}>your-endpoint</span>
      </p>
    ),
  },
  {
    name: 'BATCH ENDPOINT',
    value: 'Batch endpoint',
    detail: 'POST /api/v1/scan/batch — parallel execution, single webhook response.',
    why: "Audit a full site's key pages in one request.",
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6', margin: 0 }}>
        POST /api/v1/scan/batch · up to 10 URLs
      </p>
    ),
  },
  {
    name: 'RESPONSE TIME',
    value: 'Response time',
    detail: 'p50: 87s · p95: 142s · measured across 30-day rolling window.',
    why: 'p95 is 142s — plan timeouts accordingly.',
    artifact: (
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, margin: 0 }}>
        <span style={{ color: '#8080C0' }}>p50</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#6F9BC6' }}>87s</span>
        <span style={{ color: '#9398A8' }}> · </span>
        <span style={{ color: '#8080C0' }}>p95</span>
        <span style={{ color: '#9398A8' }}>: </span>
        <span style={{ color: '#6F9BC6' }}>142s</span>
      </p>
    ),
  },
]

const FAQ_CARDS = [
  {
    q: 'How does authentication work?',
    a: 'Every request requires a Bearer token in the Authorization header. Keys start with wdoc_live_ and are scoped to your account and plan. Get your key from the developer portal. Do not expose keys in client-side code — requests must originate server-side.',
    dataLine: 'Authorization: Bearer wdoc_live_••••',
    dataColor: '#00C48C',
  },
  {
    q: 'Sync or async — which should I use?',
    a: 'Sync holds the connection and returns the full response when the scan completes (~90s). Use it for single scans where you can wait. Async returns immediately with a scan_id and POSTs the result to your webhook_url when ready — use it for batch processing or to avoid timeouts.',
    dataLine: 'async: false (sync) · async: true + webhook_url',
    dataColor: '#00C48C',
  },
  {
    q: 'How does caching work?',
    a: 'Identical URLs rescanned within 24 hours return the cached result at zero cost. Cache is invalidated when page content changes significantly — detected via fingerprint comparison. Force a fresh scan with force_refresh: true.',
    dataLine: 'cache_hit: true · cost_usd: 0.00',
    dataColor: '#6F9BC6',
  },
  {
    q: "What's in the batch endpoint?",
    a: 'POST up to 10 URLs in one request to /api/v1/scan/batch. All URLs scan in parallel. Results are delivered to your webhook_url as a single structured payload when all scans complete. Each URL in the batch consumes one scan credit.',
    dataLine: 'POST /api/v1/scan/batch · max 10 URLs',
    dataColor: '#00C48C',
  },
  {
    q: 'What if a site blocks the scanner?',
    a: 'webdoc uses Browserless Pro with stealth mode and a real Chrome user agent. Most sites scan cleanly. Cloudflare Enterprise with aggressive bot detection occasionally blocks — the API returns a structured error with block_reason: "automated_access_blocked".',
    dataLine: 'error: automated_access_blocked',
    dataColor: '#E8635F',
  },
  {
    q: 'Is there an uptime SLA?',
    a: 'Enterprise plans include a formal SLA. All other plans target 99.5% uptime. Status and incident history available at status.webdocai.com. Planned maintenance is announced 48 hours in advance via dashboard notification.',
    dataLine: 'target_uptime: 99.5% · SLA: enterprise_only',
    dataColor: '#00C48C',
  },
]

// ── Tokens ────────────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// ── Sub-components ────────────────────────────────────────────────────────────

function SpecRow({ k, v }: { k: string; v: string }) {
  const isTrue    = v === 'true'
  const isFalse   = v === 'false'
  const isSpecial = v === 'dedicated' || v === 'custom'
  const vColor    = isTrue ? '#00C48C' : isFalse ? '#6E7587' : isSpecial ? '#9D8CFF' : '#E6E9EE'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', ...MONO, fontSize: 11, marginBottom: 5 }}>
      <span style={{ color: '#8080c0', flexShrink: 0 }}>{k}</span>
      <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
      <span style={{ color: vColor }}>{v}</span>
    </div>
  )
}

function Ticks() {
  const b = '0.5px solid rgba(111,155,198,0.2)'
  return (
    <>
      <div aria-hidden style={{ position:'absolute', top:20, left:20,    width:14, height:14, borderTop:b, borderLeft:b,   pointerEvents:'none', zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute', top:20, right:20,   width:14, height:14, borderTop:b, borderRight:b,  pointerEvents:'none', zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute', bottom:20, left:20,  width:14, height:14, borderBottom:b, borderLeft:b,  pointerEvents:'none', zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute', bottom:20, right:20, width:14, height:14, borderBottom:b, borderRight:b, pointerEvents:'none', zIndex:1 }} />
    </>
  )
}

// JSON response lines (rendered with syntax colors for section 2)
function K({ c }: { c: string }) { return <span style={{ color: '#8080c0' }}>&quot;{c}&quot;</span> }
function S({ c }: { c: string }) { return <span style={{ color: '#00C48C' }}>&quot;{c}&quot;</span> }
function N({ c }: { c: string }) { return <span style={{ color: '#6F9BC6' }}>{c}</span> }
function Muted({ c }: { c: string }) { return <span style={{ color: '#6E7587' }}>{c}</span> }

// ── API card data ─────────────────────────────────────────────────────────────

type FeatValApi = string | boolean

function FValApi({ v }: { v: FeatValApi }) {
  if (v === true)        return <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C' }}>✓</span>
  if (v === false)       return <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</span>
  if (v === 'unlimited') return <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#00C48C' }}>{v}</span>
  if (v === 'dedicated') return <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#9D8CFF' }}>{v}</span>
  if (v === 'custom')    return <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6F9BC6' }}>{v}</span>
  return <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#E6E9EE' }}>{v}</span>
}

const API_FEATS: Array<{ key: string; values: [FeatValApi, FeatValApi, FeatValApi, FeatValApi, FeatValApi] }> = [
  { key: 'trial scans',      values: ['25',        false,        false,        false,        false]         },
  { key: 'overage rate',     values: ['$0.25/scan','$0.19/scan', '$0.17/scan', '$0.15/scan', 'from $0.11']  },
  { key: 'scans / month',    values: [false,        '300',        '1,000',      '3,000',      'custom']      },
  { key: 'async mode',       values: [false,        true,         true,         true,         true]          },
  { key: 'batch endpoint',   values: [false,        false,        true,         true,         true]          },
  { key: 'webhooks',         values: [false,        true,         true,         true,         true]          },
  { key: 'rate limits',      values: ['5/min',      '60/min',     '200/min',    '500/min',    'dedicated']   },
  { key: 'JSON response',    values: [true,         true,         true,         true,         true]          },
  { key: 'cache hits free',  values: [true,         true,         true,         true,         true]          },
  { key: 'support',          values: ['docs only',  'email',      'email',      'priority email', 'dedicated'] },
  { key: 'dedicated limits', values: [false,        false,        false,        true,         true]          },
  { key: 'SLA guarantee',    values: [false,        false,        false,        false,        true]          },
  { key: 'invoice billing',  values: [false,        false,        false,        false,        true]          },
]

const API_CARDS_DEF = [
  {
    tier: 'PLAYGROUND', tierColor: '#9D8CFF',
    price: '25 free', economy: 'then $0.25/scan', economyColor: '#9D8CFF',
    bestFor: 'Developers evaluating the API before building. No commitment required.',
    cta: 'GET API KEY →', ctaHref: '/auth?surface=api',
    accentColor: 'rgba(157,140,255,0.5)', ctaBorderColor: 'rgba(157,140,255,0.45)', ctaColor: '#9D8CFF',
  },
  {
    tier: 'DEV', tierColor: '#9D8CFF',
    price: '$29', economy: '/mo · 300 scans', economyColor: '#9D8CFF',
    bestFor: 'Solo developers integrating conversion intelligence into their first product.',
    cta: 'START DEV →', ctaHref: '/auth?surface=api&plan=dev',
    accentColor: 'rgba(157,140,255,0.5)', ctaBorderColor: 'rgba(157,140,255,0.45)', ctaColor: '#9D8CFF',
  },
  {
    tier: 'BUILDER', tierColor: '#9D8CFF',
    price: '$99', economy: '/mo · 1,000 scans', economyColor: '#9D8CFF',
    bestFor: 'Teams building audit pipelines or integrating webdoc into client workflows.',
    cta: 'START BUILDER →', ctaHref: '/auth?surface=api&plan=builder',
    accentColor: 'rgba(157,140,255,0.5)', ctaBorderColor: 'rgba(157,140,255,0.45)', ctaColor: '#9D8CFF',
  },
  {
    tier: 'SCALE', tierColor: '#00C48C',
    price: '$249', economy: '/mo · 3,000 scans · best value', economyColor: '#00C48C',
    bestFor: 'High-volume integrations and teams that need dedicated infrastructure and rate limits.',
    cta: 'START SCALE →', ctaHref: '/auth?surface=api&plan=scale',
    accentColor: 'rgba(0,196,140,0.5)', ctaBorderColor: 'rgba(0,196,140,0.45)', ctaColor: '#00C48C',
  },
  {
    tier: 'ENTERPRISE', tierColor: '#00C48C',
    price: 'Custom', economy: 'from $0.11/scan · SLA', economyColor: '#00C48C',
    bestFor: 'Organizations requiring custom volume, SLA guarantees, and dedicated support.',
    cta: 'TALK TO US →', ctaHref: 'mailto:hello@webdocai.com',
    accentColor: 'rgba(0,196,140,0.5)', ctaBorderColor: 'rgba(0,196,140,0.45)', ctaColor: '#00C48C',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <style>{`
        @keyframes dev-json-in { from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)} }
        .dev-jline { animation: dev-json-in 0.25s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .dev-jline { animation:none; opacity:1; transform:none; } }
      `}</style>

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 32px 64px', textAlign: 'center' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 1000px 700px at 50% 35%, rgba(157,140,255,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 500px 300px at 50% 0%, rgba(157,140,255,0.04) 0%, transparent 55%)',
          ].join(', '),
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 896, margin: '0 auto' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 20px' }}>
            API
          </p>
          <h1 style={{ ...DISP, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, letterSpacing: '-1.5px', color: '#E6E9EE', margin: '0 0 16px', lineHeight: 1.1 }}>
            One endpoint. Structured output. Per scan.
          </h1>
          <p style={{ ...SANS, fontSize: 16, lineHeight: 1.65, color: '#9398A8', maxWidth: 600, margin: '0 auto 32px' }}>
            POST any URL. Get score, ranked findings, benchmarks, and AI-rewritten copy as structured JSON.
            307 checks. No dashboard required.
          </p>

          {/* Curl block */}
          <div style={{
            maxWidth: 672, margin: '0 auto 24px',
            borderTop: '1px solid rgba(157,140,255,0.35)',
            borderLeft: '1px solid rgba(157,140,255,0.15)',
            borderRight: '1px solid rgba(157,140,255,0.08)',
            borderBottom: '1px solid rgba(157,140,255,0.05)',
            boxShadow: '0 0 0 1px rgba(157,140,255,0.15), 0 0 40px rgba(157,140,255,0.08)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(157,140,255,0.015) 2px, rgba(157,140,255,0.015) 4px)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <CodeBlock code={CURL_CODE} language="bash" />
            </div>
          </div>

          {/* Stat pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
            {['307 checks', '~90s median', 'cache hits free'].map(label => (
              <span key={label} style={{ background: 'rgba(157,140,255,0.06)', border: '0.5px solid rgba(157,140,255,0.2)', padding: '5px 12px', ...MONO, fontSize: 11, color: '#9D8CFF', letterSpacing: '0.05em' }}>
                {label}
              </span>
            ))}
          </div>

          {/* Primary + secondary CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 13, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '12px 28px', textDecoration: 'none', transition: 'all 0.15s', display: 'inline-block' }}>
              GET API KEY →
            </Link>
            <Link href="/docs/api" style={{ ...MONO, fontSize: 13, color: '#6E7587', border: '0.5px solid rgba(255,255,255,0.1)', padding: '12px 28px', textDecoration: 'none', transition: 'all 0.15s', display: 'inline-block' }}>
              READ THE DOCS →
            </Link>
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 2. RESPONSE SCHEMA ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(157,140,255,0.2)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 1000px 700px at 50% 50%, rgba(157,140,255,0.05) 0%, transparent 60%)',
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 896, margin: '0 auto', padding: '64px 32px 72px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', margin: '0 0 16px' }}>
            RESPONSE SCHEMA
          </p>
          <h2 style={{ ...DISP, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-1px', color: '#E6E9EE', margin: '0 0 40px', lineHeight: 1.15 }}>
            One response object. Every time.
          </h2>

          {/* JSON panel with streaming animation */}
          <div style={{
            borderTop: '1px solid rgba(157,140,255,0.4)',
            borderLeft: '1px solid rgba(157,140,255,0.2)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            boxShadow: '0 0 0 1px rgba(157,140,255,0.12), 0 0 50px rgba(157,140,255,0.08)',
            background: '#080D18',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ width: 5, height: 5, background: '#00C48C', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>response · application/json · 200 OK</span>
            </div>
            <div style={{ padding: '16px 20px', ...MONO, fontSize: 12, lineHeight: 1.7 }}>
              {[
                { delay: '0.1s',  content: <><Muted c="{" /></> },
                { delay: '0.25s', content: <>&nbsp;&nbsp;<K c="scan_id" /><Muted c=": " /><S c="sc_a8d3f2c1" /><Muted c="," /></> },
                { delay: '0.4s',  content: <>&nbsp;&nbsp;<K c="url" /><Muted c=": " /><S c="https://your-site.com" /><Muted c="," /></> },
                { delay: '0.55s', content: <>&nbsp;&nbsp;<K c="score" /><Muted c=": " /><span style={{ color: '#E8635F' }}>61</span><Muted c="," /></> },
                { delay: '0.7s',  content: <>&nbsp;&nbsp;<K c="severity" /><Muted c=": " /><span style={{ color: '#E8635F' }}>&quot;critical&quot;</span><Muted c="," /></> },
                { delay: '0.85s', content: <>&nbsp;&nbsp;<K c="percentile" /><Muted c=": " /><N c="63" /><Muted c="," /></> },
                { delay: '1.0s',  content: <>&nbsp;&nbsp;<K c="benchmark_data" /><Muted c=": {" /></> },
                { delay: '1.1s',  content: <>&nbsp;&nbsp;&nbsp;&nbsp;<K c="industry_avg" /><Muted c=": " /><N c="58" /><Muted c="," /></> },
                { delay: '1.2s',  content: <>&nbsp;&nbsp;&nbsp;&nbsp;<K c="vertical" /><Muted c=": " /><S c="B2B SaaS" /><Muted c="," /></> },
                { delay: '1.3s',  content: <>&nbsp;&nbsp;&nbsp;&nbsp;<K c="corpus_size" /><Muted c=": " /><N c="4812" /></> },
                { delay: '1.4s',  content: <>&nbsp;&nbsp;<Muted c="}," /></> },
                { delay: '1.5s',  content: <>&nbsp;&nbsp;<K c="findings" /><Muted c=": [" /></> },
                { delay: '1.6s',  content: <>&nbsp;&nbsp;&nbsp;&nbsp;<Muted c="{ " /><K c="priority" /><Muted c=": " /><S c="P1" /><Muted c=", " /><K c="category" /><Muted c=": " /><S c="hero_section" /><Muted c=" }" /></> },
                { delay: '1.7s',  content: <>&nbsp;&nbsp;&nbsp;&nbsp;<Muted c="{ " /><K c="estimated_lift" /><Muted c=": " /><span style={{ color: '#00C48C' }}>&quot;+12–18%&quot;</span><Muted c=", " /><K c="priority" /><Muted c=": " /><S c="P1" /><Muted c=" }" /></> },
                { delay: '1.8s',  content: <>&nbsp;&nbsp;<Muted c="]," /></> },
                { delay: '1.9s',  content: <>&nbsp;&nbsp;<K c="cost_usd" /><Muted c=": " /><N c="0.15" /><Muted c="," /></> },
                { delay: '2.0s',  content: <>&nbsp;&nbsp;<K c="duration_ms" /><Muted c=": " /><N c="87432" /></> },
                { delay: '2.1s',  content: <><Muted c="}" /></> },
              ].map((line, i) => (
                <div key={i} className="dev-jline" style={{ animationDelay: line.delay }}>
                  {line.content}
                </div>
              ))}
            </div>
          </div>

          {/* Schema facts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 32px', marginTop: 20 }}>
            {[
              'Build against this schema once — it never changes',
              'Every finding cites visible page evidence',
              'Same structure regardless of site type',
            ].map(fact => (
              <span key={fact} style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>
                · {fact}
              </span>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 3. RATE & PLANS ────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(111,155,198,0.15)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 1000px 700px at 60% 50%, rgba(0,196,140,0.04) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 400px at 10% 40%, rgba(111,155,198,0.04) 0%, transparent 55%)',
          ].join(', '),
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '64px 32px 80px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', margin: '0 0 40px' }}>
            API PLANS · RATE DECREASES WITH VOLUME
          </p>

          {/* Five plan cards */}
          <style>{`
            @media (max-width: 767px) { .dev-plans-grid { grid-template-columns: 1fr !important; } }
          `}</style>
          <div className="dev-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {API_CARDS_DEF.map((card, ci) => (
              <div key={card.tier} style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: card.accentColor }} />
                <div style={{ padding: '24px 24px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: card.tierColor, margin: '0 0 8px' }}>{card.tier}</p>
                  <p style={{ ...DISP, fontSize: 42, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 4px' }}>{card.price}</p>
                  <p style={{ ...MONO, fontSize: 10, color: card.economyColor, margin: '0 0 16px' }}>{card.economy}</p>
                  <p style={{ ...SANS, fontSize: 13, color: '#9398A8', lineHeight: 1.5, margin: '0 0 20px' }}>{card.bestFor}</p>
                  <Link
                    href={card.ctaHref}
                    style={{
                      display: 'block', textAlign: 'center', padding: '11px',
                      fontFamily: '"IBM Plex Mono", monospace', fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                      textDecoration: 'none', color: card.ctaColor,
                      border: `1px solid ${card.ctaBorderColor}`, background: 'transparent',
                      boxSizing: 'border-box', width: '100%',
                    }}
                  >{card.cta}</Link>
                </div>
                <div style={{ padding: '20px 24px', flexGrow: 1 }}>
                  {API_FEATS.map((row, ri) => (
                    <div
                      key={row.key}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '9px 0',
                        borderBottom: ri < API_FEATS.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                      }}
                    >
                      <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#9398A8' }}>{row.key}</span>
                      <FValApi v={row.values[ci]} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 4. INCLUDED ON ALL PLANS ────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#080D18', borderTop: '0.5px solid rgba(157,140,255,0.15)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(157,140,255,0.04) 0%, transparent 60%)',
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '64px 32px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9D8CFF', textAlign: 'center', margin: '0 0 32px' }}>
            INCLUDED ON ALL PLANS
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {KEY_FACTS.map((fact) => (
              <div
                key={fact.name}
                style={{
                  background: '#0A0E18',
                  borderTop: '1px solid rgba(157,140,255,0.35)',
                  borderLeft: '1px solid rgba(157,140,255,0.1)',
                  borderRight: '1px solid rgba(255,255,255,0.04)',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  padding: '20px 22px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}
              >
                <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9D8CFF', margin: 0 }}>
                  {fact.name}
                </p>
                <p style={{ ...DISP, fontSize: 17, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
                  {fact.value}
                </p>
                <p style={{ ...SANS, fontSize: 14, lineHeight: 1.6, color: '#9398A8', margin: 0 }}>
                  {fact.detail}
                </p>
                <p style={{ ...SANS, fontSize: 13, lineHeight: 1.5, color: '#6E7587', fontStyle: 'italic', margin: '2px 0 0' }}>
                  {fact.why}
                </p>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 }}>
                  {fact.artifact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 5. FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse 900px 600px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 65%)',
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '64px 32px 80px' }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6F9BC6', margin: '0 0 32px' }}>
            TECHNICAL QUESTIONS
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQ_CARDS.map((card, i) => (
              <div key={i} className="wd-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
                <p style={{ ...DISP, fontSize: 16, fontWeight: 600, color: '#E6E9EE', margin: '0 0 10px' }}>{card.q}</p>
                <p style={{ ...SANS, fontSize: 14, lineHeight: 1.65, color: '#9398A8', margin: '0 0 16px', flexGrow: 1 }}>{card.a}</p>
                <p style={{ ...MONO, fontSize: 11, color: card.dataColor, margin: 0 }}>{card.dataLine}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="section-separator" />

      {/* ── 6. EXIT BAND ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '0.5px solid rgba(157,140,255,0.2)' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: [
            'radial-gradient(ellipse 600px 400px at 25% 50%, rgba(111,155,198,0.04) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 400px at 75% 50%, rgba(157,140,255,0.05) 0%, transparent 60%)',
          ].join(', '),
        }} />
        <Ticks />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>
          {/* Dashboard plans */}
          <div style={{ flex: 1, padding: '48px 40px', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>Need a full dashboard?</p>
            <p style={{ ...DISP, fontSize: 18, fontWeight: 600, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>Score trending. Client workspaces. White-label reports.</p>
            <p style={{ ...SANS, fontSize: 13, color: '#6E7587', margin: '0 0 20px' }}>For founders diagnosing their own site and agencies managing clients.</p>
            <Link href="/pricing" style={{ ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 20px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}>
              See dashboard plans →
            </Link>
          </div>

          {/* GET API KEY — primary */}
          <div style={{ flex: 1, padding: '48px 40px' }}>
            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9D8CFF', margin: '0 0 8px' }}>Ready to build?</p>
            <p style={{ ...DISP, fontSize: 18, fontWeight: 600, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>25 free scans. No subscription. Start in minutes.</p>
            <p style={{ ...SANS, fontSize: 13, color: '#6E7587', margin: '0 0 20px' }}>Same engine on every plan. Build against the schema once.</p>
            <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '10px 20px', textDecoration: 'none', display: 'inline-block', transition: 'all 0.15s' }}>
              GET API KEY →
            </Link>
          </div>
        </div>
      </section>

    </main>
  )
}
