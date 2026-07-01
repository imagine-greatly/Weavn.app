'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type BrandingConfig,
  type ThemeMode,
  DEFAULT_BRANDING,
  TEMPLATES,
  resolveTheme,
} from '@/lib/branding'
import VerdictRing from '@/components/ui/VerdictRing'
import { scoreBand } from '@/lib/verdict'

// ── Steel-blue Dashboard surface tokens (the config UI lives on /app) ───────────
const C = {
  steel:        '#6F9BC6',
  inkPrimary:   '#E6E9EE',
  inkSecondary: '#9398A8',
  inkMuted:     '#6E7587',
  amber:        '#EFB23E',
  worse:        '#E8635F',
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

const MAX_BYTES = 2 * 1024 * 1024

/**
 * Agency white-label config. The report itself is the locked instrument — here an
 * agency themes the WRAPPER: logo, chrome accent, light/dark theme, cover, footer,
 * and which optional sections appear. Persisted via /api/branding (Agency-gated).
 */
export default function BrandingConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<string>('free')
  const [b, setB] = useState<BrandingConfig>(DEFAULT_BRANDING)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [logoName, setLogoName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/branding')
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        const p = typeof data.plan === 'string' ? data.plan : 'free'
        setPlan(p)
        // Route gating: Branding (white-label) is an Agency/Enterprise capability.
        if (p !== 'agency' && p !== 'enterprise') { router.replace('/app'); return }
        if (data.branding) setB({ ...DEFAULT_BRANDING, ...data.branding })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  const isAgency = plan === 'agency' || plan === 'enterprise'
  function set<K extends keyof BrandingConfig>(key: K, value: BrandingConfig[K]) {
    setB(prev => ({ ...prev, [key]: value }))
    setSaveMsg(null)
  }

  async function uploadLogo(file: File) {
    setUploadErr(null)
    if (!['image/png', 'image/svg+xml'].includes(file.type)) { setUploadErr('Logo must be a PNG or SVG.'); return }
    if (file.size > MAX_BYTES) { setUploadErr('Logo must be 2MB or smaller.'); return }
    setUploadBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/branding/logo', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed.')
      set('logoUrl', data.url as string)
      setLogoName(typeof data.filename === 'string' ? data.filename : file.name)
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploadBusy(false)
    }
  }

  async function save() {
    setSaving(true); setSaveMsg(null)
    try {
      const res = await fetch('/api/branding', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Save failed.')
      if (data.branding) setB({ ...DEFAULT_BRANDING, ...data.branding })
      setSaveMsg('Branding saved.')
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const Header = (
    <>
      <p style={{ fontFamily: MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: C.inkMuted, margin: '0 0 8px' }}>
        Branding
      </p>
      <h1 style={{ fontFamily: DISP, fontWeight: 700, fontSize: 28, color: C.inkPrimary, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
        White-label reports
      </h1>
      <p style={{ fontFamily: BODY, fontSize: 15, color: C.inkSecondary, margin: '0 0 24px', maxWidth: 600, lineHeight: 1.6 }}>
        Theme the report wrapper — logo, accent, theme, cover, footer — and choose which optional sections appear. The diagnostic body stays locked: agencies brand the wrapper, never the instrument.
      </p>
    </>
  )

  // Loading, or a non-agency user mid-redirect — never render a broken/locked page.
  if (loading || !isAgency) {
    return (
      <div style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: MONO, fontSize: 12, color: C.inkMuted }}>Loading…</p>
      </div>
    )
  }

  // ── Agency: full config ─────────────────────────────────────────────────────
  return (
    <div className="dashboard-root-shell" style={{ padding: '32px 32px 56px', maxWidth: 1100, margin: '0 auto' }}>
      {Header}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 440px)', gap: 28, alignItems: 'start' }}>
        {/* Controls */}
        <div style={{ border: `0.5px solid ${C.border}`, background: C.surface, padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Logo upload */}
          <div>
            <label style={labelStyle}>Agency logo · PNG or SVG, ≤2MB</label>
            {b.logoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `0.5px solid ${C.border}`, padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.logoUrl} alt="" style={{ height: 28, width: 'auto', maxWidth: 120, objectFit: 'contain' }} />
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.inkSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logoName ?? 'Uploaded logo'}</span>
                <button type="button" onClick={() => fileRef.current?.click()} style={ghostBtn}>Replace</button>
                <button type="button" onClick={() => { set('logoUrl', ''); setLogoName(null) }} style={{ ...ghostBtn, color: C.worse, borderColor: `${C.worse}55` }}>Remove</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadBusy} style={{ ...inputStyle, textAlign: 'left', cursor: uploadBusy ? 'default' : 'pointer', color: uploadBusy ? C.inkMuted : C.steel, border: '1px dashed rgba(111,155,198,0.4)' }}>
                {uploadBusy ? 'Uploading…' : 'Upload logo →'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".png,.svg,image/png,image/svg+xml"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.target.value = '' }}
            />
            {uploadErr ? <p style={{ fontFamily: MONO, fontSize: 11, color: C.worse, margin: '8px 0 0' }}>{uploadErr}</p> : null}
          </div>

          {/* Agency name */}
          <div>
            <label style={labelStyle} htmlFor="agency-name">Agency name</label>
            <input id="agency-name" type="text" value={b.agencyName} onChange={e => set('agencyName', e.target.value)} placeholder="Acme Growth Co." style={inputStyle} />
          </div>

          {/* Accent — chrome only */}
          <div>
            <label style={labelStyle}>Accent · chrome only (verdict colors stay fixed)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={b.accentColor} onChange={e => set('accentColor', e.target.value)} style={{ width: 44, height: 40, padding: 0, border: '1px solid rgba(111,155,198,0.3)', background: 'transparent', borderRadius: 0, cursor: 'pointer' }} />
              <input type="text" value={b.accentColor} onChange={e => set('accentColor', e.target.value)} spellCheck={false} style={{ ...inputStyle, width: 140, textTransform: 'uppercase' }} />
            </div>
          </div>

          {/* Theme */}
          <div>
            <label style={labelStyle}>Theme</label>
            <div style={{ display: 'inline-flex', border: '0.5px solid rgba(255,255,255,0.12)' }}>
              {(['light', 'dark'] as ThemeMode[]).map((mode, i) => {
                const active = b.theme === mode
                return (
                  <button key={mode} type="button" onClick={() => set('theme', mode)} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 18px', cursor: 'pointer', border: 'none', borderLeft: i > 0 ? '0.5px solid rgba(255,255,255,0.12)' : 'none', background: active ? 'color-mix(in srgb, var(--surface-accent) 13%, transparent)' : 'transparent', color: active ? C.inkPrimary : C.inkMuted }}>
                    {mode}
                  </button>
                )
              })}
            </div>
            <p style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted, margin: '8px 0 0' }}>Light is default — prints clean; verdict colors get light-safe variants.</p>
          </div>

          {/* Cover note */}
          <div>
            <label style={labelStyle} htmlFor="cover-note">Cover note · your framing to the client</label>
            <textarea id="cover-note" value={b.coverNote} onChange={e => set('coverNote', e.target.value)} rows={3} placeholder="A conversion audit of your homepage, prepared by our team." style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} maxLength={400} />
          </div>

          {/* Footer */}
          <div>
            <label style={labelStyle} htmlFor="footer-text">Footer text</label>
            <input id="footer-text" type="text" value={b.footerText} onChange={e => set('footerText', e.target.value)} placeholder="Acme Growth Co. · acme.com" style={inputStyle} maxLength={160} />
          </div>

          {/* Section inclusion */}
          <div>
            <label style={labelStyle}>Sections</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'score', name: 'Score & verdict', core: true },
                { id: 'health', name: 'Conversion health', core: true },
                { id: 'brief', name: 'Diagnostic brief', core: true },
                { id: 'findings', name: 'Ranked findings', core: true },
                { id: 'rewrites', name: 'Rewrites', core: false },
                { id: 'blueprint', name: 'Growth blueprint', core: false },
              ].map(s => {
                const on = s.core || b.includedSections[s.id as 'rewrites' | 'blueprint']
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `0.5px solid ${C.border}`, padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontFamily: BODY, fontSize: 13.5, color: C.inkPrimary }}>{s.name}</span>
                    {s.core ? (
                      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkMuted, border: `0.5px solid ${C.border}`, padding: '3px 8px' }}>Core · locked</span>
                    ) : (
                      <button type="button" onClick={() => set('includedSections', { ...b.includedSections, [s.id]: !on })} style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px', cursor: 'pointer', border: `0.5px solid ${on ? 'var(--surface-accent)' : C.border}`, background: on ? 'color-mix(in srgb, var(--surface-accent) 13%, transparent)' : 'transparent', color: on ? C.steel : C.inkMuted }}>
                        {on ? 'Included' : 'Hidden'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Template — extensible; only 'standard' today */}
          <div>
            <label style={labelStyle}>Template</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.values(TEMPLATES).map(tpl => (
                <span key={tpl.id} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', padding: '8px 14px', border: `0.5px solid ${b.templateId === tpl.id ? 'var(--surface-accent)' : C.border}`, background: b.templateId === tpl.id ? 'color-mix(in srgb, var(--surface-accent) 10%, transparent)' : 'transparent', color: b.templateId === tpl.id ? C.steel : C.inkMuted }}>
                  {tpl.name}
                </span>
              ))}
            </div>
            <p style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted, margin: '8px 0 0' }}>More curated templates (minimal · dense · narrative) ship later — each locked.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 4 }}>
            <button type="button" onClick={() => void save()} disabled={saving} style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.steel, background: 'rgba(111,155,198,0.1)', border: '1px solid rgba(111,155,198,0.5)', padding: '11px 22px', borderRadius: 0, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save branding'}
            </button>
            {saveMsg ? <span style={{ fontFamily: MONO, fontSize: 12, color: saveMsg.includes('saved') ? C.steel : C.worse }}>{saveMsg}</span> : null}
          </div>
        </div>

        {/* Live preview */}
        <div>
          <p style={{ fontFamily: MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: C.inkMuted, margin: '0 0 10px' }}>Live preview</p>
          <BrandPreview branding={b} />
          <p style={{ fontFamily: MONO, fontSize: 10, color: C.inkMuted, margin: '12px 0 0', lineHeight: 1.6 }}>
            Accent themes chrome only — the ring, dimension bands, and severity stay verdict-colored (red/amber/green) regardless of brand.
          </p>
        </div>
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: '#6F9BC6', background: 'transparent', border: '0.5px solid rgba(111,155,198,0.4)',
  padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
}

// ── Live preview — themed wrapper + a FIXED-verdict instrument sample ────────────
function BrandPreview({ branding }: { branding: BrandingConfig }) {
  const t = resolveTheme(branding)
  // Two fixed sample dimensions proving verdict colors never track the accent.
  const sample = [
    { label: 'Trust Signals', score: 42 },   // red
    { label: 'Offer Clarity', score: 78 },    // green
  ]
  const verdictFor = (s: number) => { const b = scoreBand(s); return b === 'green' ? t.verdict.green : b === 'amber' ? t.verdict.amber : t.verdict.red }
  return (
    <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, overflow: 'hidden' }}>
      {/* cover */}
      <div style={{ position: 'relative', padding: '18px 18px 16px', background: t.surface, borderBottom: `0.5px solid ${t.border}` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: t.accent }} />
        {branding.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt="" style={{ height: 26, width: 'auto', maxWidth: 140, objectFit: 'contain', display: 'block', marginBottom: 10 }} />
        ) : (
          <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 16, color: t.accent, marginBottom: 8 }}>{branding.agencyName || 'Your agency'}</div>
        )}
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.accent }}>Conversion audit · prepared for example.com</div>
        {branding.coverNote ? <div style={{ fontFamily: BODY, fontSize: 12, color: t.inkPrimary, margin: '8px 0 0', lineHeight: 1.55 }}>{branding.coverNote}</div> : null}
      </div>
      {/* score + dims (verdict-colored, fixed) */}
      <div style={{ padding: 18, textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.accent, marginBottom: 8 }}>Conversion Intelligence</div>
        <VerdictRing score={61} size={84} stroke={3.5} fontSize={26} color={t.verdict.amber} track={t.track} animate={false} style={{ margin: '0 auto' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: t.border, border: `0.5px solid ${t.border}`, marginTop: 16 }}>
          {sample.map(d => (
            <div key={d.label} style={{ background: t.surface, padding: '10px 10px', textAlign: 'left' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: t.inkSecondary, marginBottom: 7 }}>{d.label}</div>
              <div style={{ position: 'relative', width: '100%', height: 2, background: t.track }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${d.score}%`, background: verdictFor(d.score) }} />
              </div>
              <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 15, color: verdictFor(d.score), marginTop: 6 }}>{d.score}</div>
            </div>
          ))}
        </div>
      </div>
      {/* footer */}
      <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 9, color: t.inkSecondary }}>{[branding.footerText || branding.agencyName || 'Your agency', 'Confidential'].join(' · ')}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, textTransform: 'uppercase', color: t.inkMuted }}>311 checks</span>
      </div>
    </div>
  )
}
