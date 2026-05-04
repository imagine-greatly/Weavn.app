"use client";

import Link from "next/link";

/**
 * Fixed bottom bar in shared report view: teases locked findings count and CTA.
 * DESIGN_SYSTEM.md — Tier 1 ambient glow, font-mono for data, electric hover.
 */

type SharedReportLockBarProps = {
  hiddenCount: number;
};

export default function SharedReportLockBar({ hiddenCount }: SharedReportLockBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-10 flex flex-row items-center justify-between border-t"
      style={{
        background: "rgba(0,200,255,0.05)",
        borderColor: "rgba(0,200,255,0.12)",
        padding: "14px 32px",
        boxShadow: "0 0 40px rgba(0,180,255,0.06)",
      }}
    >
      <p className="font-ui-label" style={{ color: "var(--text-muted)" }}>
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          {hiddenCount}
        </span>{" "}
        more {hiddenCount === 1 ? "finding" : "findings"} locked
      </p>
      <Link
        href="/"
        className="font-button rounded border text-[11px]"
        style={{
          color: "var(--cyan)",
          borderColor: "rgba(0,200,255,0.3)",
          padding: "6px 14px",
          transition:
            "color 300ms ease, border-color 300ms ease, background-color 300ms ease, box-shadow 150ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,200,255,0.08)";
          e.currentTarget.style.borderColor = "rgba(0,200,255,0.5)";
          e.currentTarget.style.boxShadow =
            "0 0 0 1px rgba(0,200,255,0.4), 0 0 20px rgba(0,200,255,0.2), 0 0 60px rgba(0,200,255,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        SCAN YOUR SITE TO SEE ALL →
      </Link>
    </div>
  );
}
