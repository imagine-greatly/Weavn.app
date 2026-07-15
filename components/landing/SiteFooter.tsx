import Link from 'next/link'

/**
 * Shared marketing footer. Mounted per-page on the public surfaces (homepage,
 * /engine, /agencies, /pricing, /developers) — the global layout carries only the
 * Navbar, so app/console/auth surfaces never inherit this.
 *
 * Columns follow the two-track brand: API (purple track) · Agencies (steel track) ·
 * Engine (shared credibility) · Company. Every link resolves to a real route.
 */

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }
const SANS: React.CSSProperties = { fontFamily: '"IBM Plex Sans", sans-serif' }
const DISP: React.CSSProperties = { fontFamily: '"Space Grotesk", sans-serif' }

type Col = { title: string; accent: string; links: { label: string; href: string; external?: boolean }[] }

const COLUMNS: Col[] = [
  {
    title: 'API',
    accent: '#9D8CFF',
    links: [
      { label: 'API overview', href: '/developers' },
      { label: 'API reference', href: '/docs/api' },
      { label: 'Playground', href: '/playground' },
      { label: 'Status', href: '/status' },
    ],
  },
  {
    title: 'Agencies',
    accent: '#6F9BC6',
    links: [
      { label: 'For agencies', href: '/agencies' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Sign in', href: '/auth?surface=dashboard' },
    ],
  },
  {
    title: 'Engine',
    accent: '#9D8CFF',
    links: [
      { label: 'The engine', href: '/engine' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Docs', href: '/docs' },
    ],
  },
  {
    title: 'Company',
    accent: '#6E7587',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', background: '#070B14' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '56px 32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 40 }}>
        {/* Brand */}
        <div style={{ gridColumn: 'span 1', minWidth: 180 }}>
          <Link href="/" style={{ ...DISP, fontWeight: 700, fontSize: 18, color: '#E6E9EE', textDecoration: 'none', letterSpacing: '-0.02em' }}>
            Weavn
          </Link>
          <p style={{ ...SANS, fontSize: 13, lineHeight: 1.6, color: '#6E7587', margin: '12px 0 0', maxWidth: 240 }}>
            One conversion-intelligence engine. 311 checks across 27 categories, 7 scored dimensions — shipped as an API and as white-label reports.
          </p>
        </div>

        {COLUMNS.map(col => (
          <div key={col.title}>
            <p style={{ ...MONO, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.16em', color: col.accent, margin: '0 0 16px' }}>
              {col.title}
            </p>
            {col.links.map(l => (
              <Link
                key={l.label}
                href={l.href}
                style={{ ...SANS, display: 'block', fontSize: 13.5, color: '#9398A8', textDecoration: 'none', marginBottom: 10, transition: 'color 0.14s' }}
              >
                {l.label} →
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '18px 32px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ ...MONO, fontSize: 11, color: '#5A6070' }}>© 2026 Weavn</span>
          <span style={{ ...MONO, fontSize: 11, color: '#5A6070' }}>
            Built in public by Devon Morrell ·{' '}
            <a href="https://x.com/devonmorrell" target="_blank" rel="noopener noreferrer" style={{ color: '#6F9BC6', textDecoration: 'none' }}>
              Follow the build →
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
