"use client";

/**
 * Global background stack for webdoc.ai.
 * Animated circuit traces live in PersistentSiteAmbient (layout) so they don’t remount per route.
 * Fixed, full-viewport, z-index 0, pointer-events: none.
 */
export default function BackgroundField() {
  const circuitGridDataUrl =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><defs><pattern id="g" width="60" height="60"><line x1="0" y1="0" x2="60" y2="0" stroke="rgba(0,200,255,0.015)" stroke-width="1"/><line x1="0" y1="0" x2="0" y2="60" stroke="rgba(0,200,255,0.015)" stroke-width="1"/><circle cx="0" cy="0" r="1" fill="rgba(0,200,255,0.03)"/></pattern></defs><rect width="60" height="60" fill="url(#g)"/></svg>`
    );

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    >
      {/* Layer 1 — Base */}
      <div
        className="absolute inset-0"
        style={{ background: "#050810" }}
      />

      {/* Layer 2 — Circuit grid */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: `url("${circuitGridDataUrl}")`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Layer 3 — Atmospheric bloom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,200,255,0.033) 0%, transparent 60%)",
        }}
      />

      {/* Layer 4 — Grain (feTurbulence); omitted ≤768px — too costly on mobile GPUs */}
      <svg
        className="absolute inset-0 hidden min-[769px]:block h-full w-full opacity-[0.035] mix-blend-soft-light"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <filter id="grain" x="0" y="0">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
