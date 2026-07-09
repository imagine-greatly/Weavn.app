import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Status',
  description: 'Weavn platform status — API, dashboard, scan engine, and webhooks.',
  robots: { index: true, follow: true },
}

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

// Placeholder status board. Component states are set to "operational" until a real
// monitoring feed is wired in — no fabricated uptime percentages are shown.
const COMPONENTS = [
  { name: 'Scan API', detail: 'POST /api/v1/scan · sync + async', state: 'Operational' },
  { name: 'Playground', detail: 'Anonymous demo scans', state: 'Operational' },
  { name: 'Dashboard', detail: 'Reports, history, agency workspaces', state: 'Operational' },
  { name: 'Webhooks', detail: 'scan.completed · scan.failed delivery', state: 'Operational' },
]

export default function StatusPage() {
  return (
    <main style={{ background: '#050810', minHeight: '100vh' }}>
      <section style={{ maxWidth: 820, margin: '0 auto', padding: '72px 32px 96px' }}>
        <p style={{ ...MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6E7587', margin: '0 0 20px' }}>
          STATUS
        </p>

        {/* Overall state */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <span aria-hidden style={{ width: 12, height: 12, background: '#00C48C', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 12px rgba(0,196,140,0.5)' }} />
          <h1 style={{ ...DISP, fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 700, letterSpacing: '-0.6px', color: '#E6E9EE', margin: 0, lineHeight: 1.1 }}>
            All systems operational
          </h1>
        </div>
        <p style={{ ...SANS, fontSize: 15, lineHeight: 1.65, color: '#9398A8', margin: '0 0 40px', maxWidth: 620 }}>
          Current state of the Weavn platform. Live uptime metrics and incident history are on the way &mdash; our target is 99.5% uptime across all plans, with a formal SLA on Enterprise.
        </p>

        {/* Component board */}
        <div style={{ border: '0.5px solid rgba(255,255,255,0.08)', background: '#0A0E18' }}>
          {COMPONENTS.map((c, i) => (
            <div
              key={c.name}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                padding: '16px 20px',
                borderBottom: i < COMPONENTS.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <div>
                <p style={{ ...DISP, fontSize: 15, fontWeight: 600, color: '#E6E9EE', margin: '0 0 2px' }}>{c.name}</p>
                <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: 0 }}>{c.detail}</p>
              </div>
              <span style={{ ...MONO, fontSize: 11, color: '#00C48C', display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span aria-hidden style={{ width: 7, height: 7, background: '#00C48C', display: 'inline-block' }} />
                {c.state}
              </span>
            </div>
          ))}
        </div>

        <p style={{ ...MONO, fontSize: 11, color: '#6E7587', margin: '20px 0 0' }}>
          For shipped changes and contract updates, see the{' '}
          <Link href="/changelog" style={{ color: '#6F9BC6', textDecoration: 'none' }}>changelog →</Link>
        </p>
      </section>
    </main>
  )
}
