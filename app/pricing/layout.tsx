import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free diagnostic scan and Pro access for full finding sets and history.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
