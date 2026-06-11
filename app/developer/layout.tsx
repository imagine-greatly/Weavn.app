import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "webdoc API — Website Intelligence for Developers",
  description: "POST any URL. Get structured JSON back — 307 checks, ranked findings, benchmarks, AI-rewritten copy. 25 free scans. Batch endpoint, async mode, webhooks. From $29/mo.",
  openGraph: {
    title: "webdoc API — One endpoint. Structured output. Per scan.",
    description: "POST any URL → structured JSON in ~90s. 307 checks, ranked findings, corpus benchmarks. 25 free scans, no subscription to start.",
    url: "https://webdocai.com/developer",
    siteName: "webdoc",
    type: "website",
    images: [
      {
        url: "https://webdocai.com/og/developer.png",
        width: 1200,
        height: 630,
        alt: "webdoc API — curl command and JSON response showing scan output",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "webdoc API — Website Intelligence for Developers",
    description: "POST any URL → structured JSON. 307 checks. 25 free scans. From $29/mo.",
    images: ["https://webdocai.com/og/developer.png"],
    creator: "@webdocai",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://webdocai.com/developer",
  },
};

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
