import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Weavn",
  // Pricing mirrors lib/pricing.ts DASHBOARD_PLANS (single source of truth).
  description: "Dashboard plans for founders and agencies. Free to start, Starter from $39/mo, Pro $99/mo, Agency $249/mo with white-label reports.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
