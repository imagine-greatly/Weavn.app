import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pay per scan API access starting at $0.05. Agency dashboard from $99/month.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
