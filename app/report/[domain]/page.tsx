import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Legacy domain-keyed report route. The canonical report now lives at the public,
 * share_token-keyed /reports/[token]. Older scan-completion emails and issue back-links
 * may still point here, so resolve the domain to its report and redirect.
 *
 * Privacy: a domain is NOT unique and /reports/[token] is public. Only redirect when
 * exactly ONE complete report matches the normalized domain. If multiple match (ambiguous
 * — could belong to another user) or none match, fall back to /dashboard so we never
 * surface a report that might not be the visitor's.
 */
export default async function LegacyReportRedirect({
  params,
}: {
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  const normalized = decodeURIComponent(domain).toLowerCase().trim()

  const supabase = getServiceClient()
  const { data: rows } = await supabase
    .from('reports')
    .select('share_token')
    .eq('domain', normalized)
    .eq('status', 'complete')
    .limit(2)

  if (rows && rows.length === 1) {
    const token = (rows[0] as { share_token?: string | null }).share_token
    if (token) redirect(`/reports/${token}`)
  }

  redirect('/')
}
