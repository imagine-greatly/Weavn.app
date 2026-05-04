"use client";

/**
 * Mounts once in root layout — circuit + grid atmosphere persist across navigations
 * (no remount flash). Sits above page backgrounds, below navbar (z-100).
 * Canvas layers load client-only (dynamic, ssr: false) and are isolated so a failure
 * does not blank the app.
 *
 * Viewport ≤768px: static CSS grid + bloom only (no canvas, no grain SVG, no dynamic chunk load).
 */
import dynamic from "next/dynamic";
import { Component, type ReactNode, useLayoutEffect, useState } from "react";

class AmbientErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const LandingGlobalAtmosphere = dynamic(
  () => import("@/components/landing/LandingGlobalAtmosphere"),
  { ssr: false, loading: () => null }
);

const LandingCircuitCanvas = dynamic(
  () => import("@/components/landing/LandingCircuitCanvas"),
  { ssr: false, loading: () => null }
);

/** Same stack as LandingGlobalAtmosphere (asOverlay) minus grain — static, mobile-safe. */
function StaticMobileSiteAmbient() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-0 mix-blend-soft-light opacity-[0.45]"
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
        className="pointer-events-none absolute inset-0 z-0 mix-blend-soft-light opacity-[0.55]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,200,255,0.035) 0%, transparent 60%)",
        }}
      />
    </>
  );
}

function useMinWidth769() {
  const [isWide, setIsWide] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const sync = () => setIsWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isWide;
}

export default function PersistentSiteAmbient() {
  const isWide = useMinWidth769();

  return (
    <div className="pointer-events-none fixed inset-0 z-[12]" aria-hidden>
      {isWide === null ? null : isWide ? (
        <>
          <AmbientErrorBoundary>
            <LandingGlobalAtmosphere asOverlay />
          </AmbientErrorBoundary>
          <AmbientErrorBoundary>
            <LandingCircuitCanvas overlay />
          </AmbientErrorBoundary>
        </>
      ) : (
        <StaticMobileSiteAmbient />
      )}
    </div>
  );
}
