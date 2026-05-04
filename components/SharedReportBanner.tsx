"use client";

import Link from "next/link";

/**
 * Banner at top of shared report right panel. Establishes context and CTA.
 * DESIGN_SYSTEM.md.
 */

type SharedReportBannerProps = {
  domain: string;
};

export default function SharedReportBanner({ domain }: SharedReportBannerProps) {
  return (
    <div
      className="flex flex-row items-center justify-between border-b"
      style={{
        background: "rgba(0,200,255,0.05)",
        borderColor: "rgba(0,200,255,0.12)",
        padding: "14px 32px",
      }}
    >
      <p className="font-ui-label" style={{ color: "var(--text-muted)" }}>
        You&apos;re viewing{" "}
        <span style={{ color: "var(--cyan)" }}>{domain}</span>
        &apos;s growth report
      </p>
      <Link
        href="/"
        className="font-button rounded border text-[11px]"
        style={{
          color: "var(--cyan)",
          borderColor: "rgba(0,200,255,0.3)",
          padding: "6px 14px",
          transition: "color 300ms ease, border-color 300ms ease, background-color 300ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transitionDuration = "150ms";
          e.currentTarget.style.background = "rgba(0,200,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(0,200,255,0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transitionDuration = "300ms";
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
        }}
      >
        SCAN YOUR SITE →
      </Link>
    </div>
  );
}
