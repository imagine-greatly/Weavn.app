'use client'

import VerdictRing from '@/components/ui/VerdictRing'
import { scoreColor, scoreToVerdict, estimatePercentile, ordinal } from '@/lib/verdict'

/**
 * Self-contained verdict card (founder steel surface) — near-monochrome.
 * Works standalone (single-site cockpit) AND as a tile in the portfolio grid with
 * NO restructuring (fills its container's width). Reuses VerdictRing + lib/verdict.
 *
 * COLOR DISCIPLINE: the frame is monochrome (black + hairline borders + gray text).
 * Color is rationed to signal only — the VerdictRing (the hero) and the band-colored
 * verdict label carry it; high/critical findings get a colored marker/tag while
 * medium-and-below are muted gray; steel (var(--surface-accent)) is reserved for the
 * "FULL REPORT →" affordance. No bloom, no corner brackets, no glow.
 */

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const C = {
  inkPrimary: '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted: '#6E7587',
  inkDim: '#5A6070',
  surface: '#0A0E18',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
} as const

const STEEL = 'var(--surface-accent)' // interaction affordance only

export interface VerdictCardFinding {
  title: string
  /** Marker/tag color for a high-signal (high/critical) finding. */
  color: string
  /** Short trailing tag (severity word or est. lift). */
  tag?: string
  /** Muted (medium and below): dim gray marker + gray text — must not borrow urgency. */
  muted?: boolean
}

export interface VerdictCardProps {
  domain: string
  score: number
  /** Override the computed "{verdict} · {pct} percentile" line (e.g. canonical sample). */
  verdictLabel?: string
  summary: string
  findings: VerdictCardFinding[]
  /** Footer text (sample, no link). Ignored when `href` is set. */
  footer?: string
  /** Full report link; when set the footer is "27 categories · 308 checks · FULL REPORT →". */
  href?: string
  /** Ghosted "what you'll get" sample treatment (dashed hairline border, reduced opacity). */
  sample?: boolean
}

export default function VerdictCard({ domain, score, verdictLabel, summary, findings, footer, href, sample }: VerdictCardProps) {
  const color = scoreColor(score) // the verdict band color — carried by ring + label only
  const label = verdictLabel ?? `${scoreToVerdict(score)} · ${ordinal(estimatePercentile(score))} percentile`

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: C.surface,
        border: sample ? `1px dashed ${C.borderStrong}` : `0.5px solid ${C.border}`,
        opacity: sample ? 0.62 : 1,
        padding: '22px',
      }}
    >
      {sample && (
        <span style={{
          position: 'absolute', top: 14, right: 16,
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: C.inkMuted, border: `0.5px solid ${C.borderStrong}`, padding: '2px 7px',
        }}>
          Sample report
        </span>
      )}

      {/* Verdict row — VerdictRing is the one authoritative point of color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 18, borderBottom: `0.5px solid ${C.border}` }}>
        <VerdictRing score={score} size="lg" animate={!sample} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color, margin: '0 0 6px' }}>{label}</p>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 17, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</p>
          <p style={{ fontFamily: BODY, fontSize: 13, color: C.inkSecondary, margin: 0, lineHeight: 1.5 }}>{summary}</p>
        </div>
      </div>

      {/* Top findings — color only on high/critical; medium and below muted gray */}
      {findings.length > 0 && (
        <div style={{ padding: '16px 0' }}>
          <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.inkMuted, margin: '0 0 12px' }}>Top findings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {findings.map((f) => {
              const marker = f.muted ? C.inkDim : f.color
              return (
                <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span aria-hidden style={{ width: 7, height: 7, background: marker, flexShrink: 0 }} />
                  <span style={{ fontFamily: BODY, fontSize: 13.5, color: f.muted ? C.inkSecondary : C.inkPrimary, flex: 1, minWidth: 0, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                  {f.tag && (
                    <span style={{
                      fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: f.muted ? C.inkMuted : f.color,
                      border: `0.5px solid ${f.muted ? C.border : `${f.color}66`}`,
                      padding: '2px 7px', flexShrink: 0,
                    }}>{f.tag}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      {href ? (
        <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 12 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkMuted, letterSpacing: '0.02em' }}>27 categories · 308 checks · </span>
          <a href={href} style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.04em', color: STEEL, textDecoration: 'none' }}>FULL REPORT →</a>
        </div>
      ) : footer ? (
        <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 12 }}>
          <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkMuted, margin: 0, letterSpacing: '0.02em' }}>{footer}</p>
        </div>
      ) : null}
    </div>
  )
}
