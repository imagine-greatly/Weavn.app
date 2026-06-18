import type { CSSProperties } from 'react'

/**
 * CornerBrackets — the shared L-bracket card motif. Accent-aware via --surface-accent
 * by default (steel on /app, purple on /console). Render inside a position:relative
 * parent. Pass any subset of corners; common patterns are top-left+bottom-right
 * (cards) or top-left+top-right (panels).
 */

export type Corner = 'tl' | 'tr' | 'bl' | 'br'

export interface CornerBracketsProps {
  /** Which corners to draw. Default: all four. */
  corners?: Corner[]
  /** Arm length in px. */
  size?: number
  /** Border color — defaults to the live surface accent. */
  color?: string
  /** Border thickness in px. */
  weight?: number
  /** Offset from the parent edge in px (negative sits on the border). */
  inset?: number
}

export default function CornerBrackets({
  corners = ['tl', 'tr', 'bl', 'br'],
  size = 11,
  color = 'var(--surface-accent)',
  weight = 1,
  inset = -1,
}: CornerBracketsProps) {
  const border = `${weight}px solid ${color}`
  const base: CSSProperties = { position: 'absolute', width: size, height: size, pointerEvents: 'none' }

  const styleFor = (c: Corner): CSSProperties => {
    switch (c) {
      case 'tl':
        return { ...base, top: inset, left: inset, borderTop: border, borderLeft: border }
      case 'tr':
        return { ...base, top: inset, right: inset, borderTop: border, borderRight: border }
      case 'bl':
        return { ...base, bottom: inset, left: inset, borderBottom: border, borderLeft: border }
      case 'br':
        return { ...base, bottom: inset, right: inset, borderBottom: border, borderRight: border }
    }
  }

  return (
    <>
      {corners.map((c) => (
        <span key={c} aria-hidden style={styleFor(c)} />
      ))}
    </>
  )
}
