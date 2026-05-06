"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import LandingScanBar from "@/components/landing/LandingScanBar";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

type Props = {
  url: string;
  onUrlChange: (v: string) => void;
  autoFocus?: boolean;
};

const BR = 18;

function CornerBracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const line = "rgba(0,200,255,0.2)";
  const base = "pointer-events-none absolute z-[4]";
  const pos =
    position === "tl"
      ? "left-6 top-20"
      : position === "tr"
        ? "right-6 top-20"
        : position === "bl"
          ? "bottom-28 left-6"
          : "bottom-28 right-6";
  return (
    <div className={`${base} ${pos}`} aria-hidden>
      {position === "tl" && (
        <>
          <div style={{ width: BR, height: 1, background: line }} />
          <div style={{ width: 1, height: BR, background: line, marginTop: -1 }} />
        </>
      )}
      {position === "tr" && (
        <>
          <div className="ml-auto" style={{ width: BR, height: 1, background: line }} />
          <div className="ml-auto" style={{ width: 1, height: BR, background: line, marginTop: -1 }} />
        </>
      )}
      {position === "bl" && (
        <>
          <div style={{ width: 1, height: BR, background: line }} />
          <div style={{ width: BR, height: 1, background: line, marginTop: -1 }} />
        </>
      )}
      {position === "br" && (
        <>
          <div className="ml-auto" style={{ width: 1, height: BR, background: line }} />
          <div className="ml-auto flex justify-end" style={{ width: BR, height: 1, background: line, marginTop: -1 }} />
        </>
      )}
    </div>
  );
}

export default function LandingHero({ url, onUrlChange, autoFocus }: Props) {
  const router = useRouter();
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlErrorTitle, setUrlErrorTitle] = useState<string>("");
  const [loadingState, setLoadingState] = useState<false | "checking" | "scanning">(false);

  useEffect(() => {
    if (!urlError) return;
    const t = setTimeout(() => setUrlError(null), 5000);
    return () => clearTimeout(t);
  }, [urlError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    let parsed: URL;
    try {
      parsed = new URL(withProtocol);
    } catch {
      onUrlChange("");
      setUrlErrorTitle("INVALID URL  DETECTED");
      setUrlError("The input does not resolve to a live domain. Enter a valid website URL to proceed.");
      return;
    }
    const { hostname } = parsed;
    if (!hostname.includes(".") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      onUrlChange("");
      setUrlErrorTitle("INVALID URL  DETECTED");
      setUrlError("The input does not resolve to a live domain. Enter a valid website URL to proceed.");
      return;
    }
    setLoadingState("checking");
    try {
      const res = await fetch(`/api/check-url?url=${encodeURIComponent(withProtocol)}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json() as { reachable: boolean };
        if (!data.reachable) {
          onUrlChange("");
          setUrlErrorTitle("DIAGNOSTIC INITIALISATION FAILED");
          setUrlError("Target URL could not be resolved. Verify the domain is active and accessible before running a diagnostic.");
          setLoadingState(false);
          return;
        }
      }
    } catch {
      // network failure or timeout — proceed
    }
    setLoadingState("scanning");
    sessionStorage.setItem("pendingUrl", withProtocol);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push(`/scan?url=${encodeURIComponent(withProtocol)}`);
    } else {
      document.cookie = `pendingUrl=${encodeURIComponent(withProtocol)};path=/;max-age=300;SameSite=Lax`;
      router.push("/auth?tab=signup&next=/scan");
    }
  }

  return (
    <section
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-16 pb-[120px] md:pb-[140px]"
      style={{ background: "#050810" }}
    >
      {/* Atmospheric stack */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 40%, rgba(0,200,255,0.035) 0%, transparent 65%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute z-[1] rounded-full"
        style={{
          width: 500,
          height: 400,
          left: "4%",
          top: "12%",
          background: "rgba(0,150,255,0.04)",
          filter: "blur(80px)",
          animation: "heroNeuralDrift 16s ease-in-out infinite",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute z-[1] rounded-full"
        style={{
          width: 400,
          height: 500,
          right: "6%",
          bottom: "10%",
          background: "rgba(0,100,200,0.018)",
          filter: "blur(100px)",
          animation: "heroNeuralDrift 22s ease-in-out infinite reverse",
        }}
        aria-hidden
      />

      <style>{`
        @media (max-width: 768px) {
          .hero-headline { font-size: clamp(32px, 8vw, 56px) !important; }
          .hero-sub { font-size: clamp(14px, 4vw, 18px) !important; }
        }
        @keyframes urlErrorFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Vertical-traveling horizontal beam — clipped to hero only (not layout / inner pages) */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        <div
          className="absolute left-0 right-0 top-0 h-0.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.08) 15%, rgba(0,200,255,0.25) 40%, rgba(0,200,255,0.4) 50%, rgba(0,200,255,0.25) 60%, rgba(0,200,255,0.08) 85%, transparent 100%)",
            boxShadow: "0 0 8px rgba(0,200,255,0.3), 0 0 30px rgba(0,200,255,0.1)",
            animation: "heroScan 6s ease-in-out infinite",
            willChange: "transform, opacity",
          }}
        />
      </div>

      <LandingScanBar />

      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />

      <div className="relative z-[3] mx-auto w-full max-w-[660px] px-6 py-16">
        <ScrollReveal variant="headline" delay={0}>
          <p
            className="text-center font-mono text-[11px]"
            style={{ color: "var(--text-muted)", letterSpacing: "2px", marginBottom: 28 }}
          >
            <span className="live-pulse inline-block text-[8px]" style={{ color: "#00FF87" }}>
              ●
            </span>{" "}
            SYSTEM ACTIVE · 166 DIAGNOSTIC CHECKS · MULTI-PAGE SCAN
          </p>
        </ScrollReveal>

        <ScrollReveal variant="headline" delay={0.1}>
          <h1
            className="hero-headline text-center font-sans font-extrabold"
            style={{
              fontSize: "clamp(52px, 6.5vw, 86px)",
              lineHeight: 0.94,
              letterSpacing: "-2.5px",
              color: "var(--text-primary)",
              fontWeight: 800,
            }}
          >
            Conversion Intelligence
            <br />
            for your website<span style={{ color: "var(--cyan)" }}>.</span>
          </h1>
        </ScrollReveal>

        <ScrollReveal variant="sub" delay={0.2}>
          <p
            className="hero-sub mx-auto mt-[22px] max-w-[440px] text-center font-sans text-[17px] font-light"
            style={{ color: "var(--text-secondary)", lineHeight: 1.8 }}
          >
            webdoc.ai runs 166 diagnostic checks on your site — identifying every conversion killer, ranked by revenue impact, with exact resolutions.
          </p>
        </ScrollReveal>

        <ScrollReveal variant="headline" delay={0.3} className="relative mx-auto mt-10 w-full max-w-[560px]">
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
                if (urlError) setUrlError(null);
              }}
              placeholder="https://yourwebsite.com"
              autoFocus={autoFocus}
              disabled={loadingState !== false}
              className="min-w-0 flex-1 border-none bg-transparent px-3.5 font-mono text-[14px] outline-none placeholder:font-mono placeholder:text-[14px]"
              style={{ color: "var(--text-primary)", border: "none", outline: "none" }}
              aria-label="Website URL"
            />
            <button
              type="submit"
              disabled={loadingState !== false}
              className="landing-cta-button-pulse group/btn relative flex shrink-0 items-center font-mono text-[13px] font-bold transition-[background,opacity] duration-150"
              style={{
                background: "var(--cyan)",
                color: "#050810",
                padding: "0 22px",
                height: 52,
                borderRadius: 6,
                margin: "6px 6px 6px 0",
                opacity: loadingState !== false ? 0.85 : 1,
                border: "none",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (loadingState !== false) return;
                e.currentTarget.style.background = "#33D6FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--cyan)";
              }}
            >
              {loadingState === "scanning" ? (
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
              ) : loadingState === "checking" ? (
                "CHECKING..."
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
        </ScrollReveal>

        <ScrollReveal variant="headline" delay={0.4}>
          <p
            className="mt-[14px] text-center font-mono text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            Free account required{" "}
            <span style={{ color: "var(--border-default)" }}>·</span> No credit card{" "}
            <span style={{ color: "var(--border-default)" }}>·</span> Takes 90 seconds
          </p>
          <p
            className="text-center font-mono text-[11px]"
            style={{ color: "#8899AA", marginTop: 12 }}
          >
            Create your free account to run your diagnostic — takes 30 seconds.
          </p>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="headline" delay={0.5} className="absolute bottom-8 left-1/2 z-[3] -translate-x-1/2">
        <Link
          href="#live-preview"
          className="animate-bounce-subtle font-mono text-[10px] transition-colors duration-150"
          style={{ color: "var(--text-muted)", letterSpacing: "2px" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          ↓ VIEW DIAGNOSTIC PREVIEW
        </Link>
      </ScrollReveal>
    </section>
  );
}
