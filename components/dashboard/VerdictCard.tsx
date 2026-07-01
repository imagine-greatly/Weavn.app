'use client'

import VerdictRing from '@/components/ui/VerdictRing'
import { scoreColor, COVERAGE_TOLERANCE } from '@/lib/verdict'
import { DASH, MONO, BODY, DISP, STEEL, ELEV } from '@/components/dashboard/ui'

/**
 * Verdict card (founder steel surface) — a crafted, near-monochrome coverage headline.
 * Works standalone AND as a tile. The frame is elevated (raised plane + top-edge highlight
 * + hairline border); color is rationed to signal only — the VerdictRing (the hero) and the
 * band-colored coverage label carry it, high/critical findings get a colored chip while
 * medium-and-below stay muted gray, and steel is reserved for the "FULL REPORT →" affordance.
 *
 * FRAMING: coverage, not a grade. The headline is the % of catalogued conversion
 * best-practices a page captures — no fabricated percentile / corpus-rank language.
 */

const C = {
  inkPrimary: DASH.ink,
  inkSecondary: DASH.ink2,
  inkMuted: DASH.ink3,
  inkDim: DASH.ink4,
  border: DASH.line,
  hair: DASH.hair,
  borderStrong: DASH.lineHi,
} as const

export interface VerdictCardFinding {
  title: string
  /** Marker/chip color for a high-signal (high/critical) finding. */
  color: string
  /** Short trailing tag (severity word or est. lift). */
  tag?: string
  /** Muted (medium and below): dim gray marker + gray text — must not borrow urgency. */
  muted?: boolean
}

export interface VerdictCardProps {
  domain: string
  score: number
  /** Override the computed coverage line (e.g. an illustrative sample). */
  verdictLabel?: string
  summary: string
  findings: VerdictCardFinding[]
  /** Footer text (sample, no link). Ignored when `href` is set. */
  footer?: string
  /** Full report link; when set the footer is "27 categories · 311 checks · FULL REPORT →". */
  href?: string
  /** Ghosted "what you'll get" illustration (dashed hairline, reduced opacity). */
  sample?: boolean
}

export default function VerdictCard({ domain, score, verdictLabel, summary, findings, footer, href, sample }: VerdictCardProps) {
  const color = scoreColor(score) // the coverage band color — carried by ring + label only
  const label = verdictLabel ?? `${score}% ±${COVERAGE_TOLERANCE} coverage`

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: DASH.panel,
        border: sample ? `1px dashed ${C.borderStrong}` : `1px solid ${C.border}`,
        boxShadow: sample ? 'none' : ELEV,
        opacity: sample ? 0.72 : 1,
        padding: '24px',
      }}
    >
      {sample && (
        <span style={{
          position: 'absolute', top: 16, right: 18,
          fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: C.inkMuted, border: `1px solid ${C.border}`, padding: '3px 8px',
        }}>
          Illustration
        </span>
      )}

      {/* Verdict row — VerdictRing is the one authoritative point of color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 20, borderBottom: `1px solid ${C.hair}` }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {!sample && <div aria-hidden style={{ position: 'absolute', inset: -14, background: `radial-gradient(circle at center, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />}
          <div style={{ position: 'relative' }}><VerdictRing score={score} size="lg" animate={!sample} /></div>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color, margin: '0 0 6px' }}>{label}</p>
          <p style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</p>
          <p style={{ fontFamily: BODY, fontSize: 13, color: C.inkSecondary, margin: 0, lineHeight: 1.55 }}>{summary}</p>
        </div>
      </div>

      {/* Top findings — color only on high/critical; medium and below muted gray */}
      {findings.length > 0 && (
        <div style={{ padding: '18px 0 4px' }}>
          <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.inkMuted, margin: '0 0 14px' }}>Top findings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {findings.map((f) => {
              const marker = f.muted ? C.inkDim : f.color
              return (
                <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span aria-hidden style={{ width: 7, height: 7, background: marker, flexShrink: 0, boxShadow: f.muted ? 'none' : `0 0 8px ${f.color}66` }} />
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
        <div style={{ borderTop: `1px solid ${C.hair}`, paddingTop: 14, marginTop: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkMuted, letterSpacing: '0.02em' }}>27 categories · 311 checks · </span>
          <a href={href} style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.04em', color: STEEL, textDecoration: 'none' }}>FULL REPORT →</a>
        </div>
      ) : footer ? (
        <div style={{ borderTop: `1px solid ${C.hair}`, paddingTop: 14, marginTop: 14 }}>
          <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkMuted, margin: 0, letterSpacing: '0.02em' }}>{footer}</p>
        </div>
      ) : null}
    </div>
  )
}
