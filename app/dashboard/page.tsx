import { permanentRedirect } from 'next/navigation'

// The old /dashboard MARKETING page is now /agencies (the business-case page).
// This is the marketing route only — the app workspace at /app is untouched.
export default function DashboardMarketingPage() {
  permanentRedirect('/agencies')
}
