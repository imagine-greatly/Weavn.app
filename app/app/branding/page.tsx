'use client'

import { useEffect, useState } from 'react'
import ScoreRing from '@/components/ui/ScoreRing'

// ── Steel-blue Dashboard surface tokens ────────────────────────────────────────
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  amber:        '#EFB23E',
  surface:      '#0A0E18',
  border:       'rgba(255,255,255,0.06)',
} as const

const MONO = "'IBM Plex Mono', monospace"
const BODY = "'IBM Plex Sans', sans-serif"
const DISP = "'Space Grotesk', sans-serif"

const labelStyle: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em',
  color: C.inkMuted, display: 'block', marginBottom: 8,
}
const inputStyle: React.CSSProperties = {
  width: '100%', fontFamily: MONO, fontSize: 14, color: C.inkPrimary,
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(111,155,198,0.3)',
  padding: '11px 14px', outline: 'none', borderRadius: 0,
}

/**
 * Agency branding config (white-label reports).
 *
 * SHELL: persistence is NOT wired. There's no branding store on `profiles` today,
 * so this holds form state only and never fakes a successful save.
 * TODO(wiring): (1) persist agency_name / logo_url / brand_color to a real store;
 * (2) enforce real plan entitlement — gating here is visual only; (3) actually
 * apply branding to /reports output (whiteLabel is currently on for everyone).
 */
export default function BrandingConfig() {
  const [plan, setPlan] = useState<string | null>(null)
  const [agencyName, setAgencyName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [brandColor, setBrandColor] = useState('#6F9BC6')
  const [logoError, setLogoError] = useState(false)
  const [saveNotice, setSaveNotice] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        const data = await res.json().catch(() => ({}))
        if (!cancelled) setPlan(typeof data.plan === 'string' ? data.plan : 'free')
      } catch {
        if (!cancelled) setPlan('free')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const isAgency = plan === 'agency'

  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 56px', maxWidth: 1040, margin: '0 auto' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.steel, margin: '0 0 8px' }}>
        Branding
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        White-label reports
      </h1>
      <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkSecondary, margin: '0 0 24px', maxWidth: 560, lineHeight: 1.6 }}>
        Put your agency&apos;s name, logo, and color on the reports you share with clients.
      </p>

      {/* Visual plan gate — NOT enforced (plan tiers aren't wired). */}
      {!isAgency && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            border: `0.5px solid ${C.amber}55`, background: 'rgba(239,178,62,0.06)',
            padding: '14px 18px', marginBottom: 28,
          }}
        >
          <div>
            <p style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: C.amber, margin: '0 0 4px' }}>
              🔒 Agency plan
            </p>
            <p style={{ fontFamily: BODY, fontSize: 13, color: C.inkSecondary, margin: 0 }}>
              White-label branding is an Agency-tier capability. Preview it below — applying it to live reports unlocks on the Agency plan.
            </p>
          </div>
          <a
            href="/pricing"
            style={{
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: C.amber, border: `1px solid ${C.amber}88`, padding: '9px 16px',
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            View plans →
          </a>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: 28, alignItems: 'start' }}>
        {/* Form */}
        <div style={{ border: `0.5px solid ${C.border}`, background: C.surface, padding: '24px' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle} htmlFor="agency-name">Agency name</label>
            <input
              id="agency-name"
              type="text"
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              placeholder="Acme Growth Co."
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle} htmlFor="logo-url">Logo URL</label>
            <input
              id="logo-url"
              type="url"
              value={logoUrl}
              onChange={e => { setLogoUrl(e.target.value); setLogoError(false) }}
              placeholder="https://acme.com/logo.svg"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle} htmlFor="brand-color">Brand color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="brand-color"
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                style={{ width: 44, height: 40, padding: 0, border: '1px solid rgba(111,155,198,0.3)', background: 'transparent', borderRadius: 0, cursor: 'pointer' }}
              />
              <input
                type="text"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                spellCheck={false}
                style={{ ...inputStyle, width: 140, textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSaveNotice(true)}
            style={{
              fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: C.steel, background: 'rgba(111,155,198,0.1)',
              border: '1px solid rgba(111,155,198,0.5)', padding: '11px 22px', borderRadius: 0, cursor: 'pointer',
            }}
          >
            Save branding
          </button>

          {saveNotice && (
            // Honest seam — we do NOT fake a successful save.
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.amber, margin: '14px 0 0', lineHeight: 1.6 }}>
              Saving isn&apos;t wired up yet — branding persistence lands in the wiring phase. Your inputs are kept in the preview for now.
            </p>
          )}
        </div>

        {/* Live preview — how the shared report header would carry the brand */}
        <div>
          <p style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.inkMuted, margin: '0 0 10px' }}>
            Report header preview
          </p>
          <div style={{ border: `0.5px solid ${C.border}`, background: '#06090F' }}>
            <div style={{ height: 3, background: brandColor }} aria-hidden />
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `0.5px solid ${C.border}` }}>
              {logoUrl && !logoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div style={{ width: 28, height: 28, background: brandColor, opacity: 0.85, flexShrink: 0 }} aria-hidden />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: DISP, fontWeight: 600, fontSize: 15, color: C.inkPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agencyName.trim() || 'Your agency'}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted, letterSpacing: '0.08em' }}>
                  CONVERSION REPORT
                </div>
              </div>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Production ScoreRing, tinted to the agency brand color — no hardcoded sample ring. */}
              <ScoreRing score={72} color={brandColor} size="md" animate={false} showBadge={false} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Conversion score
                </div>
                <p style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted, margin: '10px 0 0', letterSpacing: '0.06em', lineHeight: 1.6 }}>
                  Sample — branding applies to shared reports once wired.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
