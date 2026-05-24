"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import SiteFooter from "@/components/SiteFooter";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingHero from "@/components/landing/LandingHero";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingThreeNumbers from "@/components/landing/LandingThreeNumbers";
import LandingDashboardDemo from "@/components/landing/LandingDashboardDemo";
import LandingDiagnosticOutput from "@/components/landing/LandingDiagnosticOutput";
import LandingGrowthBlueprint from "@/components/landing/LandingGrowthBlueprint";
import LandingDiagnosticChecks from "@/components/landing/LandingDiagnosticChecks";

const LANDING_BG_BASE = "#050810";

function LandingMist({ from, to }: { from: string; to: string }) {
  return (
    <div aria-hidden className="relative h-[60px] w-full overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)` }} />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 800,
          height: 200,
          background: "radial-gradient(ellipse, rgba(0,200,255,0.04) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const searchParams = useSearchParams();
  const scanFocus = searchParams.get("scan") === "1" || searchParams.get("scan") === "true";

  useEffect(() => {
    if (!scanFocus) return;
    const t = window.setTimeout(() => {
      document.getElementById("final-cta")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [scanFocus]);

  return (
    <div className="relative min-h-screen" style={{ background: LANDING_BG_BASE }}>
      <div className="relative z-10">
        <LandingHero url={url} onUrlChange={setUrl} autoFocus={!scanFocus} />
        <LandingDiagnosticChecks />
        <LandingMist from="#000008" to="#0D1321" />
        <LandingDiagnosticOutput />
        <LandingMist from="#0D1321" to="#050810" />
        <LandingThreeNumbers />
        <LandingMist from="#050810" to="#070C14" />
        <LandingHowItWorks />
        <LandingDashboardDemo />
        <LandingGrowthBlueprint />
        <LandingMist from="#070C14" to="#050810" />
        <BeforeAfterSection />
        <LandingFinalCTA url={url} onUrlChange={setUrl} autoFocus={scanFocus} />
        <SiteFooter />
      </div>
    </div>
  );
}
