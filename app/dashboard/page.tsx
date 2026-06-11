'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ScoreRing from '@/components/ui/ScoreRing'
import WebdocMark from '@/components/ui/WebdocMark'

// ── Style tokens ──────────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// ── Shared chrome ─────────────────────────────────────────────────────────────

function Ticks() {
  const b = '0.5px solid rgba(111,155,198,0.2)'
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', top: 20, left: 20, width: 14, height: 14, borderTop: b, borderLeft: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', top: 20, right: 20, width: 14, height: 14, borderTop: b, borderRight: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, left: 20, width: 14, height: 14, borderBottom: b, borderLeft: b, pointerEvents: 'none', zIndex: 1 }} />
      <div aria-hidden style={{ position: 'absolute', bottom: 20, right: 20, width: 14, height: 14, borderBottom: b, borderRight: b, pointerEvents: 'none', zIndex: 1 }} />
    </>
  )
}

// ── Section 1 — Hero with working scan input ─────────────────────────────────

function HeroScanSection() {
  const [scanUrl, setScanUrl] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const router = useRouter()

  // Inbound links (auth redirect, dashboard rescan) arrive as /dashboard?url=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const url = params.get('url')
    if (url) setScanUrl(url.replace(/^https?:\/\//i, ''))
  }, [])

  const handleScan = async () => {
    if (!scanUrl || isScanning) return
    setScanError('')
    setIsScanning(true)
    try {
      const target = /^https?:\/\//i.test(scanUrl) ? scanUrl : `https://${scanUrl}`
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      if (res.status === 401) {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('pendingUrl', target)
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
    <section id="hero" style={{ padding: '96px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes dash-pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @media (prefers-reduced-motion: reduce) { .dash-pulse { animation: none !important; } }
      `}</style>

      {/* Atmosphere */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1000px 700px at 50% 35%, rgba(111,155,198,0.06) 0%, transparent 60%)',
      }} />
      <Ticks />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <WebdocMark size={64} animated={true} />
        </div>

        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
          FOR FOUNDERS &amp; MARKETERS
        </p>

        <h1 style={{ ...DISP, fontSize: 'clamp(36px,5vw,56px)', fontWeight: 700, color: '#E6E9EE', letterSpacing: '-0.5px', margin: '0 0 20px', lineHeight: 1.1 }}>
          Find out exactly what&apos;s stopping your site from converting.
        </h1>

        <p style={{ ...SANS, fontSize: 16, color: '#9398A8', lineHeight: 1.65, maxWidth: 560, margin: '0 auto 40px' }}>
          Paste your URL. In 90 seconds you get a score, a ranked list of what to fix, and AI-rewritten copy — ready to use. No technical knowledge required.
        </p>

        <div style={{ maxWidth: 620, margin: '0 auto', textAlign: 'left' }}>

          {/* Status bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            ...MONO, fontSize: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            padding: '8px 14px', marginBottom: 10, flexWrap: 'wrap',
          }}>
            <span className="dash-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C48C', flexShrink: 0, display: 'inline-block', animation: 'dash-pulse-dot 1.8s ease-in-out infinite' }} />
            <span style={{ color: '#9398A8' }}>scan engine online</span>
            <span style={{ color: '#6E7587' }}>·</span>
            <span style={{ color: '#6F9BC6' }}>307 checks</span>
            <span style={{ color: '#6E7587' }}>·</span>
            <span style={{ color: '#6F9BC6' }}>results in ~90 seconds</span>
          </div>

          {/* Scan input */}
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', flex: '1 1 320px',
              background: '#0A0E18',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              borderRight: '1px solid rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }}>
              <span style={{ ...MONO, fontSize: 12, color: '#6E7587', padding: '0 12px', display: 'flex', alignItems: 'center', flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,0.08)' }}>
                https://
              </span>
              <input
                type="text"
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleScan() }}
                placeholder="your-site.com"
                style={{ flex: 1, minWidth: 0, background: 'transparent', ...MONO, fontSize: 14, color: '#E6E9EE', padding: '13px 14px', border: 'none', outline: 'none', borderRadius: 0 }}
              />
            </div>
            <button
              onClick={() => void handleScan()}
              disabled={isScanning || !scanUrl}
              style={{
                ...MONO, fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                background: 'transparent', border: '1px solid rgba(111,155,198,0.5)', color: '#6F9BC6',
                padding: '13px 24px', cursor: isScanning || !scanUrl ? 'not-allowed' : 'pointer',
                borderRadius: 0, opacity: isScanning || !scanUrl ? 0.6 : 1, whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {isScanning ? 'SCANNING…' : 'SCAN MY SITE →'}
            </button>
          </div>
          {scanError && (
            <p style={{ ...MONO, fontSize: 11, color: '#E8635F', margin: '8px 0 0' }}>{scanError}</p>
          )}

          {/* Example result line */}
          <div style={{
            background: '#0A0E18',
            borderTop: '1px solid rgba(111,155,198,0.18)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            borderRight: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            padding: '12px 16px', marginTop: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ ...MONO, fontSize: 10, color: '#6E7587', textTransform: 'uppercase', letterSpacing: '0.15em' }}>EXAMPLE RESULT</span>
              <span style={{ ...MONO, fontSize: 10, color: '#00C48C' }}>complete</span>
            </div>
            <p style={{ ...MONO, fontSize: 11, margin: 0, lineHeight: 1.7 }}>
              <span style={{ color: '#E8635F' }}>61/100</span>
              <span style={{ color: '#6E7587' }}> · </span>
              <span style={{ color: '#6F9BC6' }}>23 issues found</span>
              <span style={{ color: '#6E7587' }}> · </span>
              <span style={{ color: '#9398A8' }}>ranked by impact</span>
              <span style={{ color: '#6E7587' }}> · </span>
              <span style={{ color: '#00C48C' }}>copy rewrites included</span>
            </p>
          </div>

          {/* Trust line */}
          <p style={{ ...MONO, fontSize: 11, color: '#6E7587', textAlign: 'center', margin: '16px 0 0' }}>
            Free scan · no account required · no credit card
          </p>
        </div>

      </div>
    </section>
  )
}

// ── Section 2 — What you get ──────────────────────────────────────────────────

const WHAT_YOU_GET = [
  {
    number: '61',
    color: '#E8635F',
    label: 'YOUR CONVERSION SCORE',
    body: 'A single number from 0–100 that tells you how well your site is set up to turn visitors into customers. Benchmarked against 4,812 real sites in your exact industry.',
    detail: 'Below 70 is critical. Most sites score between 45–65.',
  },
  {
    number: '23',
    color: '#6F9BC6',
    label: 'RANKED ISSUES',
    body: "Every problem on your site, ranked by how much it's likely costing you. The highest-impact issues come first. Each one includes what we found, why it matters, and how to fix it.",
    detail: 'Ranked by estimated revenue impact — fix the top 3 first.',
  },
  {
    number: '+',
    color: '#00C48C',
    label: 'REWRITTEN COPY',
    body: 'For every headline or copy problem we find, we write you a replacement — ready to drop into your site. No copywriter needed. Based on what actually converts in your industry.',
    detail: 'Drop-in replacements. Evidence-grounded. Ready to use.',
  },
] as const

function WhatYouGetSection() {
  return (
    <section style={{ padding: '80px 48px', borderTop: '0.5px solid rgba(111,155,198,0.1)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 767px) { .dash-wyg-grid { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
          WHAT YOU GET
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,40px)', color: '#E6E9EE', margin: 0, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          A complete picture of why visitors aren&apos;t converting.
        </h2>

        <div className="dash-wyg-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 48 }}>
          {WHAT_YOU_GET.map(col => (
            <div key={col.label}>
              <div style={{ ...DISP, fontSize: 64, fontWeight: 700, color: col.color, lineHeight: 1 }}>{col.number}</div>
              <div style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6E7587', marginTop: 8 }}>{col.label}</div>
              <p style={{ ...SANS, fontSize: 15, color: '#9398A8', lineHeight: 1.65, marginTop: 16, marginBottom: 0 }}>{col.body}</p>
              <p style={{ ...MONO, fontSize: 11, color: col.color, marginTop: 12, marginBottom: 0 }}>{col.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 3 — Example scan result ───────────────────────────────────────────

const EXAMPLE_ISSUES = [
  { name: 'Hero headline is feature-led',         severity: 'CRITICAL', color: '#E8635F' },
  { name: 'No social proof above the fold',       severity: 'HIGH',     color: 'rgba(232,99,95,0.7)' },
  { name: 'CTA copy is generic',                  severity: 'HIGH',     color: 'rgba(232,99,95,0.7)' },
  { name: 'Value proposition buried',             severity: 'MEDIUM',   color: '#6E7587' },
  { name: 'Mobile nav broken on small screens',   severity: 'MEDIUM',   color: '#6E7587' },
] as const

function ExampleResultSection() {
  return (
    <section style={{ padding: '80px 48px', borderTop: '0.5px solid rgba(111,155,198,0.1)', background: 'rgba(111,155,198,0.02)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 767px) { .dash-example-grid { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
          EXAMPLE RESULT
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,40px)', color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          Here&apos;s what you&apos;ll see after scanning your site.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', marginBottom: 48, marginTop: 0 }}>
          This is a real audit result for acme-saas.com — a B2B SaaS site.
        </p>

        <div className="dash-example-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>

          {/* LEFT — score + top finding */}
          <div className="wd-panel" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
              <ScoreRing score={61} size="lg" />
              <div>
                <div style={{ ...DISP, fontSize: 18, fontWeight: 700, color: '#E6E9EE' }}>acme-saas.com</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6E7587', marginTop: 4 }}>B2B SaaS · scanned June 2026</div>
                <div style={{ ...MONO, fontSize: 11, color: '#6F9BC6', marginTop: 4 }}>63rd percentile in B2B SaaS</div>
              </div>
            </div>

            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

            <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 12px' }}>
              TOP ISSUE FOUND
            </p>
            <div style={{ background: 'rgba(232,99,95,0.04)', border: '0.5px solid rgba(232,99,95,0.2)', padding: 16 }}>
              <p style={{ ...MONO, fontSize: 10, color: '#E8635F', margin: 0 }}>
                CRITICAL · estimated +12–18% lift if fixed
              </p>
              <p style={{ ...SANS, fontSize: 15, fontWeight: 600, color: '#E6E9EE', marginTop: 8, marginBottom: 0 }}>
                Your headline talks about your product, not your customer&apos;s outcome
              </p>
              <p style={{ ...SANS, fontSize: 13, color: '#9398A8', marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
                We found: &lsquo;Advanced analytics platform for modern teams&rsquo; — this describes what you built, not what your customer gets. Visitors can&apos;t quickly understand if this is for them.
              </p>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#00C48C', marginTop: 12, marginBottom: 0 }}>
                SUGGESTED REWRITE
              </p>
              <p style={{ ...SANS, fontSize: 14, color: '#00C48C', marginTop: 6, marginBottom: 0, fontStyle: 'italic' }}>
                &ldquo;See exactly which campaigns drive revenue — in one dashboard.&rdquo;
              </p>
            </div>
          </div>

          {/* RIGHT — what else is in the report */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div className="wd-panel" style={{ padding: 20 }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>
                23 ISSUES RANKED BY IMPACT
              </p>
              {EXAMPLE_ISSUES.map(issue => (
                <div key={issue.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '6px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ ...SANS, fontSize: 13, color: '#9398A8' }}>{issue.name}</span>
                  <span style={{ ...MONO, fontSize: 10, color: issue.color, flexShrink: 0 }}>{issue.severity}</span>
                </div>
              ))}
              <p style={{ ...MONO, fontSize: 10, color: '#6F9BC6', margin: '10px 0 0' }}>
                + 18 more issues in your full report
              </p>
            </div>

            <div className="wd-panel" style={{ padding: 20 }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>
                HOW YOU COMPARE
              </p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.5, margin: 0 }}>
                Your score of 61 puts you in the 63rd percentile of B2B SaaS sites. The average site in your category scores 58. The top 25% score above 78.
              </p>
              <p style={{ ...MONO, fontSize: 11, color: '#6F9BC6', marginTop: 8, marginBottom: 0 }}>
                Compared against 4,812 real sites · not a generic average
              </p>
            </div>

            <div className="wd-panel" style={{ padding: 20 }}>
              <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6E7587', margin: '0 0 8px' }}>
                5 THINGS WORKING WELL
              </p>
              <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.5, margin: 0 }}>
                We also flag what&apos;s genuinely above average — so you know what not to change while you fix the problems.
              </p>
              <p style={{ ...MONO, fontSize: 11, color: '#00C48C', marginTop: 8, marginBottom: 0 }}>
                Evidence-referenced · never padded
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 4 — Pricing (dashboard tiers, mirrored from /pricing) ────────────

type FeatVal = string | boolean

function FVal({ v }: { v: FeatVal }) {
  if (v === true)        return <span style={{ ...MONO, fontSize: 11, color: '#00C48C' }}>✓</span>
  if (v === false)       return <span style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</span>
  if (v === 'unlimited') return <span style={{ ...MONO, fontSize: 11, color: '#00C48C' }}>{v}</span>
  if (v === 'dedicated') return <span style={{ ...MONO, fontSize: 11, color: '#9D8CFF' }}>{v}</span>
  if (v === 'custom')    return <span style={{ ...MONO, fontSize: 11, color: '#6F9BC6' }}>{v}</span>
  return <span style={{ ...MONO, fontSize: 11, color: '#E6E9EE' }}>{v}</span>
}

const DASH_FEATS: Array<{ key: string; values: [FeatVal, FeatVal, FeatVal, FeatVal] }> = [
  { key: 'scans / month',       values: ['3',       '20',       '100',       '500']       },
  { key: 'report history',      values: ['7 days',  '30 days',  'unlimited', 'unlimited'] },
  { key: 'findings depth',      values: ['full',    'full',     'full',      'full']      },
  { key: 'AI rewritten copy',   values: [true,      true,       true,        true]        },
  { key: 'corpus benchmark',    values: [true,      true,       true,        true]        },
  { key: 'score trending',      values: [false,     true,       true,        true]        },
  { key: 'CSV export',          values: [false,     true,       true,        true]        },
  { key: 'team seats',          values: ['1',       '1',        '3',         '10']        },
  { key: 'white label',         values: [false,     false,      true,        true]        },
  { key: 'client workspaces',   values: [false,     false,      true,        true]        },
  { key: 'priority processing', values: [false,     true,       true,        true]        },
  { key: 'email support',       values: [false,     true,       true,        true]        },
  { key: 'custom subdomain',    values: [false,     false,      false,       true]        },
  { key: 'scheduled scans',     values: [false,     false,      false,       true]        },
  { key: 'Slack notifications', values: [false,     false,      false,       true]        },
]

const DASH_CARDS = [
  {
    tier: 'FREE',
    monthly: 0, annual: 0,
    economyMonthly: 'forever free',
    economyAnnual:  'forever free',
    bestFor: 'Founders who want to see their score and top findings before committing.',
    cta: 'TRY FREE →', ctaHref: '/auth?surface=dashboard',
    isScale: false,
  },
  {
    tier: 'STARTER',
    monthly: 49, annual: 39,
    economyMonthly: '$2.45/scan effective',
    economyAnnual:  '$1.95/scan · billed annually',
    bestFor: 'Solo founders and marketers running regular audits and tracking score over time.',
    cta: 'START TRIAL →', ctaHref: '/auth?surface=dashboard&plan=starter',
    isScale: false,
  },
  {
    tier: 'PRO',
    monthly: 149, annual: 119,
    economyMonthly: '$1.49/scan effective',
    economyAnnual:  '$1.19/scan · billed annually',
    bestFor: 'Agencies and consultants delivering audits to clients with white-label reports.',
    cta: 'START TRIAL →', ctaHref: '/auth?surface=dashboard&plan=pro',
    isScale: false,
  },
  {
    tier: 'SCALE',
    monthly: 499, annual: 399,
    economyMonthly: 'custom rate · priority support',
    economyAnnual:  'billed annually · priority support',
    bestFor: 'Teams running high-volume audits with custom branding and dedicated infrastructure.',
    cta: 'START TRIAL →', ctaHref: '/auth?surface=dashboard&plan=scale',
    isScale: true,
  },
]

function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const isAnnual = billing === 'annual'

  return (
    <section style={{ padding: '80px 48px', borderTop: '0.5px solid rgba(111,155,198,0.1)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 767px) { .dash-pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6F9BC6', margin: '0 0 16px' }}>
          PRICING
        </p>
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 'clamp(28px,4vw,40px)', color: '#E6E9EE', margin: '0 0 12px', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          Start free. Upgrade when you need more.
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', marginBottom: 48, marginTop: 0 }}>
          No contracts. Cancel anytime. Same 307-check audit on every plan.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
          <span style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            aria-label="Toggle billing period"
            style={{
              width: 40, height: 22,
              background: isAnnual ? 'rgba(111,155,198,0.3)' : 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(111,155,198,0.3)',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: 0,
              transition: 'background 0.2s',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: 3,
              left: isAnnual ? 21 : 2,
              width: 16,
              height: 16,
              background: isAnnual ? '#6F9BC6' : 'rgba(255,255,255,0.35)',
              transition: 'left 0.2s, background 0.2s',
            }} />
          </button>
          <span style={{ ...MONO, fontSize: 11, color: '#6E7587' }}>Annual</span>
          {isAnnual && (
            <span style={{ ...MONO, fontSize: 10, color: '#00C48C', background: 'rgba(0,196,140,0.1)', padding: '2px 8px' }}>
              SAVE 20%
            </span>
          )}
        </div>

        {/* Card grid */}
        <div className="dash-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {DASH_CARDS.map((card, ci) => {
            const accentColor = card.isScale ? 'rgba(0,196,140,0.5)' : 'rgba(111,155,198,0.5)'
            const tierColor   = card.isScale ? '#00C48C' : '#6F9BC6'
            const ctaBorder   = card.isScale ? 'rgba(0,196,140,0.45)' : 'rgba(111,155,198,0.45)'
            const ctaColor    = card.isScale ? '#00C48C' : '#6F9BC6'
            const price   = card.monthly === 0 ? '$0' : `$${isAnnual ? card.annual : card.monthly}`
            const economy = isAnnual ? card.economyAnnual : card.economyMonthly
            return (
              <div key={card.tier} style={{ background: '#0A0E18', border: '0.5px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: accentColor }} />
                <div style={{ padding: '24px 24px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: tierColor, margin: '0 0 8px' }}>{card.tier}</p>
                  <p style={{ ...DISP, fontSize: 42, fontWeight: 700, color: '#E6E9EE', lineHeight: 1, margin: '0 0 4px' }}>{price}</p>
                  <p style={{ ...MONO, fontSize: 10, color: tierColor, margin: '0 0 16px' }}>{economy}</p>
                  <p style={{ ...SANS, fontSize: 13, color: '#9398A8', lineHeight: 1.5, margin: '0 0 20px' }}>{card.bestFor}</p>
                  <Link
                    href={card.ctaHref}
                    style={{
                      display: 'block', textAlign: 'center', padding: '11px',
                      ...MONO, fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                      textDecoration: 'none', color: ctaColor,
                      border: `1px solid ${ctaBorder}`, background: 'transparent',
                      boxSizing: 'border-box', width: '100%',
                    }}
                  >{card.cta}</Link>
                </div>
                <div style={{ padding: '20px 24px', flexGrow: 1 }}>
                  {DASH_FEATS.map((row, ri) => (
                    <div
                      key={row.key}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '9px 0',
                        borderBottom: ri < DASH_FEATS.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
                      }}
                    >
                      <span style={{ ...MONO, fontSize: 11, color: '#9398A8' }}>{row.key}</span>
                      <FVal v={row.values[ci]} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', textAlign: 'center', marginTop: 24, marginBottom: 0 }}>
          All plans include: full audit · AI-rewritten copy · corpus benchmarking · cache hits free
        </p>
      </div>
    </section>
  )
}

// ── Section 5 — Bottom CTA ────────────────────────────────────────────────────

function BottomCtaSection() {
  return (
    <section style={{ padding: '80px 48px', borderTop: '0.5px solid rgba(111,155,198,0.1)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 900px 500px at 50% 50%, rgba(111,155,198,0.06) 0%, transparent 60%)',
      }} />
      <Ticks />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ ...DISP, fontSize: 32, fontWeight: 700, color: '#E6E9EE', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          Ready to see what&apos;s holding your site back?
        </h2>
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', margin: '0 0 32px' }}>
          Free scan. No account required. Results in 90 seconds.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a href="#hero" style={{ ...MONO, fontSize: 12, color: '#6F9BC6', border: '1px solid rgba(111,155,198,0.5)', padding: '12px 28px', textDecoration: 'none', display: 'inline-block', background: 'transparent' }}>
            Scan my site free →
          </a>
          <Link href="/product" style={{ ...MONO, fontSize: 12, color: '#6E7587', border: '0.5px solid rgba(255,255,255,0.1)', padding: '12px 28px', textDecoration: 'none', display: 'inline-block', background: 'transparent' }}>
            See how the engine works →
          </Link>
        </div>

        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', marginTop: 24, marginBottom: 0 }}>
          Building with the API?{' '}
          <Link href="/developers" style={{ color: '#9D8CFF', textDecoration: 'none' }}>
            See developer pricing →
          </Link>
        </p>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardLandingPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#050810' }}>
      <HeroScanSection />
      <WhatYouGetSection />
      <ExampleResultSection />
      <PricingSection />
      <BottomCtaSection />
    </main>
  )
}
