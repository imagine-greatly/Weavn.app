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
import LiveDemoReport from "@/components/LiveDemoReport";
import LandingFullFinding from "@/components/landing/LandingFullFinding";
import LandingGrowthBlueprint from "@/components/landing/LandingGrowthBlueprint";
import LandingDiagnosticChecks from "@/components/landing/LandingDiagnosticChecks";
import { MistTransitionDown, MistTransitionUp } from "@/components/PageTransitions";

const LANDING_BG_BASE = "#050810";

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
        <LiveDemoReport />
        <LandingFullFinding />
        <LandingThreeNumbers />
        <MistTransitionDown />
        <LandingHowItWorks />
        <LandingDashboardDemo />
        <MistTransitionUp />
        <LandingGrowthBlueprint />
        <BeforeAfterSection />
        <LandingFinalCTA url={url} onUrlChange={setUrl} autoFocus={scanFocus} />
        <SiteFooter />
      </div>
    </div>
  );
}
