import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import ReportClient from './ReportClient'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type BrandingConfig, sanitizeBranding } from '@/lib/branding'
import { supabaseReportToPayload } from '@/lib/supabaseReportToPayload'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// The report wears the OWNER agency's white-label branding — but only while they
// are Agency tier (gated here, so a downgrade silently reverts to the in-app look).
async function loadOwnerBranding(supabase: SupabaseClient, ownerId: string | null | undefined): Promise<BrandingConfig | null> {
  if (!ownerId) return null
  const res = await supabase.from('profiles').select('plan, branding').eq('id', ownerId).maybeSingle()
  const row = res.data as { plan?: string; branding?: unknown } | null
  if (!row || row.plan !== 'agency' || !row.branding) return null
  return sanitizeBranding(row.branding)
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('reports')
    .select('domain')
    .eq('share_token', token)
    .maybeSingle()

  const domain = (data?.domain as string | undefined) ?? 'Site'
  return {
    // Absolute title — never apply the "| Weavn" root template (white-label safe;
    // also keeps the brand out of the PDF/print document title).
    title: { absolute: `${domain} — Conversion Audit Report` },
    description: `Full conversion diagnostic for ${domain}. Score, ranked findings, and implementation guidance.`,
    robots: { index: false, follow: false },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = getServiceClient()

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('share_token', token)
    .neq('status', 'pending')
    .neq('status', 'failed')
    .limit(1)
    .maybeSingle()

  if (!report) notFound()

  const analysis = (report.analysis ?? {}) as Record<string, unknown>
  const healthScore = (report.health_score as number) ?? 0
  const domain = (report.domain as string) ?? ''
  const scanDate = (report.created_at as string | undefined) ?? null

  const payload = supabaseReportToPayload(healthScore, analysis)
  const branding = await loadOwnerBranding(supabase, report.user_id as string | undefined)

  return (
    <main className="bg-background-base" style={{ minHeight: 'calc(100svh - 4rem)' }}>
      <ReportClient domain={domain} payload={payload} scanDate={scanDate} branding={branding} />
    </main>
  )
}
