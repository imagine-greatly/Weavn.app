import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

/**
 * Button — flat affordance, NO shadow / glow. Two variants:
 *   ghost   — neutral hairline (--btn-ghost-border), muted text → brightens on hover
 *   primary — accent edge (.45 border) + faint .08 accent fill
 * Mono uppercase label, zero radius, integer-pixel borders. The accent is punctuation:
 * primary is the one accented action per view; everything else is ghost.
 *
 * `accent` defaults to console purple; pass steel (#6F9BC6) to reuse on /app.
 */

const MONO = "'IBM Plex Mono', monospace"
const ACCENT_DEFAULT = '#9D8CFF'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'primary'
  accent?: string
  children?: ReactNode
}

export default function Button({ variant = 'ghost', accent = ACCENT_DEFAULT, children, style, className, ...rest }: ButtonProps) {
  const base: CSSProperties = {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '10px 16px',
    background: 'transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'color 150ms ease, border-color 150ms ease, background 150ms ease',
    boxShadow: 'none',
  }

  const variantStyle: CSSProperties =
    variant === 'primary'
      ? {
          color: accent,
          border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
          background: `color-mix(in srgb, ${accent} 8%, transparent)`,
        }
      : { color: '#9398A8', border: 'var(--btn-ghost-border)' }

  return (
    <button className={className} style={{ ...base, ...variantStyle, ...style }} {...rest}>
      {children}
    </button>
  )
}
