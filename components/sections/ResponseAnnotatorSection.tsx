import { CodeBlock } from '@/components/ui/CodeBlock'

const MONO = { fontFamily: "'IBM Plex Mono', monospace" }
const SANS = { fontFamily: "'IBM Plex Sans', sans-serif" }
const DISP = { fontFamily: "'Space Grotesk', sans-serif" }

const RESPONSE_JSON = `{
  "scan_id": "scan_01HXYZ7K2M9N3P4Q",
  "url": "https://acme-saas.com",
  "score": 61,
  "industry": "B2B SaaS",
  "benchmark": {
    "industry_avg": 54,
    "top_quartile": 78,
    "percentile": 63
  },
  "findings": [
    {
      "priority": 1,
      "severity": "critical",
      "category": "value_proposition",
      "title": "Hero headline is feature-led, not outcome-led",
      "estimated_lift": "12-18% conversion uplift",
      "fix": "Rewrite to outcome-led, present tense."
    },
    {
      "priority": 2,
      "severity": "high",
      "category": "social_proof",
      "title": "No above-fold proof — testimonials buried at 2,400px",
      "estimated_lift": "8-11% conversion uplift"
    }
  ],
  "rewritten_copy": {
    "headline": "Ship projects on time, every time.",
    "cta_primary": "Start free — no credit card"
  },
  "strengths": ["Clear pricing page", "Strong CTA contrast"],
  "cost_usd": 0.15,
  "duration_ms": 87340
}`

const ANNOTATIONS: { field: string; desc: string }[] = [
  {
    field: 'score',
    desc: '0–100. Calibrated to site type and buyer complexity. Benchmarked against 4,800+ scanned sites in your industry vertical.',
  },
  {
    field: 'findings[].estimated_lift',
    desc: 'Projected conversion uplift if this finding is addressed. Ranked by impact, not severity.',
  },
  {
    field: 'benchmark.percentile',
    desc: 'Where this site sits relative to all sites webdoc has scanned in the same industry.',
  },
  {
    field: 'rewritten_copy',
    desc: 'AI-rewritten headline, subheadline, and primary CTA. Drop-in replacements, not suggestions.',
  },
  {
    field: 'strengths[]',
    desc: 'What your site already does well. Top-performing checks returned alongside findings — agencies use this to open client conversations, not just present problems.',
  },
]

export default function ResponseAnnotatorSection() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 0', background: '#07090F', borderTop: '0.5px solid rgba(128,128,192,0.2)', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>

      {/* Purple bloom — top-left for JSON panel, bottom-right for finding card */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: 'radial-gradient(ellipse 900px 600px at 15% 30%, rgba(128,128,192,0.10) 0%, transparent 60%), radial-gradient(ellipse 600px 800px at 85% 70%, rgba(128,128,192,0.07) 0%, transparent 60%)',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Eyebrow */}
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#6F9BC6', margin: '0 0 18px' }}>
          The response is the product
        </p>

        {/* Headline */}
        <h2 style={{ ...DISP, fontWeight: 700, fontSize: 36, lineHeight: 1.15, color: '#E6E9EE', margin: '0 0 14px', letterSpacing: '-0.5px' }}>
          One response. Every surface covered.
        </h2>

        {/* Sub */}
        <p style={{ ...SANS, fontSize: 15, color: '#9398A8', maxWidth: 540, lineHeight: 1.65, margin: '0 0 10px' }}>
          Every scan returns the same predictable schema. Build against it once. Every URL you POST returns findings ranked by estimated revenue impact, benchmarked against your industry, with AI-rewritten copy attached.
        </p>
        <p style={{ ...MONO, fontSize: 12, color: '#6E7587', margin: '0 0 28px' }}>
          Every finding includes evidence, fix, estimated lift, and drop-in replacement copy.
        </p>

        {/* Status line */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          ...MONO,
          fontSize: 12,
          border: '0.5px solid rgba(255,255,255,0.08)',
          padding: '8px 14px',
          background: 'rgba(255,255,255,0.02)',
          marginBottom: 36,
          flexWrap: 'wrap',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C48C', flexShrink: 0 }} />
          <span style={{ color: '#9398A8' }}>POST /api/v1/scan → 200 OK</span>
          <span style={{ color: '#6E7587' }}>·</span>
          <span>
            <span style={{ color: '#8080c0' }}>score: </span>
            <span style={{ color: '#EFB23E' }}>61</span>
            <span style={{ color: '#8080c0' }}>, findings: </span>
            <span style={{ color: '#EFB23E' }}>23</span>
            <span style={{ color: '#8080c0' }}>, cost_usd: </span>
            <span style={{ color: '#9398A8' }}>0.15</span>
          </span>
        </div>

        {/* Two-column layout — 60% left / 40% right, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 items-start">

          {/* LEFT — JSON block with purple emission */}
          <div
            className="min-w-0"
            style={{
              borderTop: '1px solid rgba(128,128,192,0.3)',
              borderLeft: '1px solid rgba(128,128,192,0.15)',
              borderRight: '1px solid rgba(128,128,192,0.08)',
              borderBottom: '1px solid rgba(128,128,192,0.05)',
              boxShadow: '0 0 0 1px rgba(128,128,192,0.2), 0 0 40px rgba(128,128,192,0.08)',
            }}
          >
            <CodeBlock language="json" code={RESPONSE_JSON} />
          </div>

          {/* RIGHT — annotated field descriptions */}
          <div className="min-w-0">
            {ANNOTATIONS.map(({ field, desc }) => (
              <div key={field} style={{ padding: '16px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p style={{ ...MONO, fontSize: 13, color: '#8080c0', margin: '0 0 6px' }}>
                  {field}
                </p>
                <p style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6, margin: 0 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>

        </div>

        {/* Internal section divider */}
        <div style={{ height: 1, background: 'rgba(128,128,192,0.15)', margin: '48px 0' }} />

        {/* Expanded finding card — one complete API finding, showing all output fields */}
        <div style={{ background: '#0A0E18', borderTop: '1px solid rgba(128,128,192,0.25)', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.03)', boxShadow: '0 0 0 1px rgba(128,128,192,0.2), 0 0 30px rgba(128,128,192,0.08), 0 0 60px rgba(128,128,192,0.04)' }}>

          {/* Header bar */}
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(232,99,95,0.13)', color: '#E8635F', padding: '3px 9px' }}>CRITICAL</span>
              <span style={{ ...MONO, fontSize: 12, color: '#8080c0', marginLeft: 12 }}>value_proposition</span>
              <span style={{ ...MONO, fontSize: 11, color: '#6E7587', marginLeft: 12 }}>priority: 1</span>
            </div>
            <span style={{ ...MONO, fontSize: 12, color: '#6F9BC6' }}>fix_effort: low</span>
          </div>

          {/* Finding title */}
          <div style={{ ...DISP, fontWeight: 600, fontSize: 18, color: '#E6E9EE', padding: '16px 20px 0' }}>
            Hero headline is feature-led, not outcome-led
          </div>

          {/* Evidence block */}
          <div style={{ padding: '10px 20px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6E7587', marginBottom: 6 }}>EVIDENCE FROM PAGE</div>
            <div style={{ ...MONO, fontSize: 12, color: '#9398A8', lineHeight: 1.6 }}>Current headline names a feature. Visitors need to know what changes for them, not what the product is called.</div>
          </div>

          {/* Fix block */}
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
            <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6E7587', marginBottom: 6 }}>RECOMMENDED FIX</div>
            <div style={{ ...SANS, fontSize: 14, color: '#9398A8', lineHeight: 1.6 }}>Rewrite to outcome-led, present tense. Lead with what the customer achieves, not what the product does.</div>
          </div>

          {/* Metrics row */}
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {[
              { label: 'estimated_lift', value: '+12–18% conversion', color: '#00C48C' },
              { label: 'percentile',     value: '63rd of B2B SaaS',   color: '#6F9BC6' },
              { label: 'industry_avg',   value: '54',                  color: '#6F9BC6' },
              { label: 'severity',       value: 'critical',            color: '#E8635F' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ ...MONO, fontSize: 10, color: '#6E7587', marginBottom: 4 }}>{m.label}</div>
                <div style={{ ...MONO, fontSize: 13, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Rewritten copy block */}
          <div style={{ padding: '14px 20px 20px' }}>
            <div style={{ ...MONO, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6E7587', marginBottom: 10 }}>REWRITTEN COPY · included in response</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ ...MONO, fontSize: 11, color: '#6E7587', flexShrink: 0 }}>headline:</span>
              <span style={{ ...SANS, fontSize: 14, color: '#00C48C' }}>Ship projects on time, every time.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ ...MONO, fontSize: 11, color: '#6E7587', flexShrink: 0 }}>cta_primary:</span>
              <span style={{ ...SANS, fontSize: 14, color: '#00C48C' }}>Start free — no credit card</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
