"use client";

/**
 * Traveling horizontal scan highlight at top of homepage hero only.
 * Parent must be `relative overflow-hidden` (see LandingHero).
 */
export default function LandingScanBar() {
  return <div className="landing-scan-bar pointer-events-none" aria-hidden />;
}
