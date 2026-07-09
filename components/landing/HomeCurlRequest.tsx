'use client'

// The one-line request — the real POST /api/v1/scan curl with a copy button.
// Isolated as a client component so app/page.tsx can stay a server component and
// keep exporting metadata. Colors mirror the /developers TabbedCode block.

import { useState } from 'react'

const MONO: React.CSSProperties = { fontFamily: '"IBM Plex Mono", monospace' }

// Plain text copied to the clipboard — kept byte-identical to the rendered curl.
const CURL_PLAIN = `curl -X POST https://weavn.app/api/v1/scan \\
  -H "Authorization: Bearer weavn_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://your-site.com"}'`

export default function HomeCurlRequest() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CURL_PLAIN)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div style={{ background: '#06090F', border: '1px solid rgba(157,140,255,0.14)' }}>
      {/* Header bar — green status square + label, copy button on the right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <span style={{ ...MONO, fontSize: 11, color: '#9398A8', display: 'inline-flex', alignItems: 'center', gap: 8, letterSpacing: '0.05em' }}>
          <span aria-hidden style={{ width: 7, height: 7, background: '#00C48C', display: 'inline-block', flexShrink: 0 }} />
          TERMINAL · CURL
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copy request to clipboard"
          style={{
            ...MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: copied ? '#00C48C' : '#9D8CFF',
            background: 'transparent',
            border: `1px solid ${copied ? 'rgba(0,196,140,0.5)' : 'rgba(157,140,255,0.4)'}`,
            padding: '5px 12px', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          {copied ? 'COPIED ✓' : 'COPY'}
        </button>
      </div>

      {/* The request — under 5 lines */}
      <pre style={{ ...MONO, fontSize: 13, lineHeight: 1.9, margin: 0, padding: '16px 18px', color: '#9398A8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        <span style={{ color: '#9D8CFF' }}>curl</span>{' -X POST '}<span style={{ color: '#E6E9EE' }}>https://weavn.app/api/v1/scan</span>{' \\\n'}
        {'  -H '}<span style={{ color: '#8080c0' }}>&quot;Authorization: Bearer </span><span style={{ color: '#9D8CFF' }}>weavn_live_••••</span><span style={{ color: '#8080c0' }}>&quot;</span>{' \\\n'}
        {'  -H '}<span style={{ color: '#8080c0' }}>&quot;Content-Type: application/json&quot;</span>{' \\\n'}
        {'  -d '}<span style={{ color: '#8080c0' }}>&apos;&#123;&quot;url&quot;: &quot;</span><span style={{ color: '#00C48C' }}>https://your-site.com</span><span style={{ color: '#8080c0' }}>&quot;&#125;&apos;</span>
      </pre>
    </div>
  )
}
