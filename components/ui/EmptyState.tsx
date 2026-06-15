'use client'

import Link from 'next/link'
import WeavnMark from '@/components/ui/WeavnMark'

/**
 * Shared, surface-aware empty state. Replaces the flat grey "No scans yet."
 * text that is the first thing every new user sees. Accent (steel on /app,
 * purple on /console) flows from --surface-accent, so the same component reads
 * correctly on either surface: a ghosted instrument mark, a faint accent bloom
 * fading to black, corner brackets, a one-line headline, and a single action.
 *
 * `dense` drops the framing border for use inside an existing bordered panel
 * (console activity feeds, delivery log). Pass `children` to supply a custom
 * action area (e.g. the first-run scan input) instead of the button.
 */

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const INK_PRIMARY = '#E6E9EE'
const INK_SECONDARY = '#9398A8'
const ACCENT = 'var(--surface-accent)'

export interface EmptyStateProps {
  headline: string
  sub?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  /** Compact, borderless variant for use inside an existing bordered panel. */
  dense?: boolean
  /** Custom action area (rendered in place of the button), e.g. a scan input. */
  children?: React.ReactNode
}

export default function EmptyState({ headline, sub, actionLabel, actionHref, onAction, dense = false, children }: EmptyStateProps) {
  const markSize = dense ? 34 : 56

  const action = children ?? (actionLabel ? (
    actionHref ? (
      <Link
        href={actionHref}
        style={{
          display: 'inline-block', fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: ACCENT, background: 'color-mix(in srgb, var(--surface-accent) 9%, transparent)',
          border: '0.5px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
          padding: '10px 18px', textDecoration: 'none', whiteSpace: 'nowrap',
        }}
      >
        {actionLabel}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onAction}
        style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: ACCENT, background: 'color-mix(in srgb, var(--surface-accent) 9%, transparent)',
          border: '0.5px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
          padding: '10px 18px', borderRadius: 0, cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {actionLabel}
      </button>
    )
  ) : null)

  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        border: dense ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
        background: dense ? 'transparent' : '#0A0E18',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: dense ? '40px 24px' : '72px 32px',
      }}
    >
      {/* Corner brackets in the surface accent (framed variant only) */}
      {!dense && (
        <>
          <span aria-hidden style={{ position: 'absolute', top: -1, left: -1, width: 11, height: 11, borderTop: `1px solid ${ACCENT}`, borderLeft: `1px solid ${ACCENT}` }} />
          <span aria-hidden style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderBottom: `1px solid ${ACCENT}`, borderRight: `1px solid ${ACCENT}` }} />
        </>
      )}

      {/* Faint accent bloom fading to black */}
      <div
        aria-hidden
        style={{
          position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -50%)',
          width: dense ? 320 : 520, height: dense ? 200 : 320,
          background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--surface-accent) 13%, transparent) 0%, transparent 72%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
        {/* Ghosted instrument mark, tinted to the surface accent */}
        <div style={{ opacity: 0.22, marginBottom: dense ? 14 : 20, display: 'flex', justifyContent: 'center' }}>
          <WeavnMark size={markSize} ringTints={{ outer: ACCENT, middle: ACCENT, inner: ACCENT }} />
        </div>

        <h3 style={{ fontFamily: DISP, fontWeight: 700, fontSize: dense ? 17 : 22, color: INK_PRIMARY, margin: 0, letterSpacing: '-0.3px' }}>
          {headline}
        </h3>
        {sub ? (
          <p style={{ fontFamily: BODY, fontSize: dense ? 13 : 14.5, color: INK_SECONDARY, margin: '10px auto 0', maxWidth: 360, lineHeight: 1.6 }}>
            {sub}
          </p>
        ) : null}
        {action ? <div style={{ marginTop: dense ? 18 : 24 }}>{action}</div> : null}
      </div>
    </div>
  )
}
