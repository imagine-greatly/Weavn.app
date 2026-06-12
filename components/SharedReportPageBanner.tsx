"use client";

import Link from "next/link";

/**
 * Full-width banner above shared report layout. Clinical Futurism — DESIGN_SYSTEM.md.
 */

type SharedReportPageBannerProps = {
  domain: string;
};

export default function SharedReportPageBanner({ domain }: SharedReportPageBannerProps) {
  return (
    <div
      className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-3 px-6 py-3.5 md:px-10"
      style={{
        borderBottom: "1px solid rgba(0,200,255,0.15)",
        background: "rgba(0,200,255,0.04)",
      }}
    >
      <p
        className="font-mono"
        style={{
          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "rgba(240,244,255,0.75)",
          margin: 0,
          maxWidth: "min(100%, 52rem)",
        }}
      >
        This is a shared Weavn report for{" "}
        <span style={{ color: "rgba(0,200,255,0.95)" }}>{domain}</span>
      </p>
      <Link
        href="/"
        className="font-mono shrink-0"
        style={{
          fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "rgba(0,200,255,0.95)",
          textDecoration: "none",
          borderBottom: "1px solid rgba(0,200,255,0.35)",
          paddingBottom: 2,
        }}
      >
        Run your own scan →
      </Link>
    </div>
  );
}
