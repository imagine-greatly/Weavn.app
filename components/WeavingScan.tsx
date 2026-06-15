'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Scan-in-progress experience for the ~90s synchronous scan. This is the ONE
 * surface where weaving language belongs (the user is waiting). Surface-accent
 * colored, so it reads steel on /app and purple on /console.
 *
 * Progress is grounded in the real pipeline phases (render → 307 checks across
 * 27 categories → ranking → benchmark → assemble). A single POST can't stream
 * progress, so the phases advance on a schedule that mirrors real timing while
 * the parent owns the fetch; the parent flips `status` to 'done' (route to the
 * report) or 'error' (BOT_BLOCKED etc.) when the request resolves.
 *
 * Copy obeys the brand rule: the product name never shares a sentence with
 * weave/weaving/woven. The finished report is "the weave"; the live texture is
 * "307 threads per weave".
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

interface PhaseDef { label: string; at: number }
// Cumulative start offsets (ms). The final phase clamps until the parent transitions.
const PHASES: PhaseDef[] = [
  { label: 'Rendering the page', at: 0 },
  { label: 'Running 307 checks across 27 categories', at: 7000 },
  { label: 'Ranking findings by impact', at: 64000 },
  { label: 'Benchmarking against the corpus', at: 73000 },
  { label: 'Assembling the weave', at: 82000 },
]

const CHECKS_START = 7000
const CHECKS_END = 62000

export interface WeavingScanProps {
  domain: string
  status: WeavingStatus
  error?: string | null
  /** Reset back to the input (offered in the error state). */
  onReset?: () => void
}

export default function WeavingScan({ domain, status, error, onReset }: WeavingScanProps) {
  const [phase, setPhase] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  // `reduced` state drives rendering (the static phase list); the ref lets the
  // scheduling effect read the value without re-running when it resolves on mount.
  const [reduced, setReduced] = useState(false)
  const reducedRef = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const r = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedRef.current = r
    setReduced(r)
  }, [])

  // Advance the phase on a schedule (step indicator) and tick elapsed for the
  // animated counters / progress bar (skipped under reduced motion).
  useEffect(() => {
    if (status !== 'weaving') return
    const t = timers.current
    PHASES.forEach((p, i) => {
      if (i === 0) return
      t.push(window.setTimeout(() => setPhase(i), p.at))
    })
    let interval = 0
    if (!reducedRef.current) {
      const start = performance.now()
      interval = window.setInterval(() => setElapsed(performance.now() - start), 200)
    }
    return () => {
      t.forEach(clearTimeout); t.length = 0
      if (interval) clearInterval(interval)
    }
  }, [status])

  // ── Error — a clear stop, not a hung spinner ────────────────────────────────
  if (status === 'error') {
    return (
      <Frame>
        <span aria-hidden style={{ width: 9, height: 9, background: WORSE, boxShadow: `0 0 8px ${WORSE}`, marginBottom: 18 }} />
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

  // ── Done — brief confirmation before the parent routes to the weave ─────────
  if (status === 'done') {
    return (
      <Frame>
        <Loom reduced phaseComplete />
        <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK_PRIMARY, margin: '18px 0 0', letterSpacing: '-0.4px' }}>
          Weave complete
        </h2>
        <p style={{ fontFamily: MONO, fontSize: 12, color: ACCENT, margin: '10px 0 0' }}>Opening your report…</p>
      </Frame>
    )
  }

  // ── Weaving ─────────────────────────────────────────────────────────────────
  const checks = Math.max(0, Math.min(307, Math.round(((elapsed - CHECKS_START) / (CHECKS_END - CHECKS_START)) * 307)))
  const cats = Math.max(0, Math.min(27, Math.round((checks / 307) * 27)))
  const progress = Math.min(95, Math.round((elapsed / 84000) * 100))

  return (
    <Frame>
      {!reduced && <Loom />}

      <h2 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 24, color: INK_PRIMARY, margin: reduced ? 0 : '22px 0 0', letterSpacing: '-0.4px' }}>
        Weaving through your site…
      </h2>
      <p style={{ fontFamily: MONO, fontSize: 12, color: ACCENT, margin: '10px 0 0', letterSpacing: '0.04em' }}>{domain}</p>

      {reduced ? (
        // Static phase list + step indicator — no thread animation, no count-up.
        <div style={{ marginTop: 24, textAlign: 'left', display: 'inline-block' }}>
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_MUTED, margin: '0 0 12px' }}>
            Step {phase + 1} of {PHASES.length}
          </p>
          {PHASES.map((p, i) => (
            <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span aria-hidden style={{ width: 6, height: 6, flexShrink: 0, background: i <= phase ? ACCENT : 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: i === phase ? INK_PRIMARY : i < phase ? INK_SECONDARY : INK_MUTED }}>
                {p.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p style={{ fontFamily: MONO, fontSize: 13, color: INK_SECONDARY, margin: '20px 0 0', minHeight: 18 }}>
            {PHASES[phase].label}
          </p>
          <p style={{ fontFamily: MONO, fontSize: 12, color: INK_MUTED, margin: '10px 0 0' }}>
            {checks} / 307 threads · {cats} / 27 categories
          </p>

          {/* Overall progress — restrained */}
          <div style={{ position: 'relative', width: 320, maxWidth: '80vw', height: 2, background: 'rgba(255,255,255,0.07)', margin: '18px auto 0' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: ACCENT, transition: 'width 0.3s ease' }} />
          </div>
        </>
      )}

      <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_MUTED, margin: '22px 0 0' }}>
        307 threads per weave
      </p>
    </Frame>
  )
}

// ── Framed center stage ─────────────────────────────────────────────────────────
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
      {/* Ambient accent bloom fading to black */}
      <div
        aria-hidden
        style={{
          position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%, -50%)',
          width: 560, height: 360,
          background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--surface-accent) 12%, transparent) 0%, transparent 72%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

// ── Thread loom — restrained warp of accent threads with a traveling weft ────────
const THREAD_COUNT = 15
function Loom({ reduced = false, phaseComplete = false }: { reduced?: boolean; phaseComplete?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 52 }} aria-hidden>
      <style>{`
        @keyframes weaveThreadPulse {
          0%, 100% { transform: scaleY(0.45); opacity: 0.35; }
          50% { transform: scaleY(1); opacity: 0.95; }
        }
        @media (prefers-reduced-motion: reduce) {
          .weave-thread { animation: none !important; transform: scaleY(0.7) !important; opacity: 0.6 !important; }
        }
      `}</style>
      {Array.from({ length: THREAD_COUNT }).map((_, i) => (
        <span
          key={i}
          className="weave-thread"
          style={{
            display: 'block', width: 2, height: 52,
            transformOrigin: 'bottom',
            background: 'linear-gradient(to top, color-mix(in srgb, var(--surface-accent) 75%, transparent), transparent)',
            boxShadow: '0 0 6px color-mix(in srgb, var(--surface-accent) 40%, transparent)',
            transform: phaseComplete ? 'scaleY(1)' : undefined,
            opacity: phaseComplete ? 0.95 : undefined,
            animation: reduced || phaseComplete ? 'none' : `weaveThreadPulse 1.6s ease-in-out ${i * 0.09}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
