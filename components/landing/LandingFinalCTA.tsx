"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { ScrollReveal } from "@/components/ScrollReveal";
function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

type Props = {
  url: string;
  onUrlChange: (v: string) => void;
  /** When user lands with `?scan=1`, focus this bar instead of hero */
  autoFocus?: boolean;
};

export default function LandingFinalCTA({ url, onUrlChange, autoFocus }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("URL required.");
      return;
    }
    try {
      new URL(normalized);
    } catch {
      setError("Invalid URL format.");
      return;
    }
    setError("");
    setLoading(true);
    sessionStorage.setItem("pendingUrl", normalized);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push(`/scan?url=${encodeURIComponent(normalized)}`);
    } else {
      document.cookie = `pendingUrl=${encodeURIComponent(normalized)};path=/;max-age=300;SameSite=Lax`;
      router.push("/auth?tab=signup");
    }
  }

  return (
    <section
      id="final-cta"
      className="relative overflow-hidden pb-[120px] pt-[160px]"
      style={{ background: "#050810" }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 65% 72% at 50% 48%, rgba(0,200,255,0.066) 0%, transparent 62%)",
          filter: "blur(72px)",
        }}
      />
      <div
        className="pointer-events-none absolute left-0 top-0 z-0 h-[480px] w-[480px]"
        aria-hidden
        style={{
          background: "rgba(0,200,255,0.055)",
          filter: "blur(88px)",
          transform: "translate(-30%, -30%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-0 h-[380px] w-[380px]"
        aria-hidden
        style={{
          background: "rgba(0,120,220,0.027)",
          filter: "blur(88px)",
          transform: "translate(28%, 28%)",
        }}
      />

      <div className="relative z-[3] mx-auto max-w-[min(640px,calc(100vw-32px))] px-6">
        <ScrollReveal variant="headline">
          <h2
            className="text-center font-sans font-extrabold"
            style={{
              fontSize: "clamp(32px, 4.5vw, 68px)",
              lineHeight: 1.02,
              letterSpacing: "-2px",
              color: "var(--text-primary)",
              fontWeight: 800,
            }}
          >
            Conversion suppression is common
            <span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
          <p
            className="mt-2 text-center font-sans font-bold"
            style={{
              fontSize: "clamp(36px, 4.5vw, 56px)",
              lineHeight: 0.95,
              letterSpacing: "-1.5px",
              color: "var(--text-primary)",
              fontWeight: 700,
            }}
          >
            Run a diagnostic on your site.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="sub" delay={0.1}>
          <p
            className="mx-auto mt-5 max-w-[400px] text-center font-sans text-[18px] font-light"
            style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}
          >
            The scan completes in approximately 30 seconds. You receive ranked diagnostic findings with evidence and resolutions mapped to revenue impact.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="headline" delay={0.15} className="relative mx-auto mt-10 w-full max-w-[520px]">
          <div
            className="pointer-events-none absolute rounded-[10px]"
            style={{
              inset: -3,
              boxShadow: "var(--cyan-glow-soft)",
            }}
            aria-hidden
          />
          <form
            onSubmit={handleSubmit}
            className="landing-hero-scan-form relative flex h-16 items-center rounded-lg transition-[border-color,box-shadow] duration-150"
            style={{
              background: "rgba(10,13,26,0.95)",
              border: "1px solid rgba(28,28,46,0.8)",
              borderRadius: 8,
              padding: "0 6px 0 0",
            }}
          >
            <span
              className="shrink-0 pl-5 font-mono text-[13px] select-none"
              style={{ color: "var(--cyan)", opacity: 0.5 }}
            >
              &gt;_
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                onUrlChange(e.target.value);
                setError("");
              }}
              placeholder="https://yourwebsite.com"
              autoFocus={autoFocus}
              disabled={loading}
              className="min-w-0 flex-1 border-none bg-transparent px-3.5 font-mono text-[14px] outline-none placeholder:font-mono placeholder:text-[14px]"
              style={{ color: "var(--text-primary)", border: "none", outline: "none" }}
              aria-label="Website URL"
            />
            <button
              type="submit"
              disabled={loading}
              className="landing-cta-button-pulse group/btn relative flex shrink-0 items-center font-mono text-[13px] font-bold transition-[background,opacity] duration-150"
              style={{
                background: "var(--cyan)",
                color: "#050810",
                padding: "0 22px",
                height: 52,
                borderRadius: 6,
                margin: "6px 6px 6px 0",
                opacity: loading ? 0.85 : 1,
                border: "none",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (loading) return;
                e.currentTarget.style.background = "#33D6FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--cyan)";
              }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      border: "2px solid #050810",
                      borderTopColor: "transparent",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  INITIATING DIAGNOSTIC SCAN
                </span>
              ) : (
                <>
                  RUN DIAGNOSTIC
                  <span className="ml-0.5 inline-block transition-transform duration-150 group-hover/btn:translate-x-[3px]">
                    →
                  </span>
                </>
              )}
            </button>
          </form>
          {error && (
            <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}

          <p
            className="mt-[14px] text-center font-mono text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            Free account required{" "}
            <span style={{ color: "var(--border-default)" }}>·</span> No credit card{" "}
            <span style={{ color: "var(--border-default)" }}>·</span> Takes 90 seconds
          </p>

          <p className="mt-7 text-center font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
            Free tier: one full diagnostic scan · Pro: $50/month · Cancel anytime
          </p>
          <p className="mt-4 text-center font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
            ▪ 30 SECOND SCAN
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 24,
              marginTop: 32,
            }}
          >
            {[
              { label: "PRODUCT", href: "/product" },
              { label: "HOW IT WORKS", href: "/how-it-works" },
              { label: "PRICING", href: "/pricing" },
              { label: "DOCS", href: "/docs" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-[11px] uppercase transition-colors duration-150"
                style={{ color: "#8899AA", letterSpacing: "0.1em", textDecoration: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--cyan)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#8899AA"; }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
