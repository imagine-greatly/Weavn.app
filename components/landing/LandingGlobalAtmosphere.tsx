"use client";

type Props = {
  /** Fill a fixed landing overlay parent so grid/bloom sit above section base colors (still mostly transparent). */
  asOverlay?: boolean;
};

/**
 * Landing-only depth stack (grid + hero-adjacent bloom + grain).
 * Default: fixed z-0..2 behind in-page content. asOverlay: absolute layers inside a fixed wrapper above sections.
 */
export default function LandingGlobalAtmosphere({ asOverlay }: Props) {
  const gridPos = asOverlay ? "pointer-events-none absolute inset-0 z-0 mix-blend-soft-light opacity-[0.45]" : "pointer-events-none fixed inset-0 z-[1]";
  const bloomPos = asOverlay
    ? "pointer-events-none absolute inset-0 z-0 mix-blend-soft-light opacity-[0.55]"
    : "pointer-events-none fixed left-0 right-0 top-0 z-[1] h-[100svh]";
  const grainPos = asOverlay ? "pointer-events-none absolute inset-0 z-[1]" : "pointer-events-none fixed inset-0 z-[2]";

  return (
    <>
      <div
        className={gridPos}
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,200,255,0.017) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.017) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className={bloomPos}
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,200,255,0.035) 0%, transparent 60%)",
        }}
      />
      <div className={grainPos} style={{ opacity: asOverlay ? 0.02 : 0.025 }} aria-hidden>
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="landing-grain-noise" x="0" y="0">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter="url(#landing-grain-noise)" fill="white" />
        </svg>
      </div>
    </>
  );
}
