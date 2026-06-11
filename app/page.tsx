'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import WebdocMark from '@/components/ui/WebdocMark'

// ── Syntax-highlighted JSON primitives ──────────────────────────────────────

function K({ c }: { c: string }) {
  return <span className="text-[#8080c0]">{c}</span>  // json-key purple
}
function M({ c }: { c: string }) {
  return <span className="text-[#6F9BC6]">{c}</span>  // json-metric blue (measurement/dimension keys)
}
function S({ c }: { c: string }) {
  return <span className="text-score-high">{c}</span>
}
function N({ c }: { c: string }) {
  return <span className="text-cyan-DEFAULT">{c}</span>
}
function P({ c }: { c: string }) {
  return <span className="text-text-tertiary">{c}</span>
}

// ── Nav ─────────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[52px] bg-background-base/90 backdrop-blur-md border-b border-background-border flex items-center px-8">
      <div className="flex items-center gap-8 flex-1">
        <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
          webdoc<span className="text-[#6F9BC6]">.ai</span>
        </Link>
        <div className="flex items-center gap-6">
          {['Pricing', 'Developers', 'Docs', 'Changelog'].map(link => (
            <Link
              key={link}
              href={`/${link.toLowerCase()}`}
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 no-underline"
            >
              {link}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-body text-sm text-text-secondary no-underline hover:text-text-primary transition-colors duration-150">
          Scan my site
        </Link>
        <Link
          href="/auth?surface=dashboard"
          className="border border-background-border font-body text-sm text-text-secondary px-4 py-1.5 no-underline hover:text-text-primary hover:border-text-tertiary transition-colors duration-150"
        >
          Dashboard →
        </Link>
        <Link
          href="/auth?surface=api"
          className="font-body font-semibold text-sm px-4 py-1.5 no-underline transition-all duration-150"
          style={{ background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', color: '#6F9BC6' }}
        >
          Get API key →
        </Link>
      </div>
    </nav>
  )
}

// ── Hero JSON panel ──────────────────────────────────────────────────────────

function HeroJson() {
  return (
    <div className="font-mono text-xs leading-relaxed">
      <P c="{" />{'\n'}
      {'  '}<K c='"scan_id"' /><P c=": " /><S c='"scan_01HXYZ7K2M9N3P4Q"' /><P c="," />{'\n'}
      {'  '}<K c='"url"' /><P c=": " /><S c='"https://acme-saas.com"' /><P c="," />{'\n'}
      {'  '}<M c='"score"' /><P c=": " /><N c="61" /><P c="," />{'\n'}
      {'  '}<K c='"industry"' /><P c=": " /><S c='"B2B SaaS"' /><P c="," />{'\n'}
      {'  '}<K c='"benchmark"' /><P c=": {" />{'\n'}
      {'    '}<M c='"industry_avg"' /><P c=": " /><N c="54" /><P c="," />{'\n'}
      {'    '}<M c='"top_quartile"' /><P c=": " /><N c="78" /><P c="," />{'\n'}
      {'    '}<M c='"percentile"' /><P c=": " /><N c="63" />{'\n'}
      {'  '}<P c="}," />{'\n'}
      {'  '}<K c='"findings"' /><P c=": [" />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="1" /><P c="," />{'\n'}
      {'      '}<M c='"severity"' /><P c=": " /><S c='"critical"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"value_proposition"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"Hero headline is feature-led, not outcome-led"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"12–18% conversion uplift"' />{'\n'}
      {'    '}<P c="}," />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="2" /><P c="," />{'\n'}
      {'      '}<M c='"severity"' /><P c=": " /><S c='"high"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"social_proof"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"No above-fold proof — testimonials buried at 2,400px"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"8–11% conversion uplift"' />{'\n'}
      {'    '}<P c="}," />{'\n'}
      {'    '}<P c="{" />{'\n'}
      {'      '}<K c='"priority"' /><P c=": " /><N c="3" /><P c="," />{'\n'}
      {'      '}<M c='"severity"' /><P c=": " /><S c='"high"' /><P c="," />{'\n'}
      {'      '}<K c='"category"' /><P c=": " /><S c='"cta_clarity"' /><P c="," />{'\n'}
      {'      '}<K c='"title"' /><P c=": " /><S c='"Dual primary CTAs create decision paralysis"' /><P c="," />{'\n'}
      {'      '}<K c='"estimated_lift"' /><P c=": " /><S c='"6–9% conversion uplift"' />{'\n'}
      {'    '}<P c="}" />{'\n'}
      {'  '}<P c="]," />{'\n'}
      {'  '}<K c='"rewritten_copy"' /><P c=": {" />{'\n'}
      {'    '}<K c='"headline"' /><P c=": " /><S c='"Ship projects on time, every time."' /><P c="," />{'\n'}
      {'    '}<K c='"cta_primary"' /><P c=": " /><S c='"Start free — no credit card"' />{'\n'}
      {'  '}<P c="}," />{'\n'}
      {'  '}<K c='"cost_usd"' /><P c=": " /><N c="0.15" /><P c="," />{'\n'}
      {'  '}<K c='"duration_ms"' /><P c=": " /><N c="87340" />{'\n'}
      <P c="}" />
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────

type HeroTab = 'api' | 'report' | 'agency'

const HERO_TABS: { id: HeroTab; label: string }[] = [
  { id: 'api', label: 'API Response' },
  { id: 'report', label: 'Scan Report' },
  { id: 'agency', label: 'Agency View' },
]

const REPORT_FINDINGS = [
  { severity: 'critical' as const, lift: '↑ 12–18% lift', title: 'Hero headline is feature-led, not outcome-led' },
  { severity: 'high' as const, lift: '↑ 8–11% lift', title: 'No above-fold proof — first signal at 2,400px' },
  { severity: 'high' as const, lift: '↑ 6–9% lift', title: 'Dual CTAs create decision paralysis' },
]

const AGENCY_CLIENTS = [
  { domain: 'acme-saas.com', score: 61, delta: 8, positive: true },
  { domain: 'techflow.io', score: 74, delta: 3, positive: true },
  { domain: 'buildspace.so', score: 48, delta: 3, positive: false },
  { domain: 'loops.so', score: 79, delta: 5, positive: true },
]

function HeroSection() {
  const [activeHeroTab, setActiveHeroTab] = useState<HeroTab>('api')
  const [scanUrl, setScanUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const router = useRouter()

  const handleScan = async () => {
    if (!scanUrl || isScanning) return
    setScanError('')
    setIsScanning(true)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl }),
      })
      if (res.status === 401) {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pendingUrl', scanUrl)
        router.push('/auth?surface=dashboard')
        return
      }
      const data = await res.json()
      if (data.reportId) {
        router.push(`/reports/${data.reportId}`)
      } else if (data.error) {
        setScanError(data.error)
      }
    } catch {
      setScanError('Scan failed. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <section className="scanline-texture min-h-screen pt-[120px] pb-20 px-8 relative overflow-hidden">

      {/* Ambient blooms */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: [
            'radial-gradient(ellipse 1000px 800px at 50% 30%, rgba(111,155,198,0.05) 0%, transparent 60%)',
            'radial-gradient(ellipse 600px 400px at 50% 90%, rgba(111,155,198,0.03) 0%, transparent 55%)',
            'radial-gradient(ellipse 1200px 800px at 75% 50%, rgba(111,155,198,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 800px 600px at 20% 80%, rgba(128,128,192,0.06) 0%, transparent 55%)',
          ].join(', '),
        }}
      />
      {/* Corner ticks */}
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.15)', borderLeft: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.15)', borderRight: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.15)', borderLeft: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.15)', borderRight: '0.5px solid rgba(111,155,198,0.15)', pointerEvents: 'none', zIndex: 1 }} />

      <div className="max-w-[1280px] mx-auto flex gap-16 items-start relative z-10">

        {/* Left column */}
        <div className="flex-[55] min-w-0">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 bg-background-raised border border-background-border px-3 py-1 mb-8">
            <span className="status-dot w-1.5 h-1.5 rounded-full bg-score-high flex-shrink-0" />
            <span className="font-mono text-xs text-text-tertiary">POST /api/v1/scan → 200 OK · 87,340ms</span>
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-5xl leading-[1.04] tracking-[-0.04em] text-text-primary">
            307 checks. Your score<br />
            <span className="text-cyan-DEFAULT">in 90 seconds.</span>
          </h1>

          {/* Subheadline */}
          <p className="font-body text-lg text-text-secondary leading-relaxed max-w-md mt-5">
            Paste any URL. Get a full conversion audit — score, ranked findings, AI-rewritten copy, benchmarked against real sites in your vertical.
          </p>

          {/* Curl block */}
          <div className="wd-panel p-4 mt-8">
            <pre className="font-mono text-sm m-0 leading-relaxed whitespace-pre-wrap">
              <span className="text-cyan-DEFAULT">curl</span>
              <span className="text-text-tertiary">{' -X POST https://webdocai.com/api/v1/scan \\\n  -H "Authorization: Bearer '}</span>
              <span className="text-score-high">wdoc_live_••••</span>
              <span className="text-text-tertiary">{'" \\\n  -d \''}</span>
              <span className="text-text-tertiary">{'{"url": "'}</span>
              <span className="text-score-high">https://your-site.com</span>
              <span className="text-text-tertiary">{'"}\''}  </span>
            </pre>
          </div>

          {/* Scan input */}
          <div className="mt-8 flex flex-col gap-2">
            <div className="flex gap-0">
              <input
                type="url"
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleScan() }}
                placeholder="https://your-site.com"
                className="font-mono text-sm text-text-primary bg-background-raised border border-background-border px-4 py-3 outline-none flex-1"
                style={{ borderRadius: 0, borderRight: 'none' }}
              />
              <button
                onClick={() => void handleScan()}
                disabled={isScanning || !scanUrl}
                className="font-mono text-sm px-6 py-3 cursor-pointer transition-all duration-150"
                style={{ background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', color: '#6F9BC6', borderRadius: 0, opacity: isScanning || !scanUrl ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                {isScanning ? 'SCANNING...' : 'SCAN MY SITE →'}
              </button>
            </div>
            {scanError && (
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#E8635F', margin: 0 }}>{scanError}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-1">
              <Link
                href="/auth?surface=api"
                className="font-body font-bold text-sm px-6 py-3 no-underline transition-all duration-150"
                style={{ background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', color: '#6F9BC6' }}
              >
                Get API key →
              </Link>
              <Link
                href="/playground"
                className="border border-background-border text-text-secondary font-body text-sm px-6 py-3 no-underline hover:border-text-tertiary hover:text-text-primary transition-colors duration-150"
              >
                Try API playground →
              </Link>
            </div>
          </div>

        </div>

        {/* Right column — terminal panel */}
        <div
          className="flex-[45] min-w-0 relative bg-background-raised"
          style={{
            boxShadow: '0 0 0 1px rgba(0,196,140,0.25), 0 0 40px rgba(0,196,140,0.12), 0 0 80px rgba(0,196,140,0.06), 0 0 120px rgba(0,196,140,0.08)',
            borderTop: '1px solid rgba(111,155,198,0.35)',
            borderLeft: '0.5px solid rgba(111,155,198,0.15)',
            borderRight: '0.5px solid rgba(255,255,255,0.06)',
            borderBottom: '0.5px solid rgba(255,255,255,0.04)',
          }}
        >

          {/* Tab bar */}
          <div className="flex border-b border-background-border bg-background-subtle">
            {HERO_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveHeroTab(tab.id)}
                className={`font-mono text-xs px-4 py-2.5 border-0 cursor-pointer transition-colors duration-150 ${
                  activeHeroTab === tab.id
                    ? 'border-b-2 border-[#6F9BC6] text-[#6F9BC6] bg-background-raised -mb-px'
                    : 'text-text-tertiary hover:text-text-secondary bg-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Window chrome */}
          <div className="bg-background-subtle border-b border-background-border px-4 py-2.5 flex items-center gap-2">
            <span className="w-2 h-2 bg-severity-critical/30" />
            <span className="w-2 h-2 bg-severity-medium/30" />
            <span className="w-2 h-2 bg-score-high/30" />
            <span className="font-mono text-xs text-text-tertiary ml-2">
              {activeHeroTab === 'api' && 'response.json'}
              {activeHeroTab === 'report' && 'report.html'}
              {activeHeroTab === 'agency' && 'clients.dashboard'}
            </span>
            <div className="ml-auto">
              {activeHeroTab === 'agency'
                ? <span className="font-mono text-xs text-text-tertiary">8 clients</span>
                : <ScoreRing score={61} size="sm" animated={activeHeroTab === 'api'} />
              }
            </div>
          </div>

          {/* Tab content */}
          <div className="p-5 overflow-auto max-h-[calc(100vh-220px)] relative">

            {activeHeroTab === 'api' && (
              <>
                <HeroJson />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background-raised to-transparent pointer-events-none" />
              </>
            )}

            {activeHeroTab === 'report' && (
              <div>
                <div className="flex items-center gap-4 mb-5">
                  <ScoreRing size="md" animated={false} score={61} />
                  <div>
                    <div className="font-display font-bold text-lg text-text-primary">acme-saas.com</div>
                    <div className="font-mono text-xs text-text-tertiary mt-1">63rd percentile · B2B SaaS</div>
                  </div>
                </div>
                {REPORT_FINDINGS.map((f, i) => (
                  <div key={i} className="bg-background-subtle border border-background-border p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.severity === 'critical' ? 'bg-severity-critical' : 'bg-severity-high'}`} />
                      <span className="font-mono text-xs text-text-tertiary">{f.severity}</span>
                      <span className="ml-auto font-mono text-xs text-score-mid">{f.lift}</span>
                    </div>
                    <div className="font-body text-xs text-text-primary leading-snug">{f.title}</div>
                  </div>
                ))}
                <div className="bg-background-subtle border-l-2 border-[#6F9BC6] px-3 py-2 mt-3">
                  <div className="font-mono text-xs text-text-tertiary mb-1">AI REWRITE</div>
                  <div className="font-body text-xs text-text-primary">Ship projects on time, every time.</div>
                </div>
              </div>
            )}

            {activeHeroTab === 'agency' && (
              <div>
                {AGENCY_CLIENTS.map(c => (
                  <div key={c.domain} className="flex items-center gap-3 py-3 border-b border-background-border last:border-0">
                    <ScoreRing size="sm" animated={false} score={c.score} />
                    <div className="flex-1">
                      <div className="font-body text-xs text-text-primary">{c.domain}</div>
                      <div className="font-mono text-xs text-text-tertiary mt-0.5">Last scan: 2 days ago</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className={`font-mono text-xs px-1.5 py-0.5 ${c.positive ? 'bg-score-high/10 text-score-high' : 'bg-severity-critical/10 text-severity-critical'}`}>
                        {c.positive ? `↑${c.delta}` : `↓${c.delta}`}
                      </span>
                      <span className="font-body text-xs text-[#6F9BC6]">Report →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  )
}

// ── Style tokens ─────────────────────────────────────────────────────────────

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

// ── Two Surface ──────────────────────────────────────────────────────────────

function TwoSurfaceSection() {
  return (
    <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden', background: '#050810' }}>

      <style>{`
        @media (max-width: 639px) { .ts-veins { display: none !important; } }
      `}</style>

      {/* Ambient blooms */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 600px 700px at 20% 75%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 600px 700px at 80% 75%, rgba(157,140,255,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 800px 400px at 50% 20%, rgba(111,155,198,0.04) 0%, transparent 55%)',
        ].join(', '),
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderLeft: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.25)', borderRight: '0.5px solid rgba(111,155,198,0.25)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Section header */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>THE ENGINE</p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          One engine. Two ways in.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 560, lineHeight: 1.65, margin: '0 0 56px' }}>
          The same 307-check scan engine underneath everything. Use the dashboard if you want results without writing code. Use the API if you want to build with the data.
        </p>

        {/* Engine convergence visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>

          <WebdocMark size={80} animated={true} />

          {/* Engine label */}
          <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: 'rgba(111,155,198,0.5)', margin: '7px 0 0' }}>SCAN ENGINE</p>

          {/* Static vein paths — one engine, two surfaces */}
          <svg
            className="ts-veins"
            viewBox="0 0 900 120"
            width="100%"
            height="120"
            preserveAspectRatio="xMidYMid meet"
            overflow="visible"
            aria-hidden
            style={{ display: 'block' }}
          >
            <defs>
              <filter id="vein-glow" x="-50%" y="-100%" width="200%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path
              d="M 450,0 C 442,18 418,42 370,62 C 310,86 220,105 150,116"
              stroke="#6F9BC6"
              strokeWidth="0.8"
              fill="none"
              opacity="0.55"
              filter="url(#vein-glow)"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 450,0 C 458,18 482,42 530,62 C 590,86 680,105 750,116"
              stroke="#9D8CFF"
              strokeWidth="0.8"
              fill="none"
              opacity="0.55"
              filter="url(#vein-glow)"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* Two surface cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ alignItems: 'stretch' }}>

          {/* DASHBOARD — steel blue */}
          <div className="wd-panel" style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(111,155,198,0.4)',
            borderLeft: '1px solid rgba(111,155,198,0.12)',
            boxShadow: '0 0 0 1px rgba(111,155,198,0.08), 0 0 28px rgba(111,155,198,0.06)',
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#6F9BC6', margin: '0 0 10px' }}>Dashboard</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Results without code.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                Paste your URL. See your score. Get a ranked list of exactly what to fix — written in plain English. No technical knowledge required.
              </p>
            </div>
            <div style={{ padding: '20px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {[
                'Full conversion audit in 90 seconds',
                'Findings ranked by revenue impact',
                'AI-rewritten copy included',
              ].map(line => (
                <p key={line} style={{ ...SANS, fontSize: 13, color: '#9398A8', margin: '0 0 8px' }}>
                  · {line}
                </p>
              ))}
            </div>
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/dashboard" style={{ ...MONO, fontSize: 11, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '10px 14px', display: 'block', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent' }}>
                See how it works →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center' as const, marginTop: 8, marginBottom: 0 }}>Free to start · no credit card</p>
            </div>
          </div>

          {/* API — purple */}
          <div className="wd-panel" style={{
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(157,140,255,0.4)',
            borderLeft: '1px solid rgba(157,140,255,0.12)',
            boxShadow: '0 0 0 1px rgba(157,140,255,0.08), 0 0 28px rgba(157,140,255,0.07)',
          }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#9D8CFF', margin: '0 0 10px' }}>API</p>
              <h3 style={{ ...DISP, fontWeight: 700, fontSize: 22, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.25 }}>Build with the data.</h3>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                POST any URL. Get structured JSON back — score, ranked findings, benchmarks, rewritten copy. Integrate conversion intelligence into anything you build.
              </p>
            </div>
            <div style={{ padding: '20px 24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {([
                { k: 'endpoint',       v: 'POST /api/v1/scan' },
                { k: 'response',       v: 'structured JSON' },
                { k: 'trial_scans',    v: '25 free' },
                { k: 'async_mode',     v: 'true' },
                { k: 'batch_endpoint', v: 'true' },
              ] as { k: string; v: string }[]).map(s => (
                <div key={s.k} style={{ display: 'flex', alignItems: 'baseline', ...MONO, fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: '#8080c0', flexShrink: 0 }}>{s.k}</span>
                  <span style={{ color: '#6E7587', margin: '0 3px' }}>:</span>
                  <span style={{ color: s.v === 'true' || s.v === 'structured JSON' || s.v === '25 free' ? '#00C48C' : s.v.startsWith('POST') ? '#9D8CFF' : '#E6E9EE' }}>{s.v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px 24px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
              <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 11, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '10px 14px', display: 'block', textAlign: 'center' as const, textDecoration: 'none', background: 'transparent' }}>
                Get API key →
              </Link>
              <p style={{ ...MONO, fontSize: 10, color: '#6E7587', textAlign: 'center' as const, marginTop: 8, marginBottom: 0 }}>25 free scans · from $29/mo</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Stats Band ────────────────────────────────────────────────────────────────

function StatsBand() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 0 0 0', borderTop: '0.5px solid rgba(111,155,198,0.12)' }}>
      <style>{`
        @keyframes sb-marker-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .sb-marker-enter { animation: sb-marker-in 0.6s ease-out 0.4s both; }
        @media (prefers-reduced-motion: reduce) { .sb-marker-enter { animation:none; opacity:1; transform:none; } }
        @media (max-width: 767px) {
          .sb-stat-strip { flex-wrap: wrap !important; }
          .sb-stat-strip > .sb-stat-cell { flex: 0 0 50% !important; min-width: 0; }
          .sb-stat-strip > .sb-corpus-cell { flex: 0 0 100% !important; border-right: none !important; border-top: 0.5px solid rgba(111,155,198,0.08) !important; }
          .sb-curve-svg { height: 180px !important; }
        }
      `}</style>

      {/* Atmosphere */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 1200px 600px at 50% 30%, rgba(111,155,198,0.05) 0%, transparent 60%)',
          'radial-gradient(ellipse 600px 400px at 20% 60%, rgba(157,140,255,0.03) 0%, transparent 55%)',
        ].join(', '),
      }} />

      {/* Corner ticks */}
      <div aria-hidden style={{ position:'absolute',top:20,left:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.18)',borderLeft:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',top:20,right:20,width:14,height:14,borderTop:'0.5px solid rgba(111,155,198,0.18)',borderRight:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,left:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.18)',borderLeft:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />
      <div aria-hidden style={{ position:'absolute',bottom:20,right:20,width:14,height:14,borderBottom:'0.5px solid rgba(111,155,198,0.18)',borderRight:'0.5px solid rgba(111,155,198,0.18)',pointerEvents:'none',zIndex:1 }} />

      {/* ── TOP CONTENT ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 48px 48px', position: 'relative', zIndex: 1 }}>

        {/* Kicker + headline + subcopy */}
        <div style={{ maxWidth: 680 }}>
          <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
            CORPUS DATA
          </p>
          <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(32px,4vw,48px)', color: '#E6E9EE', letterSpacing: '-0.5px', margin: '0 0 16px', lineHeight: 1.1 }}>
            Not an average. A percentile.
          </h2>
          <p style={{ ...SANS, fontSize: 15, color: '#9398A8', lineHeight: 1.65, margin: 0 }}>
            Every score is positioned against real sites in your exact vertical — not a generic industry average. B2B SaaS vs B2B SaaS. Ecommerce vs ecommerce. The corpus grows with every scan.
          </p>
        </div>

        {/* Instrument strip */}
        <div
          className="sb-stat-strip"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            marginTop: 40,
            borderTop: '0.5px solid rgba(111,155,198,0.12)',
            borderBottom: '0.5px solid rgba(111,155,198,0.12)',
          }}
        >
          {([
            { value: '4,800+', label: 'SITES SCANNED',      color: '#E6E9EE' },
            { value: '58',     label: 'AVERAGE SCORE',       color: 'rgba(111,155,198,0.32)' },
            { value: '23',     label: 'AVG FINDINGS',        color: 'rgba(111,155,198,0.32)' },
            { value: '76%',    label: 'NO ABOVE-FOLD PROOF', color: '#E8635F' },
          ] as { value: string; label: string; color: string }[]).map(s => (
            <div
              key={s.label}
              className="sb-stat-cell"
              style={{ flex: 1, padding: '20px 28px', borderRight: '0.5px solid rgba(111,155,198,0.08)' }}
            >
              <div style={{ ...DISP, fontSize: 40, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(111,155,198,0.25)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}

          {/* Corpus facts cell */}
          <div
            className="sb-corpus-cell"
            style={{ flex: '0 0 240px', padding: '20px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, borderLeft: '0.5px solid rgba(111,155,198,0.1)' }}
          >
            <p style={{ ...MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(111,155,198,0.35)', margin: '0 0 8px' }}>CORPUS</p>
            {([
              { k: 'corpus_size', v: '4,812', vc: '#6F9BC6' },
              { k: 'verticals',   v: '14',    vc: '#6F9BC6' },
              { k: 'updated',     v: 'weekly', vc: '#00C48C' },
            ] as { k: string; v: string; vc: string }[]).map(row => (
              <div key={row.k} style={{ ...MONO, fontSize: 11, display: 'flex' }}>
                <span style={{ color: '#8080c0' }}>{row.k}</span>
                <span style={{ color: '#6E7587' }}>: </span>
                <span style={{ color: row.vc }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FULL-BLEED CURVE ── */}
      <svg
        className="sb-curve-svg"
        width="100%"
        height="280"
        viewBox="0 0 1440 280"
        preserveAspectRatio="none"
        overflow="visible"
        aria-hidden
        style={{ display: 'block', marginTop: 0 }}
      >
        <defs>
          <linearGradient id="sbZoneGrad" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#E8635F" stopOpacity="0.06" />
            <stop offset="35%"  stopColor="#6F9BC6" stopOpacity="0.04" />
            <stop offset="65%"  stopColor="#6F9BC6" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#00C48C" stopOpacity="0.07" />
          </linearGradient>

          <linearGradient id="sbCurveFill" x1="0" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#6F9BC6" stopOpacity="0.07" />
            <stop offset="60%"  stopColor="#6F9BC6" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#6F9BC6" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="sbCurveStroke" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#E8635F" stopOpacity="0.25" />
            <stop offset="20%"  stopColor="#E8635F" stopOpacity="0.15" />
            <stop offset="38%"  stopColor="#6F9BC6" stopOpacity="0.6" />
            <stop offset="55%"  stopColor="#6F9BC6" stopOpacity="0.95" />
            <stop offset="65%"  stopColor="#6F9BC6" stopOpacity="0.85" />
            <stop offset="82%"  stopColor="#6F9BC6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00C48C" stopOpacity="0.2" />
          </linearGradient>

          <filter id="sbCurveGlow" x="-5%" y="-60%" width="110%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="sbMarkerGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Zone fill */}
        <path
          d="M 0,276 C 60,276 140,275 240,272 C 320,269 400,262 490,248 C 560,237 610,218 660,192 C 710,165 740,132 770,100 C 795,73 810,48 830,28 C 848,10 862,3 878,8 C 894,13 908,32 925,58 C 945,88 965,122 995,158 C 1025,192 1065,224 1120,246 C 1175,262 1250,271 1340,275 C 1390,276 1420,276 1440,276 L 1440,280 L 0,280 Z"
          fill="url(#sbZoneGrad)"
          stroke="none"
        />

        {/* 2. Gridlines at 25 / 50 / 75 */}
        <line x1="360"  y1="20" x2="360"  y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
        <line x1="720"  y1="20" x2="720"  y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />
        <line x1="1080" y1="20" x2="1080" y2="270" stroke="rgba(111,155,198,0.04)" strokeWidth="0.75" />

        {/* 3. Curve fill */}
        <path
          d="M 0,276 C 60,276 140,275 240,272 C 320,269 400,262 490,248 C 560,237 610,218 660,192 C 710,165 740,132 770,100 C 795,73 810,48 830,28 C 848,10 862,3 878,8 C 894,13 908,32 925,58 C 945,88 965,122 995,158 C 1025,192 1065,224 1120,246 C 1175,262 1250,271 1340,275 C 1390,276 1420,276 1440,276 L 1440,280 L 0,280 Z"
          fill="url(#sbCurveFill)"
          stroke="none"
        />

        {/* 4. Curve stroke — horizontal color gradient + glow */}
        <path
          d="M 0,276 C 60,276 140,275 240,272 C 320,269 400,262 490,248 C 560,237 610,218 660,192 C 710,165 740,132 770,100 C 795,73 810,48 830,28 C 848,10 862,3 878,8 C 894,13 908,32 925,58 C 945,88 965,122 995,158 C 1025,192 1065,224 1120,246 C 1175,262 1250,271 1340,275 C 1390,276 1420,276 1440,276"
          fill="none"
          stroke="url(#sbCurveStroke)"
          strokeWidth="1.2"
          filter="url(#sbCurveGlow)"
          vectorEffect="non-scaling-stroke"
        />

        {/* 5. AVG 58 marker */}
        <line x1="862" y1="20" x2="862" y2="260" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
        <text x="862" y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(255,255,255,0.15)">AVG 58</text>

        {/* 6. Zone boundary lines */}
        <line x1="360"  y1="40" x2="360"  y2="260" stroke="rgba(232,99,95,0.06)"  strokeWidth="0.75" />
        <line x1="1150" y1="40" x2="1150" y2="260" stroke="rgba(0,196,140,0.06)" strokeWidth="0.75" />
        {/* 6. Zone boundary labels */}
        <text x="360"  y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(232,99,95,0.35)">BOTTOM 25%</text>
        <text x="1150" y="270" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(0,196,140,0.35)">TOP 25%</text>

        {/* 7. YOUR SITE marker at x=980, curve y≈135 */}
        <g className="sb-marker-enter">
          <line
            x1="980" y1="0" x2="980" y2="260"
            stroke="rgba(140,180,220,0.7)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <circle cx="980" cy="135" r="8" fill="rgba(140,180,220,0.15)" filter="url(#sbMarkerGlow)" />
          <circle cx="980" cy="135" r="3" fill="rgba(140,180,220,0.9)" />
          <g transform="translate(980, -8)">
            <rect x="-56" y="-50" width="112" height="44" fill="#080D18" stroke="rgba(140,180,220,0.35)" strokeWidth="0.5" />
            <text x="0" y="-34" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="8"  fill="rgba(140,180,220,0.55)" letterSpacing="0.12em">YOUR SITE</text>
            <text x="0" y="-16" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="15" fontWeight="700" fill="rgba(140,180,220,1.0)">63rd pct</text>
            <line x1="0" y1="0" x2="0" y2="143" stroke="rgba(140,180,220,0.2)" strokeWidth="0.5" />
          </g>
        </g>

        {/* 8. Score axis labels */}
        <text x="0"    y="278" textAnchor="start"  fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">0</text>
        <text x="360"  y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">25</text>
        <text x="720"  y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">50</text>
        <text x="1080" y="278" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">75</text>
        <text x="1440" y="278" textAnchor="end"    fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="rgba(111,155,198,0.2)">100</text>
      </svg>

      {/* 9. Bottom caption */}
      <div style={{ textAlign: 'center', padding: '12px 0 32px', position: 'relative', zIndex: 1 }}>
        <p style={{ ...MONO, fontSize: 10, color: 'rgba(111,155,198,0.3)', margin: 0 }}>
          Benchmarked against sites in your exact vertical · no synthetic data · updated weekly
        </p>
      </div>

    </section>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCtaSection() {
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      borderTop: '0.5px solid rgba(111,155,198,0.15)',
      minHeight: 280,
      display: 'flex',
      alignItems: 'center',
    }}>
      <style>{`
        @media (max-width: 767px) {
          .final-cta-segments { flex-direction: column !important; }
          .final-cta-left { border-right: none !important; border-bottom: 0.5px solid rgba(255,255,255,0.06) !important; }
        }
      `}</style>

      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: [
          'radial-gradient(ellipse 1200px 100px at 50% 0%, rgba(111,155,198,0.06) 0%, transparent 80%)',
          'radial-gradient(ellipse 600px 400px at 20% 50%, rgba(111,155,198,0.08) 0%, transparent 60%)',
          'radial-gradient(ellipse 600px 400px at 80% 50%, rgba(157,140,255,0.08) 0%, transparent 60%)',
        ].join(', '),
      }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderLeft: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '0.5px solid rgba(111,155,198,0.2)', borderRight: '0.5px solid rgba(111,155,198,0.2)', pointerEvents: 'none', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%' }} className="final-cta-segments">

        {/* LEFT — Dashboard */}
        <div className="final-cta-left" style={{ flex: 1, padding: '64px 56px', borderRight: '0.5px solid rgba(255,255,255,0.06)' }}>
          <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 12px' }}>RESULTS WITHOUT CODE</p>
          <h2 style={{ ...DISP, fontSize: 24, fontWeight: 700, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>
            Start scanning your site.
          </h2>
          <p style={{ ...SANS, fontSize: 14, color: '#9398A8', margin: '0 0 28px' }}>Free audit. No account required. See your score in 90 seconds.</p>
          <Link href="/dashboard" style={{ ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '11px 24px', background: 'transparent', textDecoration: 'none', display: 'inline-block' }}>
            Scan my site →
          </Link>
        </div>

        {/* RIGHT — API */}
        <div style={{ flex: 1, padding: '64px 56px' }}>
          <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 12px' }}>BUILD WITH THE DATA</p>
          <h2 style={{ ...DISP, fontSize: 24, fontWeight: 700, color: '#E6E9EE', lineHeight: 1.3, margin: '0 0 8px' }}>
            POST a URL. Get structured JSON. Build anything.
          </h2>
          <p style={{ ...SANS, fontSize: 14, color: '#9398A8', margin: '0 0 28px' }}>25 free scans, no subscription. Start scanning in minutes.</p>
          <Link href="/auth?surface=api" style={{ ...MONO, fontSize: 12, color: '#9D8CFF', border: '1px solid rgba(157,140,255,0.5)', padding: '11px 24px', background: 'transparent', textDecoration: 'none', display: 'inline-block' }}>
            Get API key →
          </Link>
        </div>

      </div>
    </section>
  )
}

// ── Objections ────────────────────────────────────────────────────────────────

const OBJECTION_CARDS = [
  {
    q: "How do I know it's not hallucinating?",
    a: "Every finding must cite specific visible content — what's present, absent, or misplaced on your actual page. The model cannot pass a check without grounding it in evidence. Findings that fail validation are dropped before they reach you.",
    data: 'grounding rule: cite visible content or fail',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Why not just paste my URL into ChatGPT?',
    a: 'A language model sees text you paste, not your live page. webdoc renders the full DOM in headless Chrome, reads above-the-fold layout, runs 307 structured checks, and returns ranked JSON — not a chat response.',
    data: '307 checks · rendered DOM · not a chat response',
    dataColor: '#6F9BC6',
  },
  {
    q: 'Are the lift numbers real or made up?',
    a: "Lift estimates are calibrated against a corpus of audited pages with known conversion data. Each check has an expected impact range based on real comparisons. The number is an estimate — not a guarantee — but it's grounded, not invented.",
    data: 'calibrated from corpus · p50 top-fix lift: +8%',
    dataColor: '#00C48C',
  },
  {
    q: 'Will it understand my site?',
    a: 'webdoc classifies your site type — SaaS, e-commerce, agency, creator — then applies the relevant check subset. A Shopify product page and a SaaS pricing page get different diagnostics. Classification runs automatically.',
    data: 'site types: SaaS · e-comm · agency · creator',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What do I actually do with the results?',
    a: 'Findings are ranked by estimated conversion uplift. Fix the highest-priority ones first. Each includes evidence, a concrete fix, and drop-in replacement copy. Most teams ship the top three improvements in an afternoon.',
    data: 'avg fix time for top 3: ~4hrs · copy included',
    dataColor: '#00C48C',
  },
  {
    q: 'Can you even scan my site?',
    a: "If it's publicly accessible, yes. webdoc renders the live page in headless Chrome with stealth mode enabled. Works on Next.js, Webflow, Squarespace, Shopify, WordPress, and custom stacks. Sites behind login walls cannot be scanned.",
    data: 'requires: public URL · no login walls',
    dataColor: '#6F9BC6',
  },
  {
    q: 'What does it cost?',
    a: 'Three scans per month free, no account required. Pay-per-scan starts at $0.25. Subscription plans from $49/month. Cache hits on the same URL within 24 hours are always free regardless of plan.',
    data: '3 free/mo · from $0.25/scan · cache free',
    dataColor: '#00C48C',
  },
  {
    q: 'Can I use it for client work?',
    a: 'Yes. The Agency plan includes client workspaces, white-label report links, and 100 bundled API calls per month. Reports carry no webdoc branding. Scan any publicly accessible client URL and send them the link.',
    data: 'agency: $149/mo · white-label · API bundled',
    dataColor: '#6F9BC6',
  },
] as const

function FaqCardsSection() {
  return (
    <section style={{ padding: '96px 0', position: 'relative', overflow: 'hidden' }}>
      {/* ambient bloom */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 800px 500px at 50% 50%, rgba(111,155,198,0.04) 0%, transparent 65%)' }} />
      {/* corner ticks */}
      <div style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.18)', borderLeft: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: '1px solid rgba(111,155,198,0.18)', borderRight: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.18)', borderLeft: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: '1px solid rgba(111,155,198,0.18)', borderRight: '1px solid rgba(111,155,198,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.2em', color: '#6F9BC6', marginBottom: 16 }}>OBJECTIONS</div>
          <h2 style={{ ...DISP, fontSize: 36, fontWeight: 700, color: '#E6E9EE', margin: 0, lineHeight: 1.2 }}>The questions that come up.</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OBJECTION_CARDS.map((card) => (
            <div
              key={card.q}
              style={{
                background: '#0A0E18',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                padding: '22px 24px',
              }}
            >
              <p style={{ ...DISP, fontWeight: 600, fontSize: 16, color: '#E6E9EE', margin: '0 0 10px', lineHeight: 1.35 }}>
                {card.q}
              </p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.65, margin: '0 0 12px' }}>
                {card.a}
              </p>
              <p style={{ ...MONO, fontSize: 11, color: card.dataColor, margin: 0 }}>
                {card.data}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer className="border-t border-background-border bg-background-raised">
      <div className="max-w-[1280px] mx-auto px-8 py-12 grid grid-cols-4 gap-8">
        <div>
          <Link href="/" className="font-display font-extrabold text-base text-text-primary no-underline">
            webdoc<span className="text-[#6F9BC6]">.ai</span>
          </Link>
          <p className="font-body text-sm text-text-secondary mt-3 max-w-xs leading-relaxed">
            The conversion audit API. 307 checks, ranked findings, AI-rewritten copy. One endpoint.
          </p>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">PRODUCT</div>
          {['Playground', 'Pricing', 'Docs', 'Changelog'].map(l => (
            <Link
              key={l}
              href={`/${l.toLowerCase()}`}
              className="font-body text-sm text-text-secondary hover:text-text-primary transition-colors block mb-2 no-underline"
            >
              {l}
            </Link>
          ))}
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">GET STARTED</div>
          <Link href="/dashboard" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-3 no-underline">Scan my site free →</Link>
          <Link href="/dashboard" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-3 no-underline">Agency plans →</Link>
          <Link href="/auth?surface=api" className="font-body text-sm text-[#6F9BC6] hover:opacity-80 block mb-3 no-underline">Get API key →</Link>
        </div>
        <div>
          <div className="font-mono text-xs text-text-tertiary uppercase tracking-widest mb-4">RESOURCES</div>
          <Link href="/playground" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">API Playground →</Link>
          <Link href="/docs/api" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">API Reference →</Link>
          <Link href="/changelog" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline">Changelog →</Link>
          <a href="https://status.webdocai.com" className="font-body text-sm text-text-secondary hover:text-text-primary block mb-2 no-underline" target="_blank" rel="noopener noreferrer">Status →</a>
        </div>
      </div>
      <div className="border-t border-background-border">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex justify-between items-center">
          <span className="font-mono text-xs text-text-tertiary">© 2026 webdoc.ai</span>
          <span className="font-mono text-xs">
            <span className="text-ink-muted">Built in public by Devon Morrell · </span>
            <a
              href="https://x.com/devonmorrell"
              className="text-ink-muted no-underline hover:underline transition-colors duration-150"
              target="_blank"
              rel="noopener noreferrer"
            >
              Follow the build →
            </a>
          </span>
          <span className="font-mono text-xs text-text-tertiary">Status · Privacy · Terms</span>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="bg-background-base min-h-screen instrument-grid">
      <NavBar />
      <HeroSection />
      <div className="section-separator" />
      <TwoSurfaceSection />
      <div className="section-separator" />
      <StatsBand />
      <div className="section-separator" />
      <FaqCardsSection />
      <div className="section-separator" />
      <FinalCtaSection />
      <FooterSection />
    </main>
  )
}
