'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Scan-in-progress experience for the ~90s synchronous scan. This is the ONE
 * surface where weaving language belongs (the user is waiting).
 *
 * The centerpiece is the engine-core converging-thread weave: a static white
 * Weavn-mark core (the anchor, never crossed) surrounded by ~116 logo-colored
 * threads that orbit a wide hexagonal field and breathe inward to weave the
 * mark's three nested rings, then release — a continuous, honest loop with NO
 * fake progress bar, percentage, or timed phase schedule. The parent owns the
 * fetch and flips `status`; while 'weaving' the loop runs indefinitely until
 * the request resolves, then locks crisply on 'done' (or stops on 'error').
 *
 * Thread colors are the logo's FIXED ramp (purple/green/steel), not the surface
 * accent. Flat strokes only — no bloom, glow, or box-shadow on the weave.
 *
 * Copy obeys the brand rule: the product name never shares a sentence with
 * weave/weaving/woven. The finished report is "the weave".
 */

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const INK_PRIMARY = '#E6E9EE'
const INK_SECONDARY = '#9398A8'
const INK_MUTED = '#6E7587'
const WORSE = '#E8635F'
const ACCENT = 'var(--surface-accent)'

export type WeavingStatus = 'weaving' | 'done' | 'error'

export interface WeavingScanProps {
  domain: string
  status: WeavingStatus
  error?: string | null
  /** Reset back to the input (offered in the error state). */
  onReset?: () => void
}

// Shared easing — used both inside the per-frame build() (breathing convergence)
// and by the driver to capture/ramp convergence on the done-lock.
const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export default function WeavingScan({ domain, status, error, onReset }: WeavingScanProps) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(
      typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

  // ── Error — a clear stop, not a hung spinner (preserved) ────────────────────
  if (status === 'error') {
    return (
      <Frame>
        <span aria-hidden style={{ width: 9, height: 9, background: WORSE, marginBottom: 18 }} />
        <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 22, color: INK_PRIMARY, margin: 0, letterSpacing: '-0.3px' }}>
          Scan couldn&apos;t finish
        </h2>
        <p style={{ fontFamily: MONO, fontSize: 12, color: WORSE, margin: '12px 0 0' }}>{domain}</p>
        <p style={{ fontFamily: BODY, fontSize: 14, color: INK_SECONDARY, margin: '12px auto 0', maxWidth: 380, lineHeight: 1.6 }}>
          {error || 'Something interrupted the scan. Please try again.'}
        </p>
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            style={{
              marginTop: 24, fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: ACCENT, background: 'color-mix(in srgb, var(--surface-accent) 9%, transparent)',
              border: '0.5px solid color-mix(in srgb, var(--surface-accent) 50%, transparent)',
              padding: '10px 18px', borderRadius: 0, cursor: 'pointer',
            }}
          >
            Try another URL →
          </button>
        ) : null}
      </Frame>
    )
  }

  // Weaving and done share the same persistent SVG stage so the threads can lock
  // smoothly in place when the real scan resolves (no remount / no snap).
  return (
    <Frame>
      <WeaveStage status={status} reduced={reduced} />

      {status === 'done' ? (
        <>
          <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK_PRIMARY, margin: '18px 0 0', letterSpacing: '-0.4px' }}>
            Weave complete
          </h2>
          <p style={{ fontFamily: MONO, fontSize: 12, color: ACCENT, margin: '10px 0 0' }}>Opening your report…</p>
        </>
      ) : (
        <>
          <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK_PRIMARY, margin: '18px 0 0', letterSpacing: '-0.4px' }}>
            Weaving through {domain}…
          </h2>
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_MUTED, margin: '14px 0 0' }}>
            Running 311 checks · 27 categories
          </p>
          <PulseDots reduced={reduced} />
          <p style={{ fontFamily: MONO, fontSize: 11, color: INK_MUTED, margin: '16px 0 0' }}>
            this can take up to ~90 seconds · weaving until complete
          </p>
        </>
      )}
    </Frame>
  )
}

// ── Engine-core converging-thread weave (ported from the locked widget) ──────────
// RAF-driven inline SVG. fieldRef ↔ wv-uf (threads), coreRef ↔ wv-uc (core).
function WeaveStage({ status, reduced }: { status: 'weaving' | 'done'; reduced: boolean }) {
  const fieldRef = useRef<SVGGElement>(null)
  const coreRef = useRef<SVGGElement>(null)
  const buildRef = useRef<((time: number, doneConv: number | null) => void) | null>(null)
  const startRef = useRef<number>(0)
  const lastConvRef = useRef<number>(0.9)
  const reducedRef = useRef<boolean>(reduced)
  reducedRef.current = reduced

  // Build the geometry, the DOM nodes, and the per-frame build() ONCE on mount.
  // Persisted across weaving→done so the lock animates in place.
  useEffect(() => {
    const fl = fieldRef.current
    const cr = coreRef.current
    if (!fl || !cr) return
    const NS = 'http://www.w3.org/2000/svg'

    const BVx = 230, BVy = 312, SR = 3.5
    const T = (lx: number, ly: number): [number, number] => [BVx + (lx - 100) * SR, BVy + (ly - 228) * SR]

    const coreOuterL: [number, number][] = [[100, 204], [110.4, 210], [110.4, 222], [100, 228], [89.6, 222], [89.6, 210]]
    const coreInnerL: [number, number][] = [[100, 207], [107, 211], [107, 221], [100, 225], [93, 221], [93, 211]]
    const ring1L: [number, number][] = [[100, 196], [113.9, 204], [113.9, 220], [100, 228], [86.1, 220], [86.1, 204]]
    const ring2L: [number, number][] = [[100, 188], [117.3, 198], [117.3, 218], [100, 228], [82.7, 218], [82.7, 198]]
    const ring3L: [number, number][] = [[100, 180], [120.8, 192], [120.8, 216], [100, 228], [79.2, 216], [79.2, 192]]
    const tp = (arr: [number, number][]): [number, number][] => arr.map((p) => T(p[0], p[1]))
    const coreOuter = tp(coreOuterL), coreInner = tp(coreInnerL)
    const R1 = tp(ring1L), R2 = tp(ring2L), R3 = tp(ring3L)
    const hpath = (p: [number, number][]): string =>
      'M' + p.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L') + ' Z'

    // CORE (static, render once): hollow white outline hex + faint inner hex + dot.
    // No glow/box-shadow — flat strokes only. The core is never crossed.
    const c1 = document.createElementNS(NS, 'path')
    c1.setAttribute('d', hpath(coreOuter)); c1.setAttribute('fill', 'none'); c1.setAttribute('stroke', '#FFFFFF'); c1.setAttribute('stroke-width', '1.6'); c1.setAttribute('opacity', '0.95'); cr.appendChild(c1)
    const c2 = document.createElementNS(NS, 'path')
    c2.setAttribute('d', hpath(coreInner)); c2.setAttribute('fill', 'none'); c2.setAttribute('stroke', '#FFFFFF'); c2.setAttribute('stroke-width', '0.4'); c2.setAttribute('opacity', '0.28'); cr.appendChild(c2)
    const dotc = T(100, 216)
    const cd = document.createElementNS(NS, 'circle')
    cd.setAttribute('cx', String(dotc[0])); cd.setAttribute('cy', String(dotc[1])); cd.setAttribute('r', '1.8'); cd.setAttribute('fill', '#FFFFFF'); cd.setAttribute('opacity', '0.95'); cr.appendChild(cd)

    const MC: [number, number] = [0, 0]; R3.forEach((p) => { MC[0] += p[0]; MC[1] += p[1] }); MC[0] /= 6; MC[1] /= 6
    const CC: [number, number] = [0, 0]; coreOuter.forEach((p) => { CC[0] += p[0]; CC[1] += p[1] }); CC[0] /= 6; CC[1] /= 6
    const R_FLOOR = 60, EXTRA = 16

    const polyPt = (verts: [number, number][], t: number): [number, number] => {
      t = ((t % 1) + 1) % 1
      const seg = t * 6, e = Math.floor(seg) % 6, u = seg - Math.floor(seg)
      const A = verts[e], B = verts[(e + 1) % 6]
      return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]
    }
    const hexR = (ang: number): number => {
      const a = ang + Math.PI / 2
      const m = ((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3)
      return Math.cos(Math.PI / 6) / Math.cos(m - Math.PI / 6)
    }

    interface Ring { v: [number, number][]; col: string; op: number; per: number; sw: number; tmin: number; tmax: number }
    const rings: Ring[] = [
      { v: R1, col: '#8080c0', op: 0.82, per: 46, sw: 0.9, tmin: 2, tmax: 20 },
      { v: R2, col: '#00C48C', op: 0.46, per: 38, sw: 0.7, tmin: -6, tmax: 18 },
      { v: R3, col: '#6F9BC6', op: 0.34, per: 32, sw: 0.55, tmin: -6, tmax: 18 },
    ]

    interface ThreadDef {
      el: SVGElement; ri: number; t0: number; span2: number; thick: number
      tAng: number; lane: number; depth: number; ph: number; angN: number
    }
    const strings: ThreadDef[] = []
    rings.forEach((r, ri) => {
      for (let i = 0; i < r.per; i++) {
        const p = document.createElementNS(NS, 'path')
        const t0 = (i + Math.random() * 0.4) / r.per
        const tgt = polyPt(r.v, t0)
        const tAng = Math.atan2(tgt[1] - MC[1], tgt[0] - MC[0])
        strings.push({
          el: p, ri, t0, span2: 0.12 + Math.random() * 0.14,
          thick: r.tmin + Math.random() * (r.tmax - r.tmin), tAng,
          lane: (ri + i / r.per) / 3, depth: Math.min(0.9, r.op * (0.8 + Math.random() * 0.4)),
          ph: Math.random() * 6.28, angN: (((tAng / (2 * Math.PI)) % 1) + 1) % 1,
        })
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', r.col)
        p.setAttribute('stroke-width', String(r.sw)); p.setAttribute('stroke-linecap', 'round')
        fl.appendChild(p)
      }
    })
    const TOTAL = strings.length

    const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
    const clampCore = (x: number, y: number): [number, number] => {
      const dx = x - CC[0], dy = y - CC[1], d = Math.hypot(dx, dy)
      if (d < R_FLOOR) { const k = R_FLOOR / (d || 1); return [CC[0] + dx * k, CC[1] + dy * k] }
      return [x, y]
    }
    const smooth = (pts: [number, number][]): string => {
      let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1)
      for (let k = 1; k < pts.length - 1; k++) {
        const mx = (pts[k][0] + pts[k + 1][0]) / 2, my = (pts[k][1] + pts[k + 1][1]) / 2
        d += ' Q' + pts[k][0].toFixed(1) + ' ' + pts[k][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1)
      }
      d += ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + pts[pts.length - 1][1].toFixed(1)
      return d
    }
    const styleFor = (n: number): number => {
      const x = Math.sin(n * 12.9898) * 43758.545
      return Math.floor((x - Math.floor(x)) * 4)
    }

    // Per-frame build. doneConv != null drives the final lock; otherwise the
    // breathing convergence is derived from time (caps at 0.9 — soft/woven).
    const build = (time: number, doneConv: number | null): void => {
      const reduce = reducedRef.current
      const cycle = 12.5
      const cyc = Math.floor(time / cycle), style = styleFor(cyc)
      const raw = Math.abs(((time % cycle) / cycle) * 2 - 1)
      const conv = doneConv != null ? doneConv : ease(raw) * 0.9
      cd.setAttribute('r', (1.8 + Math.sin(time * 1.4) * 0.6).toFixed(2))
      c1.setAttribute('opacity', (0.9 + Math.sin(time * 1.4) * 0.08).toFixed(2))
      const gRot = reduce ? 0 : time * 0.08
      for (let i = 0; i < TOTAL; i++) {
        const s = strings[i], ring = rings[s.ri]
        let d = 0, spiral = 0
        if (style === 1) { d = (2 - s.ri) * 0.16 }
        else if (style === 2) { d = s.angN * 0.5 }
        else if (style === 3) { d = s.lane * 0.22; spiral = (1 - conv) * (s.ri + 1) * 0.22 }
        const lc = d >= 1 ? 0 : Math.min(1, Math.max(0, (conv - d) / (1 - d)))
        const span = (150 + (reduce ? 0 : Math.sin(time * 0.3 + s.ph) * 22)) * Math.PI / 180
        const baseR = 176 + s.lane * 46 + (reduce ? 0 : Math.sin(time * 0.4 + s.ph) * 14)
        const ang0 = s.tAng - span / 2 + gRot + spiral
        const pts: [number, number][] = []
        const steps = 18
        for (let k = 0; k <= steps; k++) {
          const u = k / steps
          const a = ang0 + u * span
          const lr = baseR * (0.5 + 0.5 * hexR(a))
          const lx = MC[0] + lr * Math.cos(a), ly = MC[1] + lr * Math.sin(a)
          const bp = polyPt(ring.v, s.t0 + u * s.span2)
          const dx = bp[0] - CC[0], dy = bp[1] - CC[1], dl = Math.hypot(dx, dy) || 1
          const gx = bp[0] + dx / dl * (s.thick + EXTRA), gy = bp[1] + dy / dl * (s.thick + EXTRA)
          const x = lerp(lx, gx, lc), y = lerp(ly, gy, lc)
          pts.push(clampCore(x, y))
        }
        s.el.setAttribute('d', smooth(pts))
        s.el.setAttribute('opacity', lerp(s.depth * 0.5, s.depth, lc).toFixed(2))
      }
    }

    buildRef.current = build
    startRef.current = performance.now()
    // Initial paint so the threads aren't an empty flash before the driver runs.
    build(reducedRef.current ? 3.0 : 0, null)

    return () => {
      buildRef.current = null
      while (fl.firstChild) fl.removeChild(fl.firstChild)
      while (cr.firstChild) cr.removeChild(cr.firstChild)
    }
  }, [])

  // Drive the animation from status + reduced. RAF is always cancelled on cleanup.
  useEffect(() => {
    const build = buildRef.current
    if (!build) return
    let rafId: number | null = null

    // Reduced motion: a single static frame, no RAF. 'done' shows the locked mark.
    if (reduced) {
      build(3.0, status === 'done' ? 1.0 : null)
      return
    }

    if (status === 'done') {
      // One final lock into the woven mark: ramp convergence from where the
      // breathing loop left off up to 1.0 over ~0.8s, then freeze (crisp).
      const from = lastConvRef.current
      const LOCK_MS = 800
      let doneStart: number | null = null
      const tick = (now: number) => {
        if (doneStart == null) doneStart = now
        const k = Math.min(1, (now - doneStart) / LOCK_MS)
        const dc = from + (1 - from) * ease(k)
        build((now - startRef.current) / 1000, dc)
        if (k >= 1) { rafId = null; return } // settled — leave it locked
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    } else {
      // Weaving: continuous breathing loop, indefinitely, until status changes.
      const cycle = 12.5
      const tick = (now: number) => {
        const time = (now - startRef.current) / 1000
        const raw = Math.abs(((time % cycle) / cycle) * 2 - 1)
        lastConvRef.current = ease(raw) * 0.9 // captured for a smooth done-lock
        build(time, null)
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
    }

    return () => { if (rafId != null) cancelAnimationFrame(rafId) }
  }, [status, reduced])

  return (
    <svg
      viewBox="0 0 460 460"
      style={{ width: 'min(420px, 82vw)', height: 'auto', display: 'block', margin: '0 auto' }}
      aria-hidden
    >
      <g ref={fieldRef} />
      <g ref={coreRef} />
    </svg>
  )
}

// ── Indeterminate pulse dots — flat, no glow. Frozen under reduced motion. ───────
function PulseDots({ reduced }: { reduced: boolean }) {
  return (
    <div style={{ display: 'inline-flex', gap: 7, marginTop: 18 }} aria-hidden>
      <style>{`
        @keyframes wvDotPulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.9; } }
        @media (prefers-reduced-motion: reduce) {
          .wv-dot { animation: none !important; opacity: 0.5 !important; }
        }
      `}</style>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="wv-dot"
          style={{
            width: 5, height: 5, background: INK_SECONDARY,
            opacity: reduced ? 0.5 : undefined,
            animation: reduced ? 'none' : `wvDotPulse 1.4s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── Framed center stage (no bloom — flat) ────────────────────────────────────────
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        minHeight: 'calc(100vh - 4rem - 52px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '48px 32px',
      }}
    >
      {children}
    </div>
  )
}
