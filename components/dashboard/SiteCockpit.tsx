'use client'

import { useState } from 'react'
import ScoreRing from '@/components/ui/ScoreRing'
import {
  buildShareUrl,
  estimatePercentile,
  ordinal,
  scoreToVerdict,
  type SiteSummary,
} from '@/lib/dashboard'
import { scoreColor } from '@/lib/verdict'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
// Steel #6F9BC6 is the signature. Green = success-only, amber/red = verdict-only,
// NO purple (purple is the developer/console surface). Source: tailwind.config.ts.
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  success:      '#00C48C',
  amber:        '#EFB23E',
  worse:        '#E8635F',
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

function severityColor(sev: string): string {
  const s = sev.toLowerCase()
  if (s === 'critical') return C.worse
  if (s === 'passing') return C.success
  return C.amber
}

const btnPrimary: React.CSSProperties = {
  fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: C.steel, background: 'rgba(111,155,198,0.1)',
  border: '1px solid rgba(111,155,198,0.5)',
  padding: '10px 18px', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
}
const btnGhost: React.CSSProperties = {
  fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: C.inkSecondary, background: 'transparent',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '10px 18px', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
}

// ── Trend sparkline ────────────────────────────────────────────────────────────
// Pure SVG line (the one place an "arc/line" is allowed on the zero-radius surface).
function TrendLine({ history }: { history: { score: number; date: string }[] }) {
  if (history.length < 2) {
    return (
      <p style={{ fontFamily: MONO, fontSize: 11, color: C.inkMuted, margin: 0 }}>
        First scan — no trend yet. Re-scan over time to track movement.
      </p>
    )
  }
  const W = 320
  const H = 64
  const pad = 4
  const n = history.length
  const xs = (i: number) => pad + (i / (n - 1)) * (W - pad * 2)
  const ys = (score: number) => H - pad - (Math.max(0, Math.min(100, score)) / 100) * (H - pad * 2)
  const pts = history.map((h, i) => `${xs(i).toFixed(1)},${ys(h.score).toFixed(1)}`).join(' ')
  const last = history[n - 1]

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={C.steel}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.85}
      />
      {history.map((h, i) => (
        <circle
          key={i}
          cx={xs(i)}
          cy={ys(h.score)}
          r={i === n - 1 ? 3 : 1.6}
          fill={i === n - 1 ? C.steel : 'rgba(111,155,198,0.5)'}
        />
      ))}
      <text
        x={xs(n - 1)}
        y={ys(last.score) - 8}
        textAnchor="end"
        fontFamily={MONO}
        fontSize={10}
        fill={C.steel}
      >
        {last.score}
      </text>
    </svg>
  )
}

export interface SiteCockpitProps {
  site: SiteSummary
  /** Runs the real /api/scan for this domain (page-level handler). */
  onScanAgain: () => void
  rescanning?: boolean
  /** Shown only when drilled in from the portfolio — returns to the agency list. */
  onBack?: () => void
}

export default function SiteCockpit({ site, onScanAgain, rescanning = false, onBack }: SiteCockpitProps) {
  const [copied, setCopied] = useState(false)
  const { domain, score, shareToken, delta, previousScore, findings, history } = site

  const verdict = scoreToVerdict(score)
  const vColor = scoreColor(score)
  const pct = estimatePercentile(score)

  const deltaText =
    previousScore == null
      ? 'First scan'
      : delta === 0
        ? 'No change since last scan'
        : delta! > 0
          ? `↑ +${delta} since last scan`
          : `↓ ${Math.abs(delta!)} since last scan`
  const deltaColor = previousScore == null || delta === 0 ? C.inkMuted : delta! > 0 ? C.success : C.worse

  async function onShare() {
    if (!shareToken) return
    try {
      await navigator.clipboard.writeText(buildShareUrl(shareToken))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div style={{ padding: '32px 32px 56px', maxWidth: 1040, margin: '0 auto' }}>

      {/* Back to portfolio (agency drill-down only) */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: C.inkMuted, background: 'transparent', border: 'none', borderRadius: 0,
            padding: 0, marginBottom: 18, cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.steel }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.inkMuted }}
        >
          ← All sites
        </button>
      )}

      {/* Header: domain + primary actions */}
      <div
        className="dashboard-header-row"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.steel, margin: '0 0 8px' }}>
            Site cockpit
          </p>
          <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: 0, letterSpacing: '-0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {domain}
          </h1>
        </div>
        <div className="site-health-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={onScanAgain} disabled={rescanning} style={{ ...btnPrimary, opacity: rescanning ? 0.5 : 1, cursor: rescanning ? 'default' : 'pointer' }}>
            {rescanning ? 'Scanning…' : 'Scan again'}
          </button>
          {shareToken ? (
            <a href={`/reports/${shareToken}`} style={btnGhost}>View full report →</a>
          ) : (
            <span style={{ ...btnGhost, opacity: 0.4, cursor: 'not-allowed' }}>View full report →</span>
          )}
          <button type="button" onClick={onShare} disabled={!shareToken} style={{ ...btnGhost, opacity: shareToken ? 1 : 0.4, cursor: shareToken ? 'pointer' : 'not-allowed' }}>
            {copied ? 'Copied ✓' : 'Share'}
          </button>
        </div>
      </div>

      {/* Score + trend */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 0,
          border: `0.5px solid ${C.border}`, background: C.surface, marginBottom: 28,
        }}
      >
        {/* Score ring with a subtle steel glow (the one allowed bloom on this surface) */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '32px 24px', borderRight: `0.5px solid ${C.border}` }}>
          <div
            aria-hidden
            style={{
              position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 180, height: 180, borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(111,155,198,0.10) 0%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <ScoreRing score={score} size="lg" showBadge={false} />
          </div>
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.06em', color: vColor, textTransform: 'uppercase' }}>
              {verdict}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.inkMuted, marginTop: 4 }}>
              {ordinal(pct)} percentile <span style={{ opacity: 0.7 }}>· est. vs. industry</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: deltaColor, marginTop: 6 }}>
              {deltaText}
            </div>
          </div>
        </div>

        {/* Trend line */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.inkMuted, margin: '0 0 14px' }}>
            Score history · {history.length} {history.length === 1 ? 'scan' : 'scans'}
          </p>
          <TrendLine history={history} />
        </div>
      </div>

      {/* Top 3 findings — NEVER the full array (that's the report's job) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: C.inkMuted, margin: 0 }}>
            Top priorities
          </p>
          {site.criticalCount > 0 && (
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: C.worse, textTransform: 'uppercase' }}>
              {site.criticalCount} critical
            </span>
          )}
        </div>

        {findings.length === 0 ? (
          <div style={{ border: `0.5px solid ${C.border}`, background: C.surface, padding: '20px 22px' }}>
            <p style={{ fontFamily: BODY, fontSize: 14, color: C.inkSecondary, margin: 0 }}>
              No prioritized findings on the latest scan. Open the full report for the complete breakdown.
            </p>
          </div>
        ) : (
          <div style={{ borderTop: `0.5px solid ${C.border}`, borderLeft: `0.5px solid ${C.border}`, borderRight: `0.5px solid ${C.border}` }}>
            {findings.map(f => (
              <div
                key={f.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 20px', borderBottom: `0.5px solid ${C.border}`, background: C.surface,
                }}
              >
                <span
                  title={f.severity}
                  style={{
                    fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
                    color: severityColor(f.severity), border: `0.5px solid ${severityColor(f.severity)}66`,
                    padding: '3px 8px', flexShrink: 0, textTransform: 'uppercase',
                  }}
                >
                  P{f.priority}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: BODY, fontSize: 14, color: C.inkPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.title}
                  </div>
                </div>
                {f.estLift && (
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.success, flexShrink: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.estLift}>
                    {f.estLift}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Handoff to the full report — the only "see everything" path */}
      {shareToken && (
        <a
          href={`/reports/${shareToken}`}
          style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em', color: C.steel, textDecoration: 'none' }}
        >
          See every finding in the full report →
        </a>
      )}
    </div>
  )
}
