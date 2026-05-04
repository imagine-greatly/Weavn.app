"use client";

/**
 * Minimal full-viewport skeleton while client pages resolve data.
 * No loading copy — pulse bars only (DESIGN_SYSTEM polish).
 */
export default function PageLoadSkeleton({
  bars = 4,
  maxWidth = 420,
}: {
  bars?: number;
  maxWidth?: number;
}) {
  const widths = ["100%", "92%", "84%", "76%", "68%", "60%"];
  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: 24,
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        style={{
          width: "100%",
          maxWidth,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="page-skeleton-bar"
            style={{
              width: widths[i % widths.length],
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
