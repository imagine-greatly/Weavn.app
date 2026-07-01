import type { Metadata } from "next";

// Pricing figures in this metadata mirror lib/pricing.ts (API_PLANS) — keep in sync.
// Public entry anchor = "25 free, then $0.30/scan" (per-scan overage). The $59/mo Dev tier (API_PLANS.dev.baseMonthlyUsd) still exists but is no longer the advertised entry framing.

export const metadata: Metadata = {
  title: "Weavn API — Website Intelligence for Developers",
  description: "POST any URL. Get structured JSON back — 311 checks, ranked findings, benchmarks, AI-rewritten copy. 25 free scans, then $0.30/scan. Batch endpoint, async mode, webhooks.",
  openGraph: {
    title: "Weavn API — One endpoint. Structured output. Per scan.",
    description: "POST any URL → structured JSON in 60–120s. 311 checks, ranked findings, corpus benchmarks. 25 free scans, no subscription to start.",
    url: "https://weavn.app/console",
    siteName: "Weavn",
    type: "website",
    images: [
      {
        url: "https://weavn.app/og/developer.png",
        width: 1200,
        height: 630,
        alt: "Weavn API — curl command and JSON response showing scan output",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weavn API — Website Intelligence for Developers",
    description: "POST any URL → structured JSON. 311 checks. 25 free scans, then $0.30/scan.",
    images: ["https://weavn.app/og/developer.png"],
    creator: "@weavnapp",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://weavn.app/console",
  },
};

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
