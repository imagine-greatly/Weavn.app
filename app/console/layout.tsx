import type { Metadata } from "next";

// Pricing figures in this metadata mirror lib/pricing.ts (API_PLANS) — keep in sync.
// "From $59/mo" = API_PLANS.dev.baseMonthlyUsd (the entry paid API tier).

export const metadata: Metadata = {
  title: "Weavn API — Website Intelligence for Developers",
  description: "POST any URL. Get structured JSON back — 311 checks, ranked findings, benchmarks, AI-rewritten copy. 25 free scans. Batch endpoint, async mode, webhooks. From $59/mo.",
  openGraph: {
    title: "Weavn API — One endpoint. Structured output. Per scan.",
    description: "POST any URL → structured JSON in ~90s. 311 checks, ranked findings, corpus benchmarks. 25 free scans, no subscription to start.",
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
    description: "POST any URL → structured JSON. 311 checks. 25 free scans. From $59/mo.",
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
