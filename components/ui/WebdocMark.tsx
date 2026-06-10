'use client'
import { useId, type CSSProperties } from 'react'

interface WebdocMarkProps {
  size?: number
  animated?: boolean
  style?: CSSProperties
  className?: string
}

export default function WebdocMark({ size = 46, animated = false, style, className }: WebdocMarkProps) {
  const rawId = useId()
  const uid = rawId.replace(/:/g, '_')
  const w = size
  const h = Math.round(size * 0.925)

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 60 200 185"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0, ...style }}
      className={className}
      aria-hidden
    >
      {animated && (
        <style>{`
          @keyframes wm-pulse {
            0%, 100% { opacity: var(--base-op); transform: scale(1); }
            50% { opacity: calc(var(--base-op) * 0.6); transform: scale(1.04); }
          }
          @media (prefers-reduced-motion: reduce) {
            .wm-ring { animation-play-state: paused !important; }
          }
        `}</style>
      )}
      <defs>
        <filter id={`wm-hg-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`wm-rg-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ring5 — outermost, steel blue */}
      <polygon
        points="100,76 171.1,117 171.1,199 100,240 28.9,199 28.9,117"
        fill="none"
        stroke="#6F9BC6"
        strokeWidth="0.7"
        opacity={animated ? undefined : 0.13}
        filter={`url(#wm-rg-${uid})`}
        className={animated ? 'wm-ring' : undefined}
        style={animated ? ({
          '--base-op': '0.13',
          animation: 'wm-pulse 3.2s ease-in-out infinite',
          transformBox: 'fill-box',
          transformOrigin: '50% 50%',
          opacity: 0.13,
        } as unknown as CSSProperties) : undefined}
      />

      {/* ring4 — purple */}
      <polygon
        points="100,108 157.2,141 157.2,207 100,240 42.8,207 42.8,141"
        fill="none"
        stroke="#8080c0"
        strokeWidth="0.9"
        opacity={animated ? undefined : 0.25}
        filter={`url(#wm-rg-${uid})`}
        className={animated ? 'wm-ring' : undefined}
        style={animated ? ({
          '--base-op': '0.25',
          animation: 'wm-pulse 2.8s ease-in-out infinite 0.4s',
          transformBox: 'fill-box',
          transformOrigin: '50% 50%',
          opacity: 0.25,
        } as unknown as CSSProperties) : undefined}
      />

      {/* ring3 — steel blue */}
      <polygon
        points="100,136 145.0,162 145.0,214 100,240 55.0,214 55.0,162"
        fill="none"
        stroke="#6F9BC6"
        strokeWidth="1.2"
        opacity="0.42"
        filter={`url(#wm-rg-${uid})`}
      />

      {/* ring2 — green */}
      <polygon
        points="100,160 134.6,180 134.6,220 100,240 65.4,220 65.4,180"
        fill="none"
        stroke="#00C48C"
        strokeWidth="1.5"
        opacity="0.62"
        filter={`url(#wm-rg-${uid})`}
      />

      {/* ring1 — purple */}
      <polygon
        points="100,180 126.0,195 126.0,225 100,240 74.0,225 74.0,195"
        fill="none"
        stroke="#8080c0"
        strokeWidth="1.8"
        opacity="0.82"
        filter={`url(#wm-rg-${uid})`}
      />

      {/* core outer — white, heavy glow */}
      <polygon
        points="100,196 119.1,207 119.1,229 100,240 80.9,229 80.9,207"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        opacity="0.95"
        filter={`url(#wm-hg-${uid})`}
      />

      {/* core inner — white */}
      <polygon
        points="100,202 113.9,210 113.9,226 100,234 86.1,226 86.1,210"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.5"
        opacity="0.28"
      />

      {/* center dot */}
      <circle
        cx="100"
        cy="218"
        r="2.5"
        fill="#FFFFFF"
        opacity="0.95"
      />
    </svg>
  )
}
