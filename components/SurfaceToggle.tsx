'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Surface toggle — the bottom-left identity-rail instrument switch.
 *
 * Surface is CLIENT state on <html data-surface>, not a hard route boundary, so the
 * accent repaint plays live before the route changes. On flip the toggle runs a
 * staged "weighted crossing": the slider travels, --surface-accent passes THROUGH a
 * desaturated neutral (CSS @property keyframes in globals.css), the content scrims,
 * the nav reconfigures with a stagger, and the bloom pulses — then the route push is
 * deferred to the tail of the crossing so the chrome (color + nav) is continuous and
 * only the page content swaps. Dashboard = steel #6F9BC6, Developers = purple #9D8CFF.
 */

export type Surface = 'app' | 'console'

const MONO = "'IBM Plex Mono', monospace"
const MUTED = '#6E7587'
const INK = '#E6E9EE'

const HREF: Record<Surface, string> = { app: '/app', console: '/console' }

const SEGMENTS: { id: Surface; label: string }[] = [
  { id: 'app', label: 'Dashboard' },
  { id: 'console', label: 'Developers' },
]

/** Surface-specific nav, shared so a shell can render the incoming surface's items
 *  (display-only) during the crossing before the route push lands. */
export const SURFACE_NAV: Record<Surface, { label: string; href?: string }[]> = {
  // Display-only crossing preview (the superset). The LIVE /app nav is composed by
  // tier in DashboardShell — founders: Overview · Billing; agency: + Clients · Branding.
  // "Reports" is folded into the Overview (the scan history) and never appears.
  app: [
    { label: 'Overview', href: '/app' },
    { label: 'Clients', href: '/app/clients' },
    { label: 'Branding', href: '/app/branding' },
    { label: 'Billing', href: '/app/billing' },
  ],
  console: [
    { label: 'Overview' },
    { label: 'Scans' },
    { label: 'API Keys' },
    { label: 'Webhooks' },
    { label: 'Billing' },
    { label: 'Docs' },
  ],
}

type Phase = 'idle' | 'leaving' | 'entering'

/**
 * Orchestrates the crossing. `initial` is the shell's own surface.
 * Returns `surface` (drives the slider + active accent target), `navSurface`
 * (which surface's nav to render — lags so outgoing items leave first), the nav
 * `phase`, a `crossing` guard, and `flipTo`.
 */
export function useSurfaceCrossing(initial: Surface) {
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [surface, setSurface] = useState<Surface>(initial)
  const [navSurface, setNavSurface] = useState<Surface>(initial)
  const [phase, setPhase] = useState<Phase>('idle')
  const crossing = phase !== 'idle'
  const timers = useRef<number[]>([])

  useEffect(() => {
    const t = timers.current
    return () => { t.forEach(id => clearTimeout(id)); t.length = 0 }
  }, [])

  const flipTo = useCallback((target: Surface) => {
    if (crossing || target === surface) return
    const root = rootRef.current
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setSurface(target)                          // slider travels immediately
    if (root) root.dataset.surface = target     // steady-state accent once keyframes finish

    if (reduce) {
      setNavSurface(target)                     // instant nav swap; CSS does the 220ms crossfade
      const t = window.setTimeout(() => router.push(HREF[target]), 220)
      timers.current.push(t)
      return
    }

    setPhase('leaving')
    if (root) root.classList.add(
      'surface-crossing',
      target === 'console' ? 'surface-cross-to-console' : 'surface-cross-to-app',
    )

    // Outgoing nav leaves over 200ms, 120ms empty hold, then incoming staggers in.
    const t1 = window.setTimeout(() => { setNavSurface(target); setPhase('entering') }, 320)
    // Defer the route push to the tail of the crossing — accent has fully resolved,
    // chrome is continuous, only the page content swaps (masked by the scrim tail).
    const t2 = window.setTimeout(() => { router.push(HREF[target]) }, 660)
    const t3 = window.setTimeout(() => {
      if (root) root.classList.remove('surface-crossing', 'surface-cross-to-console', 'surface-cross-to-app')
      setPhase('idle')
    }, 800)
    timers.current.push(t1, t2, t3)
  }, [crossing, surface, router])

  return { rootRef, surface, navSurface, phase, crossing, flipTo }
}

export interface SurfaceToggleProps {
  /** The active segment (the shell's `surface` from useSurfaceCrossing). */
  current: Surface
  /** Disabled while a crossing is in flight. */
  crossing: boolean
  onFlip: (target: Surface) => void
}

export default function SurfaceToggle({ current, crossing, onFlip }: SurfaceToggleProps) {
  const activeIndex = current === 'app' ? 0 : 1

  return (
    <div style={{ position: 'relative', padding: '16px 18px 4px' }}>
      {/* Ambient accent bloom — bottom-left anchor for the surface's color identity */}
      <div
        aria-hidden
        className="surface-toggle-bloom"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -18,
          width: 230,
          height: 130,
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(ellipse 78% 92% at 50% 100%, color-mix(in srgb, var(--surface-accent) 26%, transparent) 0%, color-mix(in srgb, var(--surface-accent) 9%, transparent) 40%, transparent 78%)',
          opacity: 0.62,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Eyebrow — signals mode, not nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, position: 'relative', zIndex: 1 }}>
        <span
          aria-hidden
          style={{
            width: 5,
            height: 5,
            background: 'var(--surface-accent)',
            boxShadow: '0 0 6px color-mix(in srgb, var(--surface-accent) 75%, transparent)',
            flexShrink: 0,
          }}
        />
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED }}>
          Surface
        </span>
      </div>

      {/* Two-segment instrument switch — zero radius, corner brackets, sliding lit indicator */}
      <div
        role="group"
        aria-label="Workspace surface"
        style={{ position: 'relative', display: 'flex', border: '0.5px solid rgba(255,255,255,0.12)', zIndex: 1 }}
      >
        {/* Sliding lit indicator behind the active segment */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '50%',
            transform: `translateX(${activeIndex * 100}%)`,
            transition: 'transform 580ms cubic-bezier(.76,0,.24,1)',
            background: 'color-mix(in srgb, var(--surface-accent) 13%, transparent)',
            border: '0.5px solid color-mix(in srgb, var(--surface-accent) 55%, transparent)',
            boxShadow:
              'inset 0 0 12px color-mix(in srgb, var(--surface-accent) 22%, transparent), 0 0 14px color-mix(in srgb, var(--surface-accent) 18%, transparent)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* L-shaped corner brackets — top-left + bottom-right, card motif */}
        <span aria-hidden style={{ position: 'absolute', top: -1, left: -1, width: 7, height: 7, borderTop: '1px solid var(--surface-accent)', borderLeft: '1px solid var(--surface-accent)', pointerEvents: 'none', zIndex: 3 }} />
        <span aria-hidden style={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderBottom: '1px solid var(--surface-accent)', borderRight: '1px solid var(--surface-accent)', pointerEvents: 'none', zIndex: 3 }} />

        {SEGMENTS.map(seg => {
          const active = current === seg.id
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => onFlip(seg.id)}
              disabled={crossing}
              aria-pressed={active}
              style={{
                position: 'relative',
                zIndex: 2,
                flex: 1,
                background: 'transparent',
                border: 'none',
                cursor: crossing ? 'default' : 'pointer',
                padding: '9px 8px',
                fontFamily: MONO,
                fontSize: 10.5,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: active ? INK : MUTED,
                transition: 'color 200ms ease',
                whiteSpace: 'nowrap',
              }}
            >
              {seg.label}
            </button>
          )
        })}
      </div>

      {/* Quiet framing caption — why both surfaces exist. Dashboard-surface only,
          subordinate to the toggle (muted mono one-liner, not a heading). */}
      {current === 'app' && (
        <p style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.04em', color: MUTED, margin: '9px 0 0', lineHeight: 1.5, position: 'relative', zIndex: 1 }}>
          Same engine. Rendered for humans.
        </p>
      )}
    </div>
  )
}
