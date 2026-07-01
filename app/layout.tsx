import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const orbitron = Orbitron({
  weight: ["700", "900"],
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Weavn — Website Intelligence API",
    template: "%s | Weavn",
  },
  description: "The conversion audit API. 311 checks, ranked findings, AI-rewritten copy, and corpus benchmarks. One endpoint. 60–120 seconds.",
  metadataBase: new URL("https://weavn.app"),
  openGraph: {
    siteName: "Weavn",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@weavnapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: "#050810" }}>
      <head>
        {/* Favicon / app icons are provided by the App Router file convention:
            app/icon.svg (modern), app/favicon.ico (legacy), app/apple-icon.png (iOS). */}
        <meta name="theme-color" content="#050810" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`min-h-screen text-[var(--text-primary)] antialiased relative font-sans ${orbitron.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${jetbrainsMono.variable}`}
      >
        <div
          aria-hidden={true}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-300px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '1400px',
              height: '1000px',
              background: 'radial-gradient(ellipse at 50% 30%, rgba(111,155,198,0.12) 0%, rgba(111,155,198,0.04) 45%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-200px',
              right: '-300px',
              width: '900px',
              height: '900px',
              background: 'radial-gradient(ellipse at center, rgba(0,196,140,0.05) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              left: '-200px',
              width: '700px',
              height: '700px',
              background: 'radial-gradient(ellipse at center, rgba(157,140,255,0.04) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div className="relative z-10 layout-page-clip">
          <Navbar />
          <div className="pt-16">{children}</div>
        </div>
      </body>
    </html>
  );
}
