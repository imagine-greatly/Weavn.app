import { permanentRedirect } from 'next/navigation'

// /product is now /engine — the shared credibility page. Salvaged content lives there.
export default function ProductPage() {
  permanentRedirect('/engine')
}
