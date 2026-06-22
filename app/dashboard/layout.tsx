import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weavn — Conversion Audit for Founders & Teams",
  description: "Paste any URL. Get a 0–100 conversion score, 311 ranked findings, AI-rewritten copy, and corpus benchmarks against real sites in your vertical — in about 90 seconds. No account required.",
  openGraph: {
    title: "Weavn — Find out exactly what's stopping visitors from converting.",
    description: "311 checks. Ranked fixes. AI-rewritten copy. Benchmarked against real sites in your vertical. Free to start.",
    url: "https://weavn.app/dashboard",
    siteName: "Weavn",
    type: "website",
    images: [
      {
        url: "https://weavn.app/og/dashboard.png",
        width: 1200,
        height: 630,
        alt: "Weavn conversion audit — score ring showing 61/100 critical with ranked findings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weavn — Conversion Audit for Founders",
    description: "311 checks. Ranked fixes. AI-rewritten copy. Free to start — no account required.",
    images: ["https://weavn.app/og/dashboard.png"],
    creator: "@weavnapp",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://weavn.app/dashboard",
  },
};

export default function DashboardLandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
