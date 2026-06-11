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
    default: "WebDoc — Website Intelligence API",
    template: "%s — WebDoc",
  },
  description:
    "Send a URL. Get a complete conversion audit in 90 seconds. Structured JSON. REST API for developers, agencies, and AI agents.",
  openGraph: {
    title: "WebDoc — Website Intelligence API",
    description:
      "Send a URL. Get a complete conversion audit in 90 seconds. Structured JSON. REST API for developers, agencies, and AI agents.",
    url: "https://webdocai.com",
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
        className={`min-h-screen bg-[#050810] text-[var(--text-primary)] antialiased relative font-sans ${orbitron.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${jetbrainsMono.variable}`}
        style={{ backgroundColor: "#050810" }}
      >
        <AnimatedBackground />
        <BackgroundField />
        <PersistentSiteAmbient />
        <GrainOverlay />
        {/* Global fixed bloom — two atmospheric orbs, pink/coral top-right + steel-blue bottom-left */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            background: [
              'radial-gradient(ellipse 600px 600px at 80% 15%, rgba(232,99,95,0.025) 0%, transparent 65%)',
              'radial-gradient(ellipse 500px 500px at 15% 85%, rgba(111,155,198,0.03) 0%, transparent 65%)',
            ].join(', '),
          }}
        />
        <div className="relative z-10 layout-page-clip">
          <Navbar />
          <div className="pt-16">{children}</div>
        </div>
      </body>
    </html>
  );
}
