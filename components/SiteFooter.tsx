"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateUrl } from "@/lib/validateUrl";

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
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlErrorTitle, setUrlErrorTitle] = useState<string>("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!urlError) return;
    const t = setTimeout(() => setUrlError(null), 5000);
    return () => clearTimeout(t);
  }, [urlError]);

  async function handleFooterScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setChecking(true);
    const result = await validateUrl(url);
    setChecking(false);
    if (!result.valid) {
      if (!result.error) return;
      setUrlErrorTitle(result.type === 'format' ? 'INVALID TARGET DETECTED' : 'DIAGNOSTIC INITIALISATION FAILED');
      setUrlError(result.error);
      return;
    }
    router.push(`/scan?url=${encodeURIComponent(result.url)}`);
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

        <div>
          <p className="font-mono text-[11px] uppercase" style={{ color: "#8899AA", letterSpacing: "2px" }}>
            RUN DIAGNOSTIC
          </p>
          <style>{`@keyframes urlErrorFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <form onSubmit={handleFooterScan} className="landing-footer-scan-form mt-3" style={{ position: "relative" }}>
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
                onChange={(e) => { setUrl(e.target.value); if (urlError) setUrlError(null); }}
                placeholder="yoursite.com"
                disabled={checking}
                className="min-w-0 flex-1 border-none bg-transparent px-3 font-mono text-[12px] outline-none"
                style={{ color: "var(--text-primary)" }}
                aria-label="Website URL"
              />
              <button
                type="submit"
                disabled={checking}
                className="mr-1 shrink-0 px-3 font-mono text-[11px] font-bold uppercase tracking-wide transition-[background,box-shadow,border-color] duration-150"
                style={{
                  background: "transparent",
                  color: "var(--cyan)",
                  border: "1px solid var(--cyan)",
                  height: 44,
                  borderRadius: 3,
                  opacity: checking ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (checking) return;
                  e.currentTarget.style.background = "rgba(0,200,255,0.08)";
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.85)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--cyan)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {checking ? "CHECKING..." : "RUN DIAGNOSTIC"}
              </button>
            </div>
            {urlError && (
              <div
                onClick={() => setUrlError(null)}
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: "#0A0F1E",
                  border: "1px solid rgba(255,68,68,0.4)",
                  borderLeft: "3px solid #FF4444",
                  borderRadius: 4,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                  animation: "urlErrorFadeIn 150ms ease",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1.5px solid #FF4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 10,
                      color: "#FF4444",
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    !
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 9,
                      color: "#FF4444",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    {urlErrorTitle}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 11,
                      color: "#8899AA",
                      lineHeight: 1.5,
                      marginTop: 4,
                    }}
                  >
                    {urlError}
                  </div>
                </div>
              </div>
            )}
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
