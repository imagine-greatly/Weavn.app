"use client";

/**
 * Fixed full-screen grain texture overlay (feTurbulence). body-level, z-index 9999.
 * DESIGN_SYSTEM.md — expensive display feel.
 */
export default function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 hidden min-[769px]:block"
      style={{ zIndex: 9999, opacity: 0.025 }}
      aria-hidden
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="grain-noise" x="0" y="0">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#grain-noise)" fill="white" />
      </svg>
    </div>
  );
}
