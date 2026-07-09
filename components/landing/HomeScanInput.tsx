'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Homepage live-scan entry. Hands the typed URL off to the REAL playground path
 * (/playground?url=…), which runs an actual 311-check scan against the live engine
 * with the real rate limit and honest error states. No mocked response ever lives
 * on the homepage — this only carries intent to the real scan surface.
 */
export default function HomeScanInput() {
  const [url, setUrl] = useState('')
  const router = useRouter()

  function go() {
    const target = url.trim()
    if (!target) return
    router.push(`/playground?url=${encodeURIComponent(target)}`)
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'flex' }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') go() }}
          placeholder="https://your-site.com"
          autoComplete="off"
          aria-label="URL to scan"
          style={{
            flex: 1, minWidth: 0,
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 14, color: '#E6E9EE',
            background: '#050810',
            border: '1px solid rgba(255,255,255,0.14)', borderRight: 'none',
            padding: '14px 16px', outline: 'none', borderRadius: 0,
          }}
        />
        <button
          type="button"
          onClick={go}
          disabled={!url.trim()}
          style={{
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#E6E9EE', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '14px 22px', borderRadius: 0,
            cursor: url.trim() ? 'pointer' : 'not-allowed', opacity: url.trim() ? 1 : 0.5,
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          Scan this URL →
        </button>
      </div>
      <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#6E7587', margin: '10px 0 0', lineHeight: 1.5 }}>
        Runs a real 311-check scan in the playground — live engine, 1 free scan / hour, no mock. Honest errors (rate-limited · bot-blocked · quota) surface as they happen.
      </p>
    </div>
  )
}
