import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Pricing — Weavn',
  // Pricing mirrors lib/pricing.ts API_PLANS (single source of truth): enterprise floor ~$0.50/scan.
  description: 'API pricing for Weavn. POST a URL, get structured JSON. 311 checks across 27 categories. 25 free scans, then $0.50/scan.',
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children
}
