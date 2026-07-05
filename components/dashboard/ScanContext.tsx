'use client'

/**
 * ScanProvider — shell-owned scan tracking.
 *
 * A scan is a ~90s job. Historically the Overview page (app/app/page.tsx) owned the
 * fetch + phase state, so navigating to another dashboard tab unmounted the page and
 * lost all tracking (the server scan still finished — see the pending → complete row
 * flow in app/api/scan/route.ts — but the UI forgot about it). This provider lifts that
 * state into the PERSISTENT /app layout (DashboardShell), so tracking survives tab
 * navigation and both scan entry points (Overview's inline trigger and the shell's
 * "New scan" modal) share one mechanism.
 *
 * How a scan is tracked without changing the scan pipeline:
 *   1. startScan() fires the blocking POST /api/scan (the guaranteed completion
 *      backstop — it returns { reportId, shareToken } at the very end).
 *   2. In parallel it discovers the just-inserted pending row's id via
 *      GET /api/reports/check?domain= (the POST won't surface that id until it
 *      finishes), then polls GET /api/scan/status/:id every few seconds.
 *   3. Whichever signal resolves first (poll sees 'complete'/'failed', or the POST
 *      resolves) settles the scan exactly once.
 *
 * On completion: if the user is still on Overview we open the report; if they've
 * navigated elsewhere we never yank them — a toast is the only interruption.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export type ScanPhase = 'idle' | 'weaving' | 'complete' | 'error'

interface ScanState {
  phase: ScanPhase
  domain: string
  reportId: string | null
  shareToken: string | null
  error: string | null
}

interface ScanContextValue extends ScanState {
  /** Kick off a scan for a raw URL/host. Safe to call from any dashboard surface. */
  startScan: (rawUrl: string) => void
  /** Return to idle (used by the WeavingScan error state's "try again"). */
  reset: () => void
  /** Increments each time a scan completes — Overview watches it to refresh its list. */
  completionTick: number
}

const ScanCtx = createContext<ScanContextValue | null>(null)

export function useScan(): ScanContextValue {
  const ctx = useContext(ScanCtx)
  if (!ctx) throw new Error('useScan must be used within a ScanProvider')
  return ctx
}

function domainOf(raw: string): string {
  const t = raw.trim()
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, '')
  } catch {
    return t
  }
}

// The Overview tab (exact /app) is the surface that shows the full weaving experience
// and is the only place a completed scan auto-opens the report.
const OVERVIEW_PATH = '/app'

const POLL_MS = 4000
const DISCOVERY_MS = 2000
const DISCOVERY_MAX_ATTEMPTS = 15 // ~30s window to catch the pending row before giving up
const DONE_HOLD_MS = 800 // let "Weave complete" register before opening the report
const TOAST_MS = 11000

type ToastState =
  | { kind: 'success'; domain: string; shareToken: string | null }
  | { kind: 'error'; domain: string; message: string }
  | null

const IDLE: ScanState = { phase: 'idle', domain: '', reportId: null, shareToken: null, error: null }

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() ?? OVERVIEW_PATH
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  const [state, setState] = useState<ScanState>(IDLE)
  const [completionTick, setCompletionTick] = useState(0)
  const [toast, setToast] = useState<ToastState>(null)

  // Per-scan identity: any async handler captures the id it started under and bails if a
  // newer scan (or a reset) has since superseded it — prevents stale settles / dup work.
  const scanIdRef = useRef(0)
  const settledRef = useRef(false)
  const domainRef = useRef('')
  const startedAtRef = useRef(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const discoveryRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearScanTimers = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (discoveryRef.current) { clearInterval(discoveryRef.current); discoveryRef.current = null }
    if (doneTimerRef.current) { clearTimeout(doneTimerRef.current); doneTimerRef.current = null }
  }, [])

  const reset = useCallback(() => {
    scanIdRef.current += 1 // invalidate any in-flight handlers from the previous scan
    settledRef.current = false
    clearScanTimers()
    setState(IDLE)
  }, [clearScanTimers])

  const showToast = useCallback((next: NonNullable<ToastState>) => {
    setToast(next)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS)
  }, [])

  // Tear everything down if the whole dashboard shell unmounts (user leaves /app).
  useEffect(() => {
    return () => {
      scanIdRef.current += 1
      clearScanTimers()
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [clearScanTimers])

  const finishSuccess = useCallback((myId: number, shareToken: string | null, reportId: string | null) => {
    if (myId !== scanIdRef.current || settledRef.current) return
    // Need a token to open the report; if the poll saw 'complete' before the token was
    // readable, let the POST backstop settle instead (it always carries the token).
    if (!shareToken) return
    settledRef.current = true
    clearScanTimers()
    setCompletionTick(t => t + 1)

    const onOverview = pathRef.current === OVERVIEW_PATH
    if (onOverview) {
      setState(s => ({ ...s, phase: 'complete', shareToken, reportId: reportId ?? s.reportId, error: null }))
      doneTimerRef.current = setTimeout(() => {
        if (myId !== scanIdRef.current) return
        router.push(`/reports/${shareToken}`)
        setState(IDLE) // clean slate when they return to Overview
      }, DONE_HOLD_MS)
    } else {
      // Elsewhere: never yank. Toast + return to idle so a later Overview visit doesn't
      // replay a stale "complete" weave — the finished scan shows up in the list instead.
      showToast({ kind: 'success', domain: domainRef.current, shareToken })
      setState(IDLE)
    }
  }, [router, clearScanTimers, showToast])

  const finishError = useCallback((myId: number, message: string) => {
    if (myId !== scanIdRef.current || settledRef.current) return
    settledRef.current = true
    clearScanTimers()

    const onOverview = pathRef.current === OVERVIEW_PATH
    if (onOverview) {
      // Show the WeavingScan error surface in place (it offers "try another URL").
      setState(s => ({ ...s, phase: 'error', error: message }))
    } else {
      showToast({ kind: 'error', domain: domainRef.current, message })
      setState(IDLE)
    }
  }, [clearScanTimers, showToast])

  const startStatusPoll = useCallback((myId: number, reportId: string) => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    const tick = async () => {
      if (myId !== scanIdRef.current || settledRef.current) return
      try {
        const res = await fetch(`/api/scan/status/${reportId}`, { cache: 'no-store' })
        if (myId !== scanIdRef.current || settledRef.current) return
        const data = await res.json().catch(() => ({}))
        if (data?.status === 'complete') finishSuccess(myId, data.share_token ?? null, reportId)
        else if (data?.status === 'failed') finishError(myId, 'Scan couldn’t finish. Please try again.')
        // 'pending' → keep polling
      } catch {
        /* transient — next tick retries */
      }
    }
    pollRef.current = setInterval(tick, POLL_MS)
    void tick()
  }, [finishSuccess, finishError])

  const startDiscovery = useCallback((myId: number, dom: string) => {
    let attempts = 0
    const stopDiscovery = () => {
      if (discoveryRef.current) { clearInterval(discoveryRef.current); discoveryRef.current = null }
    }
    const tryDiscover = async () => {
      if (myId !== scanIdRef.current || settledRef.current) { stopDiscovery(); return }
      attempts += 1
      try {
        const res = await fetch(`/api/reports/check?domain=${encodeURIComponent(dom)}`, { cache: 'no-store' })
        if (myId !== scanIdRef.current || settledRef.current) { stopDiscovery(); return }
        const data = await res.json().catch(() => ({}))
        if (data?.exists && data.reportId) {
          const createdMs = data.created_at ? Date.parse(data.created_at) : NaN
          const isOurs =
            data.status === 'pending' ||
            (Number.isFinite(createdMs) && createdMs >= startedAtRef.current - 5000)
          if (isOurs) {
            stopDiscovery()
            setState(s => (s.reportId ? s : { ...s, reportId: String(data.reportId) }))
            if (data.status === 'complete') { finishSuccess(myId, data.share_token ?? null, String(data.reportId)); return }
            if (data.status === 'failed' || data.status === 'error') { finishError(myId, 'Scan couldn’t finish. Please try again.'); return }
            startStatusPoll(myId, String(data.reportId))
            return
          }
        }
      } catch {
        /* transient — retry until the attempt cap */
      }
      if (attempts >= DISCOVERY_MAX_ATTEMPTS) stopDiscovery() // fall back to the POST backstop
    }
    void tryDiscover()
    discoveryRef.current = setInterval(tryDiscover, DISCOVERY_MS)
  }, [finishSuccess, finishError, startStatusPoll])

  const startScan = useCallback((rawUrl: string) => {
    const trimmed = rawUrl.trim()
    if (!trimmed) return
    const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const dom = domainOf(target)

    reset() // abandon any prior scan and its timers
    const myId = (scanIdRef.current += 1)
    settledRef.current = false
    domainRef.current = dom
    startedAtRef.current = Date.now()
    setState({ phase: 'weaving', domain: dom, reportId: null, shareToken: null, error: null })

    // Backstop: the blocking scan request. Kept alive (never aborted) so the serverless
    // invocation runs to completion; its result settles the scan if polling hasn't yet.
    fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: target }),
    })
      .then(async (res) => {
        if (myId !== scanIdRef.current || settledRef.current) return
        if (res.status === 401) {
          reset()
          router.push('/auth?surface=dashboard')
          return
        }
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.shareToken) {
          finishSuccess(myId, data.shareToken, data.reportId ?? null)
        } else {
          finishError(myId, data?.error ?? 'Scan couldn’t finish. Please try again.')
        }
      })
      .catch(() => {
        if (myId === scanIdRef.current && !settledRef.current) {
          finishError(myId, 'Scan couldn’t finish. Please try again.')
        }
      })

    // Live tracking that survives tab navigation: discover the pending row id, then poll.
    startDiscovery(myId, dom)
  }, [reset, router, finishSuccess, finishError, startDiscovery])

  return (
    <ScanCtx.Provider value={{ ...state, startScan, reset, completionTick }}>
      {children}
      <ScanToast toast={toast} onClose={() => setToast(null)} />
    </ScanCtx.Provider>
  )
}

// ── Toast — the app has no prior toast primitive, so this is a small self-contained one
// in the shell's visual language (mono, steel accent, zero radius, flat). It is the ONLY
// interruption when a background scan settles on a non-Overview tab. ─────────────────────
const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"

function ScanToast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null
  const ok = toast.kind === 'success'
  const accent = ok ? '#6F9BC6' : '#E8635F'
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 300,
        width: 'min(360px, calc(100vw - 40px))',
        background: '#080C14',
        border: `1px solid color-mix(in srgb, ${accent} 45%, rgba(255,255,255,0.08))`,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span aria-hidden style={{ width: 8, height: 8, marginTop: 4, background: accent, flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent, margin: '0 0 5px' }}>
            {ok ? 'Scan complete' : 'Scan failed'}
          </p>
          <p style={{ fontFamily: BODY, fontSize: 13, color: '#E6E9EE', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toast.domain}
          </p>
          {ok ? (
            toast.shareToken ? (
              <a
                href={`/reports/${toast.shareToken}`}
                style={{ display: 'inline-block', marginTop: 9, fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: accent, textDecoration: 'none' }}
              >
                View report →
              </a>
            ) : null
          ) : (
            <p style={{ fontFamily: BODY, fontSize: 12, color: '#9398A8', margin: '6px 0 0', lineHeight: 1.5 }}>
              {toast.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          style={{ flexShrink: 0, background: 'none', border: 'none', color: '#6E7587', fontFamily: MONO, fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: 2 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
