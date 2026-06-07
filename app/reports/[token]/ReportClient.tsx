'use client'

import ReportLayout from '@/components/ReportLayout'
import type { ReportPayload } from '@/lib/reportSchema'

interface ReportClientProps {
  domain: string
  payload: ReportPayload
}

export default function ReportClient({ domain, payload }: ReportClientProps) {
  return (
    <ReportLayout
      domain={domain}
      payload={payload}
      whiteLabel={true}
      fillContainer={false}
    />
  )
}
