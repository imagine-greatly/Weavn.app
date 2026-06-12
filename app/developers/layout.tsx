import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Pricing — Weavn',
  description: 'API pricing for Weavn. POST a URL, get structured JSON. 307 checks across 27 categories. From $0.11/scan. 25 free scans to start.',
}

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  return children
}
