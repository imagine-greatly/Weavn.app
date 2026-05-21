"use client";

import Link from "next/link";

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
  return (
    <footer
      className="site-footer-root"
      style={{
        background: "#050810",
        padding: "64px 48px 40px",
      }}
    >
      <div className="mx-auto grid max-w-[1100px] gap-12 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Link href="/" className="inline-flex items-center gap-2" aria-label="WebDoc home" style={{ textDecoration: "none" }}>
            <img
              src="/webdocai_logo_definitive.svg"
              alt="webdocai"
              width={32}
              height={32}
              style={{ display: 'block', flexShrink: 0 }}
            />
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
