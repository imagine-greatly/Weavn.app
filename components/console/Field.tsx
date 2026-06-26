import type { CSSProperties, ReactNode, ElementType } from 'react'

/**
 * Field — inset surface for code, key fragments, and inputs on the console.
 * One flat treatment: --field-bg + --field-border (1px solid rgba .10), zero radius,
 * no shadow. Render as <div> (default), <code>, or <pre> via `as`.
 */

const MONO = "'IBM Plex Mono', monospace"

export interface FieldProps {
  children?: ReactNode
  as?: ElementType
  className?: string
  style?: CSSProperties
  mono?: boolean
}

export default function Field({ children, as: Tag = 'div', className, style, mono = true }: FieldProps) {
  return (
    <Tag
      className={className}
      style={{
        background: 'var(--field-bg)',
        border: 'var(--field-border)',
        padding: '12px 14px',
        ...(mono ? { fontFamily: MONO } : {}),
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
