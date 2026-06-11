'use client'

import { useState } from 'react'
import ScoreRing from '@/components/ui/ScoreRing'
import Stat from '@/components/ui/Stat'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  jsonKey:    '#8080c0',
  jsonStr:    '#00C48C',
  jsonMetric: '#6F9BC6',
  sevCrit:    '#E8635F',
  sevHigh:    '#EFB23E',
  inkPrimary: '#E6E9EE',
  inkSec:     '#9398A8',
  inkTert:    '#8E8EA0',
  inkMuted:   '#6E7587',
  bg:         '#050810',
  surface:    '#0A0E18',
  sidebarBg:  '#06090F',
  zone3bg:    '#07090F',
} as const

function scoreBandColor(n: number): string {
  if (n >= 70) return T.jsonStr
  if (n >= 50) return T.sevHigh
  return T.sevCrit
}

function severityColor(s: string): string {
  if (s === 'critical') return T.sevCrit
  if (s === 'high')     return T.sevHigh
  if (s === 'medium')   return T.jsonMetric
  return T.inkMuted
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Priority = 1 | 2 | 3

interface Finding {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  explanation: string
  recommendation: string
  priority: Priority
  estimated_lift: string
  fix_effort: 'low' | 'medium' | 'high'
  percentile: number
  industry_avg: string
  rewritten_copy: { headline: string; cta_primary: string }
}

interface DimensionScore {
  key: string
  label: string
  score: number
  industry_avg: number
  percentile: number
}

interface ScanHistoryEntry {
  date: string
  score: number
  findings: number
  duration_ms: number
  cost: string
}

interface ReportLink {
  url: string
  generated: string
  active: boolean
}

interface Client {
  id: string
  name: string
  domain: string
  score: number
  delta: number | null
  lastScan: string
  lastScanRelative: string
  nextScan: string
  frequency: 'Weekly' | 'Monthly' | 'Off'
  site_type: string
  industry: string
  percentile: number
  topFinding: { title: string; severity: string } | null
  findings: Finding[]
  dimension_scores: DimensionScore[]
  strengths: string[]
  scan_history: ScanHistoryEntry[]
  report_links: ReportLink[]
}

// ── Shared mock findings ──────────────────────────────────────────────────────
const SHARED_FINDINGS: Finding[] = [
  {
    id: 'MSG-001', priority: 1, severity: 'critical', category: 'MESSAGE_CLARITY',
    title: 'Hero headline is product-focused, not outcome-focused',
    explanation: 'Current headline names the product category but communicates zero user benefit. Outcome-led headlines convert 23% better across SaaS landing pages.',
    recommendation: 'Rewrite to lead with the result the user experiences. Name the transformation, not the tool.',
    estimated_lift: '+18–24%', fix_effort: 'low', percentile: 12, industry_avg: '58%',
    rewritten_copy: { headline: 'Find what\'s costing you conversions. Fix it today.', cta_primary: 'Scan my site free →' },
  },
  {
    id: 'TRS-001', priority: 1, severity: 'high', category: 'TRUST_SIGNALS',
    title: 'No social proof visible in first viewport',
    explanation: 'Zero trust signals appear above the fold. Trust signals below the fold are ignored by 76% of visitors who bounce before scrolling.',
    recommendation: 'Move at least one trust signal above the fold. Customer count or a sharp single testimonial.',
    estimated_lift: '+12–16%', fix_effort: 'low', percentile: 22, industry_avg: '63%',
    rewritten_copy: { headline: '1,200+ teams have run their site through this.', cta_primary: 'Join them →' },
  },
  {
    id: 'CTA-001', priority: 1, severity: 'high', category: 'CONVERSION_ARCHITECTURE',
    title: 'Primary CTA copy is generic',
    explanation: 'CTA reads "Get Started" — one of the 5 lowest-performing CTA patterns. Generic verbs underperform specific action CTAs by 14–32%.',
    recommendation: 'Replace with a specific outcome CTA matching exactly what happens when they click.',
    estimated_lift: '+14–22%', fix_effort: 'low', percentile: 18, industry_avg: '61%',
    rewritten_copy: { headline: 'Get your full conversion audit free', cta_primary: 'Scan my site — 90 seconds →' },
  },
  {
    id: 'TRS-002', priority: 2, severity: 'medium', category: 'TRUST_SIGNALS',
    title: 'No risk reversal near primary CTA',
    explanation: 'No friction reducer within 100px of the primary CTA. Risk reversals placed near the CTA reduce click hesitation by 8–15%.',
    recommendation: 'Add a one-line friction reducer directly below the button.',
    estimated_lift: '+8–12%', fix_effort: 'low', percentile: 41, industry_avg: '55%',
    rewritten_copy: { headline: 'Your full audit — no signup, just a URL.', cta_primary: 'Run free audit →' },
  },
  {
    id: 'OBJ-001', priority: 3, severity: 'medium', category: 'OBJECTION_HANDLING',
    title: 'No objection handling on pricing page',
    explanation: 'Pricing page lists features and price but provides zero objection handling.',
    recommendation: 'Add a 3-item FAQ below pricing addressing the top objections.',
    estimated_lift: '+4–8%', fix_effort: 'medium', percentile: 44, industry_avg: '50%',
    rewritten_copy: { headline: 'The diagnostic your ad spend deserves.', cta_primary: 'Start free →' },
  },
]

const SHARED_DIMS: DimensionScore[] = [
  { key: 'conversion_architecture', label: 'Conversion Arch.',    score: 48, industry_avg: 62, percentile: 21 },
  { key: 'trust_signals',           label: 'Trust Signals',        score: 55, industry_avg: 61, percentile: 38 },
  { key: 'message_clarity',         label: 'Message Clarity',      score: 52, industry_avg: 65, percentile: 29 },
  { key: 'traffic_readiness',       label: 'Traffic Readiness',    score: 71, industry_avg: 58, percentile: 73 },
  { key: 'technical_foundation',    label: 'Technical Foundation', score: 68, industry_avg: 63, percentile: 61 },
  { key: 'objection_handling',      label: 'Objection Handling',   score: 44, industry_avg: 53, percentile: 18 },
  { key: 'offer_clarity',           label: 'Offer Clarity',        score: 72, industry_avg: 60, percentile: 76 },
]

const SHARED_STRENGTHS = [
  'Page load speed in top 15% — under 1.8s on mobile',
  'SSL certificate valid, HTTPS enforced, no mixed content',
  'OpenGraph metadata complete — social previews render correctly',
  'Schema markup present — Google can extract business entity data',
]

const SHARED_SCAN_HISTORY: ScanHistoryEntry[] = [
  { date: 'Jun 8, 2026',  score: 61, findings: 5, duration_ms: 87340, cost: '$0.15' },
  { date: 'Jun 1, 2026',  score: 58, findings: 7, duration_ms: 91200, cost: '$0.15' },
  { date: 'May 21, 2026', score: 53, findings: 9, duration_ms: 84500, cost: '$0.15' },
  { date: 'May 9, 2026',  score: 51, findings: 10, duration_ms: 88100, cost: '$0.15' },
]

const SHARED_LINKS: ReportLink[] = [
  { url: 'webdocai.com/r/a3x9f1', generated: 'Jun 3, 2026', active: true },
  { url: 'webdocai.com/r/b2k8m4', generated: 'May 15, 2026', active: false },
]

// ── Client data ───────────────────────────────────────────────────────────────
const CLIENTS: Client[] = [
  {
    id: 'buildspace', name: 'Buildspace',    domain: 'buildspace.so',      score: 48, delta: -3,
    lastScan: 'Jun 1, 2026', lastScanRelative: '1 week ago', nextScan: 'Jul 1, 2026', frequency: 'Monthly',
    site_type: 'B2B SAAS', industry: 'B2B SaaS', percentile: 14,
    topFinding: { title: 'Hero headline product-focused, not outcome-focused', severity: 'critical' },
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: SHARED_LINKS,
  },
  {
    id: 'pika', name: 'Pika',           domain: 'pika.art',           score: 55, delta: null,
    lastScan: 'May 20, 2026', lastScanRelative: '2 weeks ago', nextScan: '—', frequency: 'Off',
    site_type: 'B2C CREATIVE', industry: 'B2C SaaS', percentile: 31,
    topFinding: { title: 'No social proof visible in first viewport', severity: 'high' },
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: [],
  },
  {
    id: 'tally', name: 'Tally',          domain: 'tally.so',           score: 66, delta: -2,
    lastScan: 'Jun 1, 2026', lastScanRelative: '1 week ago', nextScan: 'Jul 1, 2026', frequency: 'Monthly',
    site_type: 'PRODUCTIVITY', industry: 'Productivity SaaS', percentile: 48,
    topFinding: { title: 'Primary CTA copy is generic', severity: 'high' },
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: SHARED_LINKS,
  },
  {
    id: 'acme', name: 'Acme SaaS',     domain: 'acme-saas.com',      score: 61, delta: 8,
    lastScan: 'Jun 1, 2026', lastScanRelative: '1 week ago', nextScan: 'Jun 10, 2026', frequency: 'Weekly',
    site_type: 'B2B SAAS', industry: 'B2B SaaS', percentile: 34,
    topFinding: { title: 'Hero headline product-focused, not outcome-focused', severity: 'critical' },
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: SHARED_LINKS,
  },
  {
    id: 'techflow', name: 'TechFlow',      domain: 'techflow.io',        score: 74, delta: 3,
    lastScan: 'Jun 1, 2026', lastScanRelative: '1 week ago', nextScan: 'Jun 10, 2026', frequency: 'Weekly',
    site_type: 'B2B SAAS', industry: 'B2B SaaS', percentile: 67,
    topFinding: { title: 'No risk reversal near primary CTA', severity: 'medium' },
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: SHARED_LINKS,
  },
  {
    id: 'loops', name: 'Loops',          domain: 'loops.so',           score: 79, delta: 5,
    lastScan: 'Jun 1, 2026', lastScanRelative: '1 week ago', nextScan: 'Jun 10, 2026', frequency: 'Weekly',
    site_type: 'EMAIL SAAS', industry: 'Marketing SaaS', percentile: 72,
    topFinding: { title: 'No objection handling on pricing page', severity: 'medium' },
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: SHARED_LINKS,
  },
  {
    id: 'lemonsqueezy', name: 'Lemon Squeezy', domain: 'lemonsqueezy.com', score: 82, delta: 11,
    lastScan: 'Jun 1, 2026', lastScanRelative: '1 week ago', nextScan: 'Jun 10, 2026', frequency: 'Weekly',
    site_type: 'PAYMENTS', industry: 'Fintech SaaS', percentile: 79,
    topFinding: null,
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: SHARED_LINKS,
  },
  {
    id: 'mintlify', name: 'Mintlify',      domain: 'mintlify.com',       score: 91, delta: 4,
    lastScan: 'Jun 1, 2026', lastScanRelative: '1 week ago', nextScan: 'Jun 10, 2026', frequency: 'Weekly',
    site_type: 'DEV TOOLS', industry: 'Developer SaaS', percentile: 94,
    topFinding: null,
    findings: SHARED_FINDINGS, dimension_scores: SHARED_DIMS, strengths: SHARED_STRENGTHS,
    scan_history: SHARED_SCAN_HISTORY, report_links: SHARED_LINKS,
  },
]

// Sort worst-first
const SORTED_CLIENTS = [...CLIENTS].sort((a, b) => a.score - b.score)

// ── Priority labels + pills ───────────────────────────────────────────────────
const P_LABEL: Record<Priority, string> = {
  1: 'P1 — FIX THIS WEEK',
  2: 'P2 — FIX THIS MONTH',
  3: 'P3 — WHEN YOU CAN',
}

const P_PILL: Record<Priority, { bg: string; color: string; text: string }> = {
  1: { bg: 'rgba(232,99,95,0.13)',   color: '#E8635F', text: 'P1 CRITICAL' },
  2: { bg: 'rgba(239,178,62,0.13)',  color: '#EFB23E', text: 'P2 HIGH'     },
  3: { bg: 'rgba(111,155,198,0.13)', color: '#6F9BC6', text: 'P3 MEDIUM'   },
}

// ── Portfolio stats ───────────────────────────────────────────────────────────
const BELOW_AVG = CLIENTS.filter(c => c.score < 70).length
const AVG_SCORE = Math.round(CLIENTS.reduce((acc, c) => acc + c.score, 0) / CLIENTS.length)

// ── Main export ───────────────────────────────────────────────────────────────
export default function AgencyDashboard() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [linkCopied, setLinkCopied] = useState<string | null>(null)
  const [shareClicked, setShareClicked] = useState(false)

  const selectedClient = CLIENTS.find(c => c.id === selectedClientId) ?? null

  function selectClient(id: string) {
    const client = CLIENTS.find(c => c.id === id)
    if (!client) return
    setSelectedClientId(id)
    const firstP1 = client.findings.find(f => f.priority === 1)?.id ?? client.findings[0]?.id ?? null
    setSelectedFindingId(firstP1)
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(url)
      setTimeout(() => setLinkCopied(null), 1500)
    })
  }

  function handleShare() {
    setShareClicked(true)
    setTimeout(() => setShareClicked(false), 1500)
  }

  const filteredSorted = SORTED_CLIENTS.filter(c =>
    !search || c.domain.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedFinding = selectedClient?.findings.find(f => f.id === selectedFindingId) ?? null
  const grouped = selectedClient
    ? ([1, 2, 3] as Priority[])
        .map(p => ({ priority: p, findings: selectedClient.findings.filter(f => f.priority === p) }))
        .filter(g => g.findings.length > 0)
    : []

  const SIDEBAR_W = 280

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: '4rem',
        height: 'calc(100vh - 4rem)',
        width: SIDEBAR_W,
        background: T.sidebarBg,
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted }}>CLIENTS</span>
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, background: 'rgba(111,155,198,0.1)', color: T.jsonMetric, padding: '2px 8px' }}>{CLIENTS.length}</span>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <input
            type="text"
            placeholder="search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkSec,
              padding: '8px 12px', outline: 'none', borderRadius: 0,
            }}
          />
        </div>

        {/* New client */}
        <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <button style={{
            width: '100%', border: `0.5px solid ${T.jsonStr}`, color: T.jsonStr,
            background: 'transparent', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12,
            padding: '9px', cursor: 'pointer', borderRadius: 0, textAlign: 'center',
          }}>
            + NEW CLIENT
          </button>
        </div>

        {/* Client list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredSorted.map(c => {
            const sel = c.id === selectedClientId
            const ind = c.score < 50 ? T.sevCrit : c.score < 70 ? T.sevHigh : null
            return (
              <div
                key={c.id}
                onClick={() => selectClient(c.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                  borderLeft: sel ? `2px solid rgba(0,196,140,0.4)` : '2px solid transparent',
                  background: sel ? 'rgba(0,196,140,0.03)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <ScoreRing score={c.score} size="sm" animate={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: T.inkPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.domain}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>Last scan: {c.lastScanRelative}</div>
                </div>
                {ind && <div style={{ width: 5, height: 5, background: ind, flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: '0.5px solid rgba(255,255,255,0.06)', background: T.sidebarBg, flexShrink: 0 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted }}>
            Agency · Pro&nbsp;&nbsp;
            <span style={{ color: T.jsonMetric, cursor: 'pointer' }}>Upgrade →</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, minHeight: 'calc(100vh - 4rem)', overflowY: 'auto', position: 'relative' }}>

        {!selectedClient ? (
          /* ── PORTFOLIO VIEW ─────────────────────────────────────────────── */
          <>
            {/* Faint bloom */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 1200px 800px at 50% 40%, rgba(111,155,198,0.04) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Portfolio header */}
              <div style={{ padding: '32px 32px 0' }}>
                <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 28, color: T.inkPrimary, marginBottom: 4 }}>Portfolio overview</h1>
                <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted }}>
                  {CLIENTS.length} clients · updated 1 week ago
                </p>
              </div>

              {/* Portfolio stats */}
              <div style={{ padding: '24px 32px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: 48 }}>
                <Stat value={CLIENTS.length} label="Total clients" verdict="neutral" />
                <Stat value={BELOW_AVG} label="Below average" verdict="problem-count" />
                <Stat value={AVG_SCORE} label="Avg score" verdict="score" />
              </div>

              {/* Client grid */}
              <div style={{ padding: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {SORTED_CLIENTS.map(c => {
                  const accentColor = c.score < 50 ? T.sevCrit : c.score < 70 ? T.sevHigh : T.jsonStr
                  const sc = c.topFinding ? severityColor(c.topFinding.severity) : T.inkMuted
                  return (
                    <div
                      key={c.id}
                      onClick={() => selectClient(c.id)}
                      className="wd-panel"
                      style={{ cursor: 'pointer', display: 'flex', padding: 0, transition: 'box-shadow 0.15s', overflow: 'hidden' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px rgba(255,255,255,0.08)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
                    >
                      {/* Left accent */}
                      <div style={{ width: 4, background: accentColor, flexShrink: 0 }} />

                      {/* Content */}
                      <div style={{ flex: 1, padding: '18px 18px 18px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: T.inkPrimary }}>{c.domain}</div>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.jsonMetric, marginTop: 3 }}>{c.site_type}</div>
                          </div>
                          <ScoreRing score={c.score} size="sm" animate={false} />
                        </div>

                        <div style={{ padding: '12px 0', borderTop: '0.5px solid rgba(255,255,255,0.05)', borderBottom: '0.5px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonMetric }}>{c.percentile}th of {c.industry} sites</div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>Scanned {c.lastScanRelative}</div>
                        </div>

                        {c.topFinding && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, background: `${sc}1a`, color: sc, padding: '2px 5px' }}>{c.topFinding.severity.toUpperCase()}</span>
                            <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 13, color: T.inkSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.topFinding.title}</span>
                          </div>
                        )}

                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonStr }}>VIEW REPORT →</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          /* ── CLIENT VIEW ────────────────────────────────────────────────── */
          <div>
            {/* Client header (sticky within main scroll) */}
            <div style={{
              position: 'sticky', top: 0, zIndex: 30,
              background: T.sidebarBg, borderBottom: '0.5px solid rgba(255,255,255,0.06)',
              padding: '24px 32px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Left */}
                <div>
                  <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 20, color: T.inkPrimary, marginBottom: 2 }}>{selectedClient.name}</h2>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonStr }}>{selectedClient.domain}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted, marginTop: 2 }}>
                    {selectedClient.site_type} · Scanned {selectedClient.lastScanRelative}
                  </div>
                </div>

                {/* Center */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <ScoreRing score={selectedClient.score} size="md" animate={true} />
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonMetric }}>
                    {selectedClient.percentile}th of {selectedClient.industry} sites
                  </span>
                </div>

                {/* Right */}
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button style={{ background: 'transparent', border: `0.5px solid ${T.jsonMetric}`, color: T.jsonMetric, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, padding: '8px 14px', cursor: 'pointer', borderRadius: 0 }}>
                      RESCAN →
                    </button>
                    <button
                      onClick={handleShare}
                      style={{ background: shareClicked ? 'rgba(0,196,140,0.8)' : T.jsonStr, color: T.bg, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, padding: '8px 14px', cursor: 'pointer', border: 'none', borderRadius: 0, transition: 'background 0.2s' }}
                    >
                      {shareClicked ? 'Link copied!' : 'SHARE REPORT →'}
                    </button>
                    <button style={{ background: 'transparent', border: 'none', color: T.inkMuted, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, cursor: 'pointer', borderRadius: 0 }}>
                      DELETE CLIENT
                    </button>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted, textAlign: 'right' }}>
                    Report link valid for 30 days · no webdoc branding
                  </div>
                </div>
              </div>
            </div>

            {/* Two columns */}
            <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '55fr 45fr', alignItems: 'start' }}>

              {/* Left column */}
              <div style={{ padding: '32px 32px 32px 0' }}>
                {/* Findings */}
                {grouped.map((group, gi) => (
                  <div key={group.priority}>
                    <div style={{
                      fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted,
                      padding: gi === 0 ? '0 0 10px' : '16px 0 10px',
                      borderTop: gi === 0 ? 'none' : '0.5px solid rgba(255,255,255,0.05)',
                    }}>
                      {P_LABEL[group.priority]}
                    </div>
                    {group.findings.map(f => {
                      const sel = f.id === selectedFindingId
                      const sc = severityColor(f.severity)
                      return (
                        <div
                          key={f.id}
                          onClick={() => setSelectedFindingId(f.id)}
                          onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                          style={{
                            cursor: 'pointer',
                            borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                            borderLeft: sel ? '3px solid rgba(128,128,192,0.4)' : `3px solid ${sc}`,
                            background: sel ? 'rgba(128,128,192,0.04)' : 'transparent',
                            padding: '14px 16px',
                            transition: 'background 0.1s',
                          }}
                        >
                          <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 15, fontWeight: 500, color: T.inkPrimary, marginBottom: 4 }}>{f.title}</div>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonKey }}>{f.category}</span>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, background: `${sc}1a`, color: sc, padding: '2px 6px' }}>{f.severity.toUpperCase()}</span>
                            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonStr }}>{f.estimated_lift}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* Dimensions */}
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted, padding: '32px 0 16px' }}>DIMENSION SCORES</div>
                {selectedClient.dimension_scores.map(dim => {
                  const dc = scoreBandColor(dim.score)
                  const pct = dim.percentile >= 50 ? `top ${100 - dim.percentile}%` : `bottom ${dim.percentile}%`
                  return (
                    <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted, width: 140, flexShrink: 0 }}>{dim.label}</span>
                      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${dim.score}%`, background: dc }} />
                        <div style={{ position: 'absolute', top: 0, left: `${dim.industry_avg}%`, width: 1.5, height: '100%', background: 'rgba(255,255,255,0.3)' }} />
                      </div>
                      <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 13, color: dc, width: 28, textAlign: 'right' }}>{dim.score}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted, width: 80, textAlign: 'right' }}>{pct}</span>
                    </div>
                  )
                })}

                {/* Strengths */}
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted, padding: '32px 0 16px' }}>VERIFIED STRENGTHS</div>
                {selectedClient.strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 5, height: 5, background: T.jsonStr, flexShrink: 0, marginTop: 3 }} />
                    <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, color: T.inkSec }}>{s}</span>
                  </div>
                ))}

                {/* Scan history table */}
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted, padding: '32px 0 16px' }}>SCAN HISTORY</div>
                <div className="wd-panel" style={{ padding: 0 }}>
                  {/* Header row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.6fr 1fr 0.6fr 0.6fr', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    {['DATE', 'SCORE', 'FINDINGS', 'DURATION', 'COST', 'ACTIONS'].map(h => (
                      <span key={h} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted }}>{h}</span>
                    ))}
                  </div>
                  {selectedClient.scan_history.map((s, i) => {
                    const sc = scoreBandColor(s.score)
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.6fr 1fr 0.6fr 0.6fr', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkSec }}>{s.date}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <svg width={20} height={20} viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                            <circle cx={10} cy={10} r={8} fill="none" stroke={sc} strokeWidth={1.5} />
                          </svg>
                          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: sc }}>{s.score}</span>
                        </span>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.sevHigh }}>{s.findings}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonMetric }}>{s.duration_ms.toLocaleString()}ms</span>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkTert }}>{s.cost}</span>
                        <button style={{ background: 'transparent', border: 'none', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.jsonStr, cursor: 'pointer', padding: 0, textAlign: 'left' }}>View →</button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right column — finding detail */}
              <div style={{
                background: T.zone3bg,
                borderTop: '1px solid rgba(128,128,192,0.25)',
                borderLeft: '0.5px solid rgba(128,128,192,0.1)',
                boxShadow: 'inset 0 0 40px rgba(128,128,192,0.06), 0 0 60px rgba(128,128,192,0.04)',
                padding: 28,
                position: 'sticky',
                top: '7rem',
                alignSelf: 'start',
              }}>
                {!selectedFinding ? (
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted, textAlign: 'center', paddingTop: 60 }}>Select a finding from the list.</div>
                ) : (() => {
                  const f = selectedFinding
                  const sc = severityColor(f.severity)
                  const pp = P_PILL[f.priority]
                  return (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, padding: '3px 9px', background: pp.bg, color: pp.color }}>{pp.text}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonKey }}>{f.category}</span>
                        </div>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonMetric }}>fix_effort: {f.fix_effort}</span>
                      </div>

                      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 22, color: T.inkPrimary, lineHeight: 1.2, marginBottom: 20 }}>{f.title}</h3>

                      <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(111,155,198,0.3)', marginBottom: 16 }}>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted, marginBottom: 8 }}>EVIDENCE FROM PAGE</div>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: T.inkSec, lineHeight: 1.65 }}>{f.explanation}</div>
                      </div>

                      <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderLeft: '2px solid rgba(0,196,140,0.3)', marginBottom: 16 }}>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted, marginBottom: 8 }}>RECOMMENDED FIX</div>
                        <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 15, color: T.inkSec, lineHeight: 1.65 }}>{f.recommendation}</div>
                      </div>

                      <div style={{ padding: '16px 0', borderTop: '0.5px solid rgba(255,255,255,0.06)', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                        {([
                          { label: 'estimated_lift', value: f.estimated_lift,     color: T.jsonStr    },
                          { label: 'percentile',      value: `${f.percentile}th`, color: T.jsonMetric },
                          { label: 'industry_avg',    value: f.industry_avg,      color: T.jsonMetric },
                          { label: 'severity',        value: f.severity,          color: sc           },
                        ] as { label: string; value: string; color: string }[]).map(m => (
                          <div key={m.label}>
                            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>{m.label}</div>
                            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500, fontSize: 15, color: m.color }}>{m.value}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding: 16, background: 'rgba(0,196,140,0.03)', borderTop: '1px solid rgba(0,196,140,0.12)' }}>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.inkMuted, marginBottom: 12 }}>REWRITTEN COPY · INCLUDED IN RESPONSE</div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted, flexShrink: 0 }}>headline:</span>
                          <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 16, color: T.jsonStr, fontWeight: 500 }}>{f.rewritten_copy.headline}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: T.inkMuted, flexShrink: 0 }}>cta_primary:</span>
                          <span style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, color: T.jsonStr }}>{f.rewritten_copy.cta_primary}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Report links */}
            <div style={{ padding: '0 32px 48px' }}>
              <div className="section-separator" style={{ marginBottom: 32 }} />
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: T.inkMuted, marginBottom: 16 }}>SHARED REPORTS</div>
              <div className="wd-panel" style={{ padding: 0 }}>
                {selectedClient.report_links.length === 0 ? (
                  <div style={{ padding: '20px 16px', fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.inkMuted }}>No report links generated yet.</div>
                ) : selectedClient.report_links.map((link, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: T.jsonStr }}>{link.url}</div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: T.inkMuted }}>{link.generated}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: link.active ? T.jsonStr : T.inkMuted }} />
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: link.active ? T.jsonStr : T.inkMuted }}>{link.active ? 'Active' : 'Expired'}</span>
                      </span>
                      <button
                        onClick={() => copyLink(link.url)}
                        style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: linkCopied === link.url ? T.jsonStr : T.jsonMetric, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {linkCopied === link.url ? 'Copied ✓' : 'Copy →'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state — no clients */}
        {CLIENTS.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 4rem)', gap: 12 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, textTransform: 'uppercase', color: T.jsonMetric }}>PORTFOLIO EMPTY</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 24, color: T.inkPrimary }}>Add your first client.</h2>
            <p style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, color: T.inkSec }}>Paste any URL. Run a scan. Get a full diagnostic.</p>
          </div>
        )}

      </main>
    </div>
  )
}
