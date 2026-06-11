import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan your site",
  description:
    "Paste your URL. Get a conversion score, a ranked list of what to fix, and AI-rewritten copy in 90 seconds. No technical knowledge required.",
};

export default function DashboardLandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
