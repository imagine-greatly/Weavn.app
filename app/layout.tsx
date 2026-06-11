import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import BackgroundField from "@/components/BackgroundField";
import GrainOverlay from "@/components/GrainOverlay";
import Navbar from "@/components/Navbar";
import PersistentSiteAmbient from "@/components/PersistentSiteAmbient";

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
    default: "webdoc — Website Intelligence API",
    template: "%s | webdoc",
  },
  description: "The conversion audit API. 307 checks, ranked findings, AI-rewritten copy, and corpus benchmarks. One endpoint. ~90 seconds.",
  metadataBase: new URL("https://webdocai.com"),
  openGraph: {
    siteName: "webdoc",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@webdocai",
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/webdocai_logo_definitive.svg" />
        <meta name="theme-color" content="#050810" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`min-h-screen text-[var(--text-primary)] antialiased relative font-sans ${orbitron.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${jetbrainsMono.variable}`}
      >
        <AnimatedBackground />
        <BackgroundField />
        <PersistentSiteAmbient />
        <GrainOverlay />
        {/* Global fixed bloom orbs — ambient light sources fixed to viewport */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -10,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Orb 1: top center, steel blue, large and soft */}
          <div
            style={{
              position: 'absolute',
              top: '-300px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '1600px',
              height: '1200px',
              background: 'radial-gradient(ellipse at center, rgba(111, 155, 198, 0.09) 0%, rgba(111, 155, 198, 0.027) 40%, rgba(111, 155, 198, 0.02) 65%, transparent 85%)',
              pointerEvents: 'none',
            }}
          />
          {/* Orb 2: bottom right, pale green */}
          <div
            style={{
              position: 'absolute',
              bottom: '-200px',
              right: '-300px',
              width: '1200px',
              height: '1200px',
              background: 'radial-gradient(ellipse at center, rgba(0, 196, 140, 0.05) 0%, rgba(0, 196, 140, 0.015) 40%, rgba(0, 196, 140, 0.02) 65%, transparent 85%)',
              pointerEvents: 'none',
            }}
          />
          {/* Orb 3: bottom left, pale purple, very faint */}
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              left: '-200px',
              width: '1000px',
              height: '1000px',
              background: 'radial-gradient(ellipse at center, rgba(157, 140, 255, 0.04) 0%, rgba(157, 140, 255, 0.012) 40%, rgba(157, 140, 255, 0.02) 65%, transparent 85%)',
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
