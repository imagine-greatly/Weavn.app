import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — webdoc.ai",
  description: "Dashboard plans for founders and agencies. Free to start, Starter from $49/mo, Agency from $149/mo with 100 bundled API calls.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
