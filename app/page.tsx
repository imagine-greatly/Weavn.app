"use client";

import { Suspense, useEffect, useState } from "react";
import LandingPage from "@/components/landing/LandingPage";
import { getBlockedMessage, isBlockedDomain } from "@/lib/scanGuard";

/** DESIGN_SYSTEM.md — base background while searchParams boundary resolves */
const LANDING_BG_BASE = "#050810";

function normalizeUrlLikeLanding(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

function EnterpriseBlockModal({
  open,
  onClose,
  onPrimary,
  onSecondary,
}: {
  open: boolean;
  onClose: () => void;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  if (!open) return null;
  const copy = getBlockedMessage();
  const BR = 18;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-block-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200000,
        background: "rgba(5,8,16,0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          background: "#0A0F1E",
          border: "1px solid #1A2035",
          borderRadius: 2,
          padding: "36px 32px 32px",
          boxSizing: "border-box",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            top: 14,
            left: 14,
            borderTop: "2px solid rgba(0,200,255,0.35)",
            borderLeft: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            top: 14,
            right: 14,
            borderTop: "2px solid rgba(0,200,255,0.35)",
            borderRight: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            bottom: 14,
            left: 14,
            borderBottom: "2px solid rgba(0,200,255,0.35)",
            borderLeft: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: BR,
            height: BR,
            bottom: 14,
            right: 14,
            borderBottom: "2px solid rgba(0,200,255,0.35)",
            borderRight: "2px solid rgba(0,200,255,0.35)",
          }}
        />
        <h2
          id="enterprise-block-title"
          className="font-sans font-extrabold"
          style={{
            color: "#FFFFFF",
            fontSize: 22,
            letterSpacing: "-0.5px",
            lineHeight: 1.15,
            margin: "0 0 16px 0",
            paddingRight: 8,
          }}
        >
          {copy.headline}
        </h2>
        <div
          style={{
            fontFamily: "var(--font-space-mono), ui-monospace, monospace",
            fontSize: 12,
            color: "#8899AA",
            lineHeight: 1.65,
            whiteSpace: "pre-line",
            marginBottom: 28,
          }}
        >
          {copy.body}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            onClick={onPrimary}
            className="font-mono text-[12px] font-bold uppercase tracking-wide"
            style={{
              flex: "1 1 200px",
              padding: "12px 20px",
              background: "#00C8FF",
              color: "#050810",
              border: "1px solid #00C8FF",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            {copy.ctaPrimary}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="font-mono text-[11px] font-semibold uppercase tracking-wide"
            style={{
              flex: "1 1 180px",
              padding: "12px 16px",
              background: "transparent",
              color: "rgba(0,200,255,0.85)",
              border: "1px solid rgba(0,200,255,0.35)",
              cursor: "pointer",
              borderRadius: 2,
            }}
          >
            {copy.ctaSecondary}
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingScanGuardHost() {
  const [blockedOpen, setBlockedOpen] = useState(false);

  const clearInputHighlights = () => {
    document.querySelectorAll<HTMLInputElement>("form.landing-hero-scan-form input").forEach((inp) => {
      inp.style.boxShadow = "";
    });
  };

  useEffect(() => {
    const onSubmitCapture = (ev: Event) => {
      if (!(ev instanceof SubmitEvent)) return;
      const form = ev.target;
      if (!(form instanceof HTMLFormElement) || !form.classList.contains("landing-hero-scan-form")) {
        return;
      }
      const inp =
        form.querySelector<HTMLInputElement>("input[type=\"text\"]") ??
        form.querySelector<HTMLInputElement>("input:not([type])");
      const raw = inp?.value ?? "";
      const normalized = normalizeUrlLikeLanding(raw);
      if (!normalized) return;
      try {
        new URL(normalized);
      } catch {
        return;
      }
      if (!isBlockedDomain(normalized)) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      setBlockedOpen(true);
      if (inp) inp.style.boxShadow = "0 0 0 2px rgba(0,200,255,0.45)";
    };
    document.addEventListener("submit", onSubmitCapture, true);
    return () => document.removeEventListener("submit", onSubmitCapture, true);
  }, []);

  useEffect(() => {
    const onFocusOutCapture = (ev: Event) => {
      if (!(ev instanceof FocusEvent)) return;
      const t = ev.target;
      if (!(t instanceof HTMLInputElement)) return;
      const form = t.closest("form");
      if (!form?.classList.contains("landing-hero-scan-form")) return;
      const raw = t.value ?? "";
      if (!raw.trim()) return;
      const normalized = normalizeUrlLikeLanding(raw);
      try {
        new URL(normalized);
      } catch {
        return;
      }
      if (isBlockedDomain(normalized)) {
        setBlockedOpen(true);
        t.style.boxShadow = "0 0 0 2px rgba(0,200,255,0.45)";
      }
    };
    document.addEventListener("focusout", onFocusOutCapture, true);
    return () => document.removeEventListener("focusout", onFocusOutCapture, true);
  }, []);

  const handlePrimary = () => {
    setBlockedOpen(false);
    clearInputHighlights();
    const first = document.querySelector<HTMLInputElement>(
      "form.landing-hero-scan-form input[type=\"text\"], form.landing-hero-scan-form input:not([type])",
    );
    first?.focus();
    first?.select?.();
  };

  const handleSecondary = () => {
    setBlockedOpen(false);
    clearInputHighlights();
    window.open(
      "mailto:?subject=WebDoc%20Agency-tier%20diagnostic%20waitlist",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <EnterpriseBlockModal
      open={blockedOpen}
      onClose={() => {
        setBlockedOpen(false);
        clearInputHighlights();
      }}
      onPrimary={handlePrimary}
      onSecondary={handleSecondary}
    />
  );
}

/**
 * Hero H1: keep "Conversion Intelligence" on one line from tablet up; <br /> still splits line 2.
 * Widen headline column at 1280px+; slightly reduce font / tracking down to 1280 so nowrap fits without overflow.
 * Scoped to #webdoc-landing-home only (see LandingHero).
 */
const LANDING_HEADLINE_COLUMN_CSS = `@media (min-width: 768px) {
  #webdoc-landing-home .max-w-\\[660px\\] {
    max-width: 920px !important;
  }
  #webdoc-landing-home h1 {
    white-space: nowrap;
    font-size: clamp(48px, 5.5vw, 78px) !important;
    letter-spacing: -2.2px !important;
  }
}
@media (min-width: 1280px) {
  #webdoc-landing-home .max-w-\\[660px\\] {
    max-width: 1040px !important;
  }
  #webdoc-landing-home h1 {
    font-size: clamp(50px, 5.8vw, 84px) !important;
    letter-spacing: -2.35px !important;
  }
}
@media (min-width: 1440px) {
  #webdoc-landing-home h1 {
    font-size: clamp(52px, 6.5vw, 86px) !important;
    letter-spacing: -2.5px !important;
  }
}`;

export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_HEADLINE_COLUMN_CSS }} />
      <LandingScanGuardHost />
      <Suspense
        fallback={
          <div className="relative min-h-screen" style={{ background: LANDING_BG_BASE }} />
        }
      >
        <div id="webdoc-landing-home">
          <LandingPage />
        </div>
      </Suspense>
    </>
  );
}
