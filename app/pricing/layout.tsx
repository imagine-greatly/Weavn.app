import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Weavn",
  // Every price is read from lib/pricing.ts (API_PLANS + DASHBOARD_PLANS), the single
  // source of truth — never restated here, so the page can't drift from billing.
  description: "Two tracks, one engine. API plans for platforms and developers, and dashboard plans from Free to Agency with white-label reports for agencies.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
