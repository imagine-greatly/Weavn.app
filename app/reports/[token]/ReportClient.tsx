'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ReportLayout from '@/components/ReportLayout'
import type { ReportPayload } from '@/lib/reportSchema'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

const MONO = '"IBM Plex Mono", monospace'
const SANS = '"IBM Plex Sans", sans-serif'
const DISP = '"Space Grotesk", sans-serif'

interface ReportClientProps {
  domain: string
  payload: ReportPayload
}

export default function ReportClient({ domain, payload }: ReportClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session)
    })
  }, [])

  return (
    <>
      <ReportLayout
        domain={domain}
        payload={payload}
        whiteLabel={true}
        fillContainer={false}
      />

      {/* Sticky CTA — only for unauthenticated users */}
      {isAuthenticated === false && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'rgba(5,8,16,0.96)',
            borderTop: '0.5px solid rgba(111,155,198,0.2)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '16px 48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
          className="report-sticky-cta"
        >
          <style>{`
            @media (max-width: 767px) {
              .report-sticky-cta { flex-direction: column !important; padding: 16px 20px !important; }
              .report-sticky-cta-left { text-align: center; }
              .report-sticky-cta-right { justify-content: center !important; width: 100%; }
            }
          `}</style>
          <div className="report-sticky-cta-left">
            <p style={{ fontFamily: DISP, fontSize: 16, fontWeight: 600, color: '#E6E9EE', margin: 0 }}>
              Save this report. Track your score over time.
            </p>
            <p style={{ fontFamily: SANS, fontSize: 13, color: '#9398A8', margin: '2px 0 0' }}>
              Free account. See how your score changes month over month.
            </p>
          </div>
          <div
            className="report-sticky-cta-right"
            style={{ display: 'flex', gap: 12, flexShrink: 0 }}
          >
            <Link
              href="/auth?surface=dashboard"
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: '#6F9BC6',
                border: '1px solid rgba(111,155,198,0.5)',
                padding: '10px 20px',
                background: 'rgba(111,155,198,0.06)',
                textDecoration: 'none',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              SAVE REPORT →
            </Link>
            <Link
              href="/auth?surface=api"
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: '#9D8CFF',
                border: '1px solid rgba(157,140,255,0.4)',
                padding: '10px 20px',
                background: 'transparent',
                textDecoration: 'none',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              Get API access →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
