"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block py-1.5 font-sans text-[14px] font-normal transition-colors duration-150"
      style={{ color: "#8899AA" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "#FFFFFF";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "#8899AA";
      }}
    >
      {children}
    </Link>
  );
}

export default function SiteFooter() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function handleFooterScan(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    try {
      new URL(normalized);
    } catch {
      return;
    }
    const path = `/scan?url=${encodeURIComponent(normalized)}`;
    console.log("[scan-nav] router.push", path);
    router.push(path);
  }

  return (
    <footer
      style={{
        background: "#050810",
        padding: "64px 48px 40px",
      }}
    >
      <div className="mx-auto grid max-w-[1100px] gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-2" aria-label="WebDoc home" style={{ textDecoration: "none" }}>
            <Logo size="sm" />
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                fontSize: 15,
                lineHeight: 1,
                letterSpacing: "0.02em",
                display: "flex",
              }}
            >
              <span style={{ color: "var(--text-primary)" }}>webdoc</span>
              <span style={{ color: "var(--cyan)" }}>ai</span>
            </span>
          </Link>
          <p className="mt-3 max-w-[260px] font-sans text-[14px] font-normal" style={{ color: "#8899AA" }}>
            Conversion intelligence platform. Surfaces suppression patterns and ranks resolutions by revenue impact.
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "2px" }}>
            PRODUCT
          </p>
          <nav className="mt-3" aria-label="Product">
            <FooterLink href="/product">Product</FooterLink>
            <FooterLink href="/how-it-works">How It Works</FooterLink>
            <FooterLink href="/pricing">Pricing</FooterLink>
            <FooterLink href="/docs">Docs</FooterLink>
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </nav>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "2px" }}>
            LEGAL
          </p>
          <nav className="mt-3" aria-label="Legal">
            <FooterLink href="/terms">Terms of Service</FooterLink>
            <FooterLink href="#">Blog (coming soon)</FooterLink>
            <FooterLink href="mailto:devon@webdocai.com">Support</FooterLink>
          </nav>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "2px" }}>
            RUN DIAGNOSTIC
          </p>
          <form onSubmit={handleFooterScan} className="landing-footer-scan-form mt-3">
            <div
              className="flex items-center rounded border transition-[border-color,box-shadow] duration-150"
              style={{
                background: "rgba(10,13,26,0.95)",
                borderColor: "rgba(28,28,46,0.8)",
                height: 48,
              }}
            >
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yoursite.com"
                className="min-w-0 flex-1 border-none bg-transparent px-3 font-mono text-[12px] outline-none"
                style={{ color: "var(--text-primary)" }}
                aria-label="Website URL"
              />
              <button
                type="submit"
                className="mr-1 shrink-0 px-3 font-mono text-[11px] font-bold uppercase tracking-wide transition-[background,box-shadow,border-color] duration-150"
                style={{
                  background: "transparent",
                  color: "var(--cyan)",
                  border: "1px solid var(--cyan)",
                  height: 44,
                  borderRadius: 3,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0,200,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.85)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--cyan)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                RUN DIAGNOSTIC
              </button>
            </div>
          </form>
          <p className="mt-2 font-mono text-[10px]" style={{ color: "#8899AA" }}>
            Guest diagnostic · No account required
          </p>
        </div>
      </div>

      <div
        className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-4 md:flex-row md:items-center"
        style={{ marginTop: 48, paddingTop: 24 }}
      >
        <p className="font-mono text-[11px]" style={{ color: "#8899AA" }}>
          © 2026 WebDoc AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
