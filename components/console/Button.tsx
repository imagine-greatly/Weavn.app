import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

/**
 * Button — flat console affordance, NO shadow / glow. Two variants:
 *   ghost   — neutral hairline (--btn-ghost-border), muted text → brightens on hover
 *   primary — purple accent edge (--btn-primary-border) + faint .08 accent fill
 * Mono uppercase label, zero radius, integer-pixel borders. Purple is punctuation:
 * primary is the one accented action per view; everything else is ghost.
 */

const MONO = "'IBM Plex Mono', monospace"
const ACCENT = '#9D8CFF'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'primary'
  children?: ReactNode
}

export default function Button({ variant = 'ghost', children, style, className, ...rest }: ButtonProps) {
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
      ? { color: ACCENT, border: 'var(--btn-primary-border)', background: 'var(--btn-primary-fill)' }
      : { color: '#9398A8', border: 'var(--btn-ghost-border)' }

  return (
    <button className={className} style={{ ...base, ...variantStyle, ...style }} {...rest}>
      {children}
    </button>
  )
}
