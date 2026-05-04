"use client";

import { useState } from "react";
import { stripMarkdownForDisplay } from "@/lib/stripMarkdownForDisplay";

/**
 * Hero Rewrite Module — featured AI output at top of report.
 * DESIGN_SYSTEM.md: clinical typography, cyan accents.
 */

export type HeroRewriteData = {
  current: { headline: string; subheadline: string; cta: string };
  suggested: { headline: string; subheadline: string; cta: string };
  psychologistNote: string;
};

const DEFAULT_DATA: HeroRewriteData = {
  current: {
    headline: "We help businesses grow with software solutions",
    subheadline:
      "Our platform offers powerful tools for teams of all sizes. Get started today and see the difference.",
    cta: "Get Started",
  },
  suggested: {
    headline: "Stop losing customers in the first 10 seconds",
    subheadline:
      "Most visitors decide before they scroll. The revenue gap: your message never proves you understand their problem before you ask for action.",
    cta: "See where you're losing people →",
  },
  psychologistNote:
    "The diagnosis: the hero stays in feature-description instead of pain-resolution. Visitors scan for evidence you understand their problem before they read further. The original headline centers you; what this needs to achieve is a them-first value frame — apply loss aversion or specificity framing in your brand voice.",
};

const PLACEHOLDER_SUGGESTED_HEADLINE = "Outcome-led hero brief required";
const PLACEHOLDER_SUGGESTED_SUB = "Clarify value proposition and reduce ambiguity";
const PLACEHOLDER_SUGGESTED_CTA = "Use specific action with clear next step";

const RESCAN_COPY =
  "Rescan to generate revenue-optimized copy for this site";

const spaceMono = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";

function isCurrencySelectorSubheadline(raw: string): boolean {
  const s = (raw ?? "").trim();
  if (!s) return false;
  const u = s.toUpperCase();
  if (/\bUNITED\s+STATES\b/.test(u) && /\bUSD\b/.test(u)) return true;
  if (/\bUSD\b/.test(u) && (u.includes("|") || u.includes("•"))) return true;
  if (/\bUNITED\s+STATES\b/.test(u) && (u.includes("|") || u.includes("$"))) return true;
  if (/\b(EUR|GBP|CAD|AUD|JPY)\b/.test(u) && s.length < 80) return true;
  if (/^\s*\$\s*[\d,.]/.test(s)) return true;
  return false;
}

function displayCurrentSubheadline(raw: string): string {
  if (isCurrencySelectorSubheadline(raw)) return "Not detected";
  return stripMarkdownForDisplay(raw) || "Not detected";
}

function isRubricHeroPlaceholder(suggested: HeroRewriteData["suggested"]): boolean {
  const h = (suggested.headline ?? "").trim();
  return h === PLACEHOLDER_SUGGESTED_HEADLINE;
}

type HeroRewriteModuleProps = {
  data?: HeroRewriteData;
};

function CopyAllButton({
  suggested,
  disabled,
}: {
  suggested: { headline: string; subheadline: string; cta: string };
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (disabled) return;
    const text = [
      `HEADLINE: ${suggested.headline}`,
      `SUBHEADLINE: ${suggested.subheadline}`,
      `CTA: ${suggested.cta}`,
    ].join("\n\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className="font-button w-full text-xs"
      style={{
        height: 44,
        borderRadius: 4,
        background: "transparent",
        border: "1px solid rgba(0,200,255,0.25)",
        color: "var(--cyan)",
        transition: "background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transitionDuration = "150ms";
        e.currentTarget.style.background = "rgba(0,200,255,0.08)";
        e.currentTarget.style.borderColor = "rgba(0,200,255,0.5)";
        e.currentTarget.style.boxShadow = "var(--cyan-glow-active)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transitionDuration = "300ms";
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "rgba(0,200,255,0.25)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {copied ? "COPIED" : "COPY REVENUE-OPTIMIZED COPY"}
    </button>
  );
}

export default function HeroRewriteModule({ data = DEFAULT_DATA }: HeroRewriteModuleProps) {
  const { current, suggested, psychologistNote } = data;
  const placeholderSuggested = isRubricHeroPlaceholder(suggested);
  const currentSubDisplay = displayCurrentSubheadline(current.subheadline);
  const suggestedHeadlineDisplay = placeholderSuggested
    ? RESCAN_COPY
    : stripMarkdownForDisplay(suggested.headline);
  const suggestedSubDisplay = placeholderSuggested
    ? RESCAN_COPY
    : stripMarkdownForDisplay(suggested.subheadline);
  const suggestedCtaDisplay = placeholderSuggested
    ? RESCAN_COPY
    : stripMarkdownForDisplay(suggested.cta);

  const spaceGrotesk = "var(--font-space-grotesk), sans-serif";

  return (
    <div
      className="w-full overflow-hidden border"
      style={{
        borderRadius: 4,
        background: "#050810",
        borderColor: "rgba(255,255,255,0.06)",
        marginBottom: 32,
      }}
    >
      <div
        className="flex flex-row items-center justify-between border-b"
        style={{
          padding: "16px 22px",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <span
          style={{
            color: "#00C8FF",
            fontFamily: spaceMono,
            fontSize: 10,
            letterSpacing: "0.2em",
          }}
        >
          HERO SECTION DIAGNOSIS
        </span>
        <button
          type="button"
          className="font-button border text-[11px]"
          style={{
            color: "rgba(240,244,255,0.45)",
            borderColor: "rgba(255,255,255,0.12)",
            borderRadius: 4,
            padding: "6px 14px",
            fontFamily: spaceMono,
            transition: "color 300ms ease, border-color 300ms ease",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transitionDuration = "150ms";
            e.currentTarget.style.color = "#00C8FF";
            e.currentTarget.style.borderColor = "rgba(0,200,255,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transitionDuration = "300ms";
            e.currentTarget.style.color = "rgba(240,244,255,0.45)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          }}
        >
          REGENERATE
        </button>
      </div>

      <div style={{ padding: "22px 22px 0" }}>
        <p
          style={{
            fontFamily: spaceMono,
            fontSize: 13,
            color: "#00C8FF",
            lineHeight: 1.5,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {`> ${stripMarkdownForDisplay(current.headline) || "—"}`}
        </p>
        <p
          style={{
            fontFamily: spaceGrotesk,
            fontSize: 13,
            fontWeight: 400,
            color: "rgba(240,244,255,0.82)",
            lineHeight: 1.65,
            margin: "16px 0 0 0",
          }}
        >
          {stripMarkdownForDisplay(psychologistNote)}
        </p>
      </div>

      <div
        style={{
          margin: "22px 22px 0",
          padding: "16px 18px",
          background: "rgba(240,244,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 4,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <span
            style={{
              fontFamily: spaceMono,
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "rgba(240,244,255,0.4)",
              display: "block",
              marginBottom: 6,
            }}
          >
            HEADLINE
          </span>
          <p
            style={{
              fontFamily: spaceGrotesk,
              fontSize: 13,
              color: "#F0F4FF",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {suggestedHeadlineDisplay}
          </p>
        </div>
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.08)",
            margin: "14px 0",
          }}
        />
        <div style={{ marginBottom: 14 }}>
          <span
            style={{
              fontFamily: spaceMono,
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "rgba(240,244,255,0.4)",
              display: "block",
              marginBottom: 6,
            }}
          >
            SUBHEADLINE
          </span>
          <p
            style={{
              fontFamily: spaceGrotesk,
              fontSize: 13,
              color: "#F0F4FF",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {suggestedSubDisplay}
          </p>
        </div>
        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.08)",
            margin: "14px 0",
          }}
        />
        <div>
          <span
            style={{
              fontFamily: spaceMono,
              fontSize: 9,
              letterSpacing: "0.12em",
              color: "rgba(240,244,255,0.4)",
              display: "block",
              marginBottom: 6,
            }}
          >
            CTA
          </span>
          <p
            style={{
              fontFamily: spaceGrotesk,
              fontSize: 13,
              color: "#F0F4FF",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {suggestedCtaDisplay}
          </p>
        </div>
      </div>

      <div
        style={{
          padding: "18px 22px 22px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          marginTop: 22,
        }}
      >
        <CopyAllButton suggested={suggested} disabled={placeholderSuggested} />
      </div>
    </div>
  );
}
