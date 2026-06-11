import { redirect } from 'next/navigation'

// Pricing now lives on the audience pages: dashboard pricing on /dashboard,
// API pricing on /developers. Old links and bookmarks land on /dashboard.
export default function PricingPage() {
  redirect('/dashboard')
}
