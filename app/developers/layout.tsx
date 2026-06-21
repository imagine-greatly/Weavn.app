import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Pricing — Weavn',
  // Pricing mirrors lib/pricing.ts API_PLANS (single source of truth): enterprise floor ~$0.18/scan.
  description: 'API pricing for Weavn. POST a URL, get structured JSON. 308 checks across 27 categories. From $0.18/scan. 25 free scans to start.',
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children
}
