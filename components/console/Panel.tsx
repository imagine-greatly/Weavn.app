import type { CSSProperties, ReactNode } from 'react'

/**
 * Panel — the single container primitive for the developer/console surface.
 * One flat treatment: --panel-bg + --panel-border (1px solid rgba .10), zero radius,
 * NO shadow / glow / backdrop-filter. Every section on the board is a <Panel> — no
 * more naked bordered divs, no more four-different-border-weights.
 *
 * Optional header band: a flex row with a mono-uppercase label on the left and an
 * optional `action` node on the right, divided from the body by --divider. A string
 * header is rendered with the standard console label style; pass a node for anything
 * custom (e.g. a sentence-case title in a later pass).
 */

const MONO = "'IBM Plex Mono', monospace"
const LABEL = '#8E8EA0'
const PAD = 18

export interface PanelProps {
  header?: ReactNode
  action?: ReactNode
  children?: ReactNode
  /** drop the body padding (e.g. for full-bleed tables/log rows). */
  flushBody?: boolean
  /** body padding override (default 18px). */
  padding?: number
  className?: string
  style?: CSSProperties
}

export default function Panel({ header, action, children, flushBody = false, padding = PAD, className, style }: PanelProps) {
  return (
    <div
      className={className}
      style={{ background: 'var(--panel-bg)', border: 'var(--panel-border)', ...style }}
    >
      {header != null ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: `12px ${PAD}px`,
            borderBottom: 'var(--divider)',
          }}
        >
          {typeof header === 'string' ? (
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: LABEL }}>
              {header}
            </span>
          ) : (
            header
          )}
          {action != null ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
        </div>
      ) : null}
      <div style={{ padding: flushBody ? 0 : padding }}>{children}</div>
    </div>
  )
}
