'use client'

import VerdictRing from '@/components/ui/VerdictRing'
import Bloom from '@/components/ui/Bloom'
import CornerBrackets from '@/components/ui/CornerBrackets'
import { scoreColor, scoreToVerdict, estimatePercentile, ordinal } from '@/lib/verdict'

/**
 * Self-contained verdict card (steel surface). Works standalone (single-site cockpit)
 * AND as a tile in the portfolio grid with NO restructuring — it fills its container's
 * width. Reuses VerdictRing / Bloom / CornerBrackets / lib/verdict (no reinvention).
 * Verdict colors are semantically fixed (scoreColor); the steel accent is structural.
 */

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const C = {
  inkPrimary: '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted: '#6E7587',
  surface: '#0A0E18',
  border: 'rgba(255,255,255,0.06)',
} as const

export interface VerdictCardFinding {
  title: string
  /** Severity dot color (verdict hex from lib/verdict / token). */
  color: string
  /** Short trailing tag (severity word or est. lift). */
  tag?: string
}

export interface VerdictCardProps {
  domain: string
  score: number
  /** Override the computed "{verdict} · {pct} percentile" line (e.g. canonical sample). */
  verdictLabel?: string
  summary: string
  findings: VerdictCardFinding[]
  /** Footer text (sample) — ignored when `href` is set (renders a report link instead). */
  footer?: string
  /** Full report link; when set the footer is a "View full report →" link. */
  href?: string
  /** Ghosted "what you'll get" sample treatment (dashed border, reduced opacity). */
  sample?: boolean
}

export default function VerdictCard({ domain, score, verdictLabel, summary, findings, footer, href, sample }: VerdictCardProps) {
  const color = scoreColor(score)
  const label = verdictLabel ?? `${scoreToVerdict(score)} · ${ordinal(estimatePercentile(score))} percentile`

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        background: C.surface,
        border: sample
          ? '1px dashed color-mix(in srgb, var(--surface-accent) 45%, rgba(255,255,255,0.06))'
          : '0.5px solid color-mix(in srgb, var(--surface-accent) 22%, rgba(255,255,255,0.06))',
        opacity: sample ? 0.62 : 1,
        padding: '22px',
      }}
    >
      <CornerBrackets corners={['tl', 'tr']} />
      <Bloom size={420} intensity={0.1} style={{ top: '28%' }} />

      {sample && (
        <span style={{
          position: 'absolute', top: 14, right: 16, zIndex: 2,
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--surface-accent)', border: '0.5px solid color-mix(in srgb, var(--surface-accent) 45%, transparent)', padding: '2px 7px',
        }}>
          Sample report
        </span>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Verdict row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 18, borderBottom: `0.5px solid ${C.border}` }}>
          <VerdictRing score={score} size="lg" animate={!sample} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color, margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</p>
            <p style={{ fontFamily: BODY, fontSize: 13, color: C.inkSecondary, margin: 0, lineHeight: 1.5 }}>{summary}</p>
          </div>
        </div>

        {/* Top findings */}
        {findings.length > 0 && (
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.inkMuted, margin: '0 0 12px' }}>Top findings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {findings.map((f) => (
                <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span aria-hidden style={{ width: 7, height: 7, background: f.color, flexShrink: 0, boxShadow: `0 0 6px ${f.color}66` }} />
                  <span style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkPrimary, flex: 1, minWidth: 0, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                  {f.tag && (
                    <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: f.color, border: `0.5px solid ${f.color}66`, padding: '2px 7px', flexShrink: 0 }}>{f.tag}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {href ? (
          <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 12 }}>
            <a href={href} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.04em', color: 'var(--surface-accent)', textDecoration: 'none' }}>
              View full report →
            </a>
          </div>
        ) : footer ? (
          <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 12 }}>
            <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkMuted, margin: 0, letterSpacing: '0.02em' }}>{footer}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
