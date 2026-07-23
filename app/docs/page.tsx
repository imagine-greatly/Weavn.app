"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import { BAND_HEX } from "@/lib/verdict";

/**
 * Docs page — technical reference for the Weavn AI diagnostic platform.
 * Two-column: sticky sidebar + content. DESIGN_SYSTEM.md: typography, colors.
 */

type NavItem = { label: string; id: string; section: string };

const NAV: { section: string; items: { label: string; id: string }[] }[] = [
  {
    section: "GETTING STARTED",
    items: [
      { label: "Running your first diagnostic", id: "getting-your-first-scan" },
      { label: "Weavn Score bands", id: "understanding-your-score" },
      { label: "Interpreting diagnostic findings", id: "reading-your-report" },
    ],
  },
  {
    section: "YOUR FINDINGS",
    items: [
      { label: "Severity bands", id: "critical-vs-warning-vs-passing" },
      { label: "Principles cited in findings", id: "psychology-principles-explained" },
      { label: "Prioritizing resolutions", id: "how-to-prioritize-fixes" },
    ],
  },
  {
    section: "THE AI REWRITE",
    items: [
      { label: "How hero rewrites work", id: "how-hero-rewrites-work" },
      { label: "Implementing resolutions", id: "implementing-suggestions" },
      { label: "When to regenerate", id: "when-to-regenerate" },
    ],
  },
  {
    section: "SCANNING TIPS",
    items: [
      { label: "Recommended URLs", id: "best-urls-to-scan" },
      { label: "Site models", id: "site-types-explained" },
      { label: "Moving the Weavn Score", id: "improving-your-score" },
    ],
  },
  {
    section: "ACCOUNT",
    items: [
      { label: "Scan history", id: "scan-history" },
      { label: "Sharing reports", id: "sharing-reports" },
      { label: "Billing", id: "billing" },
    ],
  },
];

const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items.map((i) => ({ ...i, section: g.section })));

// Canonical 3-band legend — sourced from lib/verdict (the single source of truth for
// score → band → color). Thresholds: red < 50, amber 50–69, green ≥ 70. Colors come
// from BAND_HEX, never a hardcoded 4th definition.
const SCORE_RANGES = [
  { range: "0–49", label: "HIGH UPSIDE", color: BAND_HEX.red, text: "Multiple high-impact findings. Conversion architecture is actively suppressing revenue; resolve in priority order." },
  { range: "50–69", label: "SOLID FOUNDATION", color: BAND_HEX.amber, text: "Measurable revenue suppression detected. Address the top findings first, then rescan." },
  { range: "70–100", label: "HIGHLY OPTIMIZED", color: BAND_HEX.green, text: "Minor suppression only. Resolve residual findings after higher-priority work elsewhere." },
];

const PRINCIPLES = [
  {
    name: "Loss Aversion",
    definition: "Losses weigh roughly twice as heavily as equivalent gains in decision-making.",
    applies: "Deadline and scarcity copy tied to a real constraint increases commitment when paired with a clear offer. Weavn scores whether loss framing appears at the decision point without contradicting evidence on the page.",
    example: "Before: 'Get 20% off.' After: '20% off through Sunday — inventory closes at midnight UTC.'",
  },
  {
    name: "Social Proof",
    definition: "Observed peer behavior reduces uncertainty about the correct next step.",
    applies: "Logos, counts, and testimonials belong adjacent to the primary CTA and inside the first viewport when the decision happens there. Weavn checks density and placement, not vanity metrics alone.",
    example: "Before: Empty hero. After: 'In use by 2,400 teams' plus one named quote above the fold.",
  },
  {
    name: "Cognitive Load Theory",
    definition: "Working memory caps how many distinct claims a visitor can process per screen.",
    applies: "Multiple competing headlines and CTAs split attention. Weavn flags stacks that exceed a single primary claim plus one supporting line in the hero.",
    example: "Before: Five headlines and three buttons. After: One headline, one supporting line, one primary CTA.",
  },
  {
    name: "The 8-Second Rule",
    definition: "Orientation completes or fails inside the first eight seconds of page load.",
    applies: "The hero must state audience, offer, and next action without scrolling on desktop and primary mobile breakpoints. Weavn flags feature-led, vague, or below-fold heroes.",
    example: "Before: 'We help businesses grow.' After: 'Diagnostic scan of your marketing site — URL in, ranked findings out — usually under two minutes.'",
  },
  {
    name: "Benefit vs Feature Psychology",
    definition: "Buyers select outcomes; specifications support the outcome claim.",
    applies: "Feature-only heroes underperform outcome-led copy with one measurable promise. Weavn compares headline semantics to the stated visitor job-to-be-done.",
    example: "Before: 'AI-powered analysis engine.' After: 'Ranked conversion suppressions with quoted evidence from your live pages.'",
  },
  {
    name: "Risk Reversal",
    definition: "Visible guarantees and exit terms raise willingness to commit.",
    applies: "Refund, trial, and cancellation language should sit within one click of the primary CTA. Weavn scores missing risk-reversal text where the CTA requests payment or signup.",
    example: "Before: 'Buy now' with no policy link. After: 'Buy now — 30-day refund linked in the subline.'",
  },
  {
    name: "Authority Bias",
    definition: "Credentials and third-party validation transfer trust to the offer.",
    applies: "Press, certifications, and leadership bios need placement before the commitment step. Weavn checks for authority markers in the first two viewports on key templates.",
    example: "Before: No markers. After: 'Featured in TechCrunch' with founder credential line and photo.",
  },
  {
    name: "The Mere Exposure Effect",
    definition: "Repeated, consistent claims increase recall and preference.",
    applies: "The core promise should recur at hero, mid-page, and pre-CTA anchors. Weavn flags single-mention value props on long pages.",
    example: "Before: Testimonial only in footer. After: Same quote repeated beside the hero and above the primary CTA.",
  },
];

function matchesSearch(text: string, search: string): boolean {
  if (!search.trim()) return true;
  return text.toLowerCase().includes(search.toLowerCase());
}

export default function DocsPage() {
  const [ctaUrl, setCtaUrl] = useState("");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(ALL_NAV_ITEMS[0]?.id ?? null);
  const contentRef = useRef<HTMLDivElement>(null);

  const filteredNav = useMemo(() => {
    if (!search.trim()) return NAV;
    return NAV.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          matchesSearch(item.label, search) || matchesSearch(group.section, search)
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  const visibleIds = useMemo(
    () => new Set(filteredNav.flatMap((g) => g.items.map((i) => i.id))),
    [filteredNav]
  );

  const firstVisibleId = useMemo(() => filteredNav[0]?.items[0]?.id ?? null, [filteredNav]);

  useEffect(() => {
    if (activeId && !visibleIds.has(activeId) && firstVisibleId) {
      setActiveId(firstVisibleId);
      const el = document.getElementById(firstVisibleId);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [visibleIds, activeId, firstVisibleId]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = e.target.getAttribute("id");
          if (id && visibleIds.has(id)) setActiveId(id);
        }
      },
      { root: null, rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    visibleIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visibleIds]);

  return (
    <div
      className="min-h-screen"
      style={{ background: "#050810", paddingTop: 64 }}
    >
      <div className="flex">
        {/* Sidebar — sticky 240px */}
        <aside
          className="sticky top-16 h-[calc(100vh-4rem)] w-[240px] shrink-0 overflow-y-auto border-r py-8 pl-6 pr-4"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          {/* API reference — the front door. This page is the dashboard/product docs (second door). */}
          <Link
            href="/docs/api"
            className="mb-4 block no-underline"
            style={{
              border: "1px solid rgba(157,140,255,0.4)",
              background: "rgba(157,140,255,0.06)",
              padding: "10px 12px",
            }}
          >
            <span className="block font-mono text-[10px] uppercase" style={{ color: "#9D8CFF", letterSpacing: "0.12em", marginBottom: 4 }}>
              API REFERENCE →
            </span>
            <span className="block font-mono text-[11px] leading-[1.5]" style={{ color: "#9398A8" }}>
              Building with the API? Full v1 endpoints + schema.
            </span>
          </Link>
          <p className="mb-3 font-mono text-[10px] uppercase" style={{ color: "#6E7587", letterSpacing: "2px" }}>
            DASHBOARD DOCS
          </p>
          <input
            type="search"
            placeholder="Search documentation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-6 w-full border bg-transparent px-3 py-2 font-mono text-[13px] outline-none placeholder:font-mono"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              color: "#E6E9EE",
            }}
          />
          <nav className="space-y-6">
            {filteredNav.map((group) => (
              <div key={group.section}>
                <p
                  className="font-mono text-[10px] uppercase"
                  style={{ color: "#6E7587", letterSpacing: "2px", marginBottom: 8 }}
                >
                  {group.section}
                </p>
                <ul className="space-y-0">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block border-l-2 py-2 pl-3 font-mono text-[13px] transition-colors"
                        style={{
                          borderLeftColor: activeId === item.id ? "#9D8CFF" : "transparent",
                          color: activeId === item.id ? "#9D8CFF" : "#9398A8",
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main
          ref={contentRef}
          className="min-h-screen flex-1 overflow-y-auto py-12 pr-8 pl-10"
          style={{ maxWidth: "min(880px, calc(100vw - 280px))" }}
        >
          {/* Front-door banner — API is the primary path; these are the dashboard/product docs. */}
          <div
            className="mb-12 flex flex-wrap items-center justify-between gap-4 border p-6"
            style={{ borderColor: "rgba(157,140,255,0.3)", background: "rgba(157,140,255,0.05)" }}
          >
            <div>
              <p className="font-mono text-[10px] uppercase" style={{ color: "#9D8CFF", letterSpacing: "0.18em", marginBottom: 8 }}>
                DASHBOARD & PRODUCT DOCS
              </p>
              <p className="font-body text-[15px] leading-[1.6]" style={{ color: "#9398A8", margin: 0, maxWidth: 520 }}>
                Using the Weavn dashboard? You&apos;re in the right place. Building with the API instead? The full v1 reference — endpoints, response schema, and error contract — lives in the API docs.
              </p>
            </div>
            <Link
              href="/docs/api"
              className="shrink-0 font-mono text-[12px] uppercase no-underline"
              style={{
                color: "#9D8CFF",
                border: "1px solid rgba(157,140,255,0.5)",
                background: "rgba(157,140,255,0.1)",
                padding: "11px 22px",
                letterSpacing: "0.08em",
              }}
            >
              Read the API reference →
            </Link>
          </div>

          <DocSection id="getting-your-first-scan" title="Running your first diagnostic" visible={visibleIds.has("getting-your-first-scan")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Enter your URL on the landing page. Select depth if prompted. Run diagnostic. No account is required for the first run.
            </p>
            <h3 className="mb-3 max-w-[min(36rem,100%)] font-display font-extrabold" style={{ color: "#E6E9EE", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              URL hygiene
            </h3>
            <ul className="mb-6 list-disc space-y-2 pl-5 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              <li>Include the scheme: https://</li>
              <li>Start with the landing page; highest traffic and highest suppression surface area</li>
              <li>On fetch errors, toggle www. or apex to match the live canonical host</li>
            </ul>
            <h3 className="mb-3 max-w-[min(36rem,100%)] font-display font-extrabold" style={{ color: "#E6E9EE", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Pages in scope
            </h3>
            <div className="overflow-x-auto border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0A0E18" }}>
              <table className="w-full border-collapse font-mono text-[13px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th className="p-3 text-left font-medium" style={{ color: "#E6E9EE" }}>Page</th>
                    <th className="p-3 text-left font-medium" style={{ color: "#E6E9EE" }}>Diagnostic focus</th>
                  </tr>
                </thead>
                <tbody style={{ color: "#9398A8" }}>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}><td className="p-3">Landing Page</td><td className="p-3">Hero, messaging, primary CTA, trust signal architecture</td></tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}><td className="p-3">Pricing</td><td className="p-3">Offer clarity, commitment step count</td></tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}><td className="p-3">About</td><td className="p-3">Authority and credibility density</td></tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}><td className="p-3">Product/Service</td><td className="p-3">Outcome proof, purchase path continuity</td></tr>
                  <tr><td className="p-3">Blog/FAQ</td><td className="p-3">Search relevance signals, content depth</td></tr>
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="understanding-your-score" title="Weavn Score bands" visible={visibleIds.has("understanding-your-score")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Weavn Score (0–100) aggregates conversion architecture health across revenue dimensions. Each band maps to expected suppression level.
            </p>
            <div className="space-y-3">
              {SCORE_RANGES.map((r) => (
                <div
                  key={r.range}
                  className="border-l-4 p-4"
                  style={{
                    background: "#0A0E18",
                    borderColor: r.color,
                    borderLeftWidth: 4,
                  }}
                >
                  <p className="font-mono text-[12px] font-medium uppercase" style={{ color: r.color }}>
                    {r.range}: {r.label}
                  </p>
                  <p className="mt-2 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="reading-your-report" title="Interpreting diagnostic findings" visible={visibleIds.has("reading-your-report")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              The diagnostic report orders content by revenue impact. Each block below maps to a UI region.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-display font-extrabold" style={{ color: "#E6E9EE", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Weavn Score ring
            </h3>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              The top ring is the composite Weavn Score across all revenue dimensions. Track this number across rescans to measure architectural movement.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-display font-extrabold" style={{ color: "#E6E9EE", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Revenue dimension scores
            </h3>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Conversion Architecture, Trust Signals, Message Clarity, Traffic Readiness, Technical Foundation, Objection Handling, and Offer Clarity each expose a bar and sub-score. The lowest bars indicate which dimension currently drives suppression.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-display font-extrabold" style={{ color: "#E6E9EE", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Finding cards
            </h3>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Each card lists severity, cited principle, quoted evidence from your DOM, and a written resolution. Critical findings stay sorted by revenue impact at the top of the list.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-display font-extrabold" style={{ color: "#E6E9EE", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Hero diagnostic rewrite
            </h3>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Pro includes an AI-generated hero rewrite constrained by the same finding set. Edit to match brand voice; the text is implementation-ready draft copy.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-display font-extrabold" style={{ color: "#E6E9EE", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Resolution summary
            </h3>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              A short ordered list of the highest-impact resolutions to ship first.
            </p>
          </DocSection>

          <DocSection id="critical-vs-warning-vs-passing" title="Severity bands" visible={visibleIds.has("critical-vs-warning-vs-passing")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Severity tags sequence work by suppression strength.
            </p>
            <p className="mb-4 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              <strong style={{ color: "#E8635F" }}>Critical</strong> — Actively suppressing conversions. Immediate resolution required. Typical triggers include failed eight-second hero read and invisible or ambiguous primary CTAs.
            </p>
            <p className="mb-4 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              <strong style={{ color: "#EFB23E" }}>High</strong> — Measurable revenue suppression detected. Resolve after critical items clear (e.g., weak social proof placement, thin meta description).
            </p>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              <strong style={{ color: "#00C48C" }}>Low / clear</strong> — Minor suppression or a check that produced no finding. Defer work until higher-priority cards are closed; use clear states as internal benchmarks.
            </p>
          </DocSection>

          <DocSection id="psychology-principles-explained" title="Principles cited in findings" visible={visibleIds.has("psychology-principles-explained")}>
            <p className="mb-8 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Weavn attaches a named principle to each finding. Below are the eight most frequent citations and how they surface in a diagnostic scan.
            </p>
            <div className="space-y-10">
              {PRINCIPLES.map((p) => (
                <div key={p.name}>
                  <p className="font-mono text-[14px] font-medium" style={{ color: "#E6E9EE" }}>
                    {p.name}
                  </p>
                  <p className="mt-1 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
                    {p.definition}
                  </p>
                  <p className="mt-3 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
                    {p.applies}
                  </p>
                  <div
                    className="mt-3 border p-3 font-mono text-[13px]"
                    style={{ background: "#0A0E18", borderColor: "rgba(255,255,255,0.08)", color: "#9398A8" }}
                  >
                    <span style={{ color: "#6E7587" }}>Example: </span>
                    {p.example}
                  </div>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="how-to-prioritize-fixes" title="Prioritizing resolutions" visible={visibleIds.has("how-to-prioritize-fixes")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Ship Critical resolutions first, then High. Inside Critical, follow the report order; it is already sorted by revenue impact.
            </p>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Close one finding per deploy when possible: implement the top resolution, run a diagnostic scan, read the delta, then proceed. Isolated changes keep score movement attributable.
            </p>
          </DocSection>

          <DocSection id="how-hero-rewrites-work" title="How hero rewrites work" visible={visibleIds.has("how-hero-rewrites-work")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Pro outputs an AI-generated hero block tied to the active finding list (outcome-led headline, risk reversal, CTA clarity). The model does not invent findings; it responds only to flagged cards.
            </p>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Treat the block as draft copy. Align tone with brand guidelines. Cross-reference the principle string on each finding to see why the rewrite shifted specific phrases.
            </p>
          </DocSection>

          <DocSection id="implementing-suggestions" title="Implementing resolutions" visible={visibleIds.has("implementing-suggestions")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Each card ships a concrete resolution. Paste into CMS or code, or hand the text to an editor as a scoped brief.
            </p>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              After deployment, run another diagnostic scan to refresh Weavn Score and verify the finding clears. Pro retains history for trend comparison.
            </p>
          </DocSection>

          <DocSection id="when-to-regenerate" title="When to regenerate" visible={visibleIds.has("when-to-regenerate")}>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Regenerate the hero rewrite when positioning, audience, or offer copy changes materially, or when you need an alternate phrasing. Each run re-binds to the latest finding set so output stays consistent with current suppression data.
            </p>
          </DocSection>

          <DocSection id="best-urls-to-scan" title="Recommended URLs" visible={visibleIds.has("best-urls-to-scan")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Queue landing page first, then pricing, about, and primary product or service URLs. Each diagnostic scan ingests the landing page and up to two additional subpages (Pro).
            </p>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Match the hostname pattern used in paid and organic entry (www versus apex) so the HTML matches visitor-facing infrastructure.
            </p>
          </DocSection>

          <DocSection id="site-types-explained" title="Site models" visible={visibleIds.has("site-types-explained")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Weavn classifies ecommerce, SaaS, service, local, and content sites, then applies model-specific weights so checks stay comparable within the archetype.
            </p>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              No manual model selection is required; inference uses page signals. A misclassified model still returns valid findings; emphasis strings may shift slightly.
            </p>
          </DocSection>

          <DocSection id="improving-your-score" title="Moving the Weavn Score" visible={visibleIds.has("improving-your-score")}>
            <p className="mb-6 font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Close Critical cards, then High. Rescan after each batch. Ten- to twenty-point moves are common once the top three to five findings ship.
            </p>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Outcome-led heroes, visible primary CTAs, and dense trust markers in the first viewport move the composite score fastest. Use cited principles as edit constraints, not decoration.
            </p>
          </DocSection>

          <DocSection id="scan-history" title="Scan history" visible={visibleIds.has("scan-history")}>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Pro lists every past diagnostic scan and reopens prior reports. Compare Weavn Score before and after resolution batches.
            </p>
          </DocSection>

          <DocSection id="sharing-reports" title="Sharing reports" visible={visibleIds.has("sharing-reports")}>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Pro enables read-only public links to the full diagnostic report. Revoke links from account settings when access should terminate.
            </p>
          </DocSection>

          <DocSection id="billing" title="Billing" visible={visibleIds.has("billing")}>
            <p className="font-body text-[15px] leading-[1.8]" style={{ color: "#9398A8" }}>
              Pro is $129 per month, billed monthly. Cancel in account settings; access persists through the paid period. Refunds apply only under the five-finding guarantee documented on the pricing page.
            </p>
          </DocSection>

        </main>
      </div>
      <LandingFinalCTA url={ctaUrl} onUrlChange={setCtaUrl} />
    </div>
  );
}

function DocSection({
  id,
  title,
  visible,
  children,
}: {
  id: string;
  title: string;
  visible: boolean;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2
        className="mb-4 max-w-[min(40rem,100%)] font-display font-extrabold"
        style={{
          color: "#E6E9EE",
          fontSize: "clamp(32px, 3.2vw, 44px)",
          lineHeight: 0.98,
          letterSpacing: "-1.2px",
          fontWeight: 800,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
