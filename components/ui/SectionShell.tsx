import type { CSSProperties, ReactNode } from 'react'

type BloomColor = 'steel' | 'cyan' | 'purple' | 'green' | 'none'
type Intensity  = 'low' | 'medium' | 'high'

interface SectionShellProps {
  children:       ReactNode
  bloom?:         BloomColor
  bloomPosition?: string
  intensity?:     Intensity
  ticks?:         boolean
  borderTop?:     boolean
  className?:     string
  style?:         CSSProperties
}

const BLOOM_RGBA: Record<Exclude<BloomColor, 'none'>, string> = {
  steel:  '111,155,198',
  cyan:   '0,200,255',
  purple: '157,140,255',
  green:  '0,196,140',
}

const INTENSITY: Record<Intensity, number> = {
  low:    0.04,
  medium: 0.07,
  high:   0.10,
}

const TICK_STYLE: CSSProperties = {
  position: 'absolute', width: 14, height: 14, pointerEvents: 'none', zIndex: 1,
}

export default function SectionShell({
  children,
  bloom = 'steel',
  bloomPosition = '50% 50%',
  intensity = 'low',
  ticks = true,
  borderTop = false,
  className,
  style,
}: SectionShellProps) {
  const rgba    = bloom !== 'none' ? BLOOM_RGBA[bloom] : null
  const opacity = INTENSITY[intensity]
  const border  = '0.5px solid rgba(111,155,198,0.2)'

  return (
    <section
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...(borderTop && { borderTop: '1px solid rgba(111,155,198,0.1)' }),
        ...style,
      }}
    >
      {/* Bloom */}
      {rgba && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none', zIndex: 0,
            background: `radial-gradient(ellipse 900px 600px at ${bloomPosition}, rgba(${rgba},${opacity}) 0%, transparent 65%)`,
          }}
        />
      )}

      {/* Corner ticks */}
      {ticks && (
        <>
          <div aria-hidden style={{ ...TICK_STYLE, top: 20, left: 20,  borderTop: border, borderLeft:   border }} />
          <div aria-hidden style={{ ...TICK_STYLE, top: 20, right: 20, borderTop: border, borderRight:  border }} />
          <div aria-hidden style={{ ...TICK_STYLE, bottom: 20, left: 20,  borderBottom: border, borderLeft:  border }} />
          <div aria-hidden style={{ ...TICK_STYLE, bottom: 20, right: 20, borderBottom: border, borderRight: border }} />
        </>
      )}

      {/* Content — above decorative layers */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </section>
  )
}

export { SectionShell }
