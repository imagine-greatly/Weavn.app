"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";

/**
 * Docs page — technical reference for the WebDoc AI diagnostic platform.
 * Two-column: sticky sidebar + content. DESIGN_SYSTEM.md: typography, colors.
 */

type NavItem = { label: string; id: string; section: string };

const NAV: { section: string; items: { label: string; id: string }[] }[] = [
  {
    section: "GETTING STARTED",
    items: [
      { label: "Running your first diagnostic", id: "getting-your-first-scan" },
      { label: "WebDoc Score bands", id: "understanding-your-score" },
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
      { label: "Moving the WebDoc Score", id: "improving-your-score" },
    ],
  },
  {
    section: "ACCOUNT",
    items: [
      { label: "Scan history", id: "scan-history" },
      { label: "Sharing reports", id: "sharing-reports" },
      { label: "Billing", id: "billing" },
      { label: "Agency plan", id: "agency-plan" },
    ],
  },
];

const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items.map((i) => ({ ...i, section: g.section })));

const SCORE_RANGES = [
  { range: "0-39", label: "CRITICAL", color: "var(--red)", text: "Multiple high-impact findings. Conversion architecture is actively suppressing revenue; resolve in priority order." },
  { range: "40-59", label: "AT RISK", color: "var(--orange)", text: "Measurable revenue suppression detected. Address the top three findings first, then rescan." },
  { range: "60-79", label: "SUBOPTIMAL", color: "var(--cyan)", text: "Conversion architecture underperforms in one or more revenue dimensions. Remaining findings are lower suppression." },
  { range: "80-100", label: "OPTIMIZED", color: "var(--green)", text: "Minor suppression only. Resolve residual findings after higher-priority work elsewhere." },
];

const PRINCIPLES = [
  {
    name: "Loss Aversion",
    definition: "Losses weigh roughly twice as heavily as equivalent gains in decision-making.",
    applies: "Deadline and scarcity copy tied to a real constraint increases commitment when paired with a clear offer. WebDoc scores whether loss framing appears at the decision point without contradicting evidence on the page.",
    example: "Before: 'Get 20% off.' After: '20% off through Sunday — inventory closes at midnight UTC.'",
  },
  {
    name: "Social Proof",
    definition: "Observed peer behavior reduces uncertainty about the correct next step.",
    applies: "Logos, counts, and testimonials belong adjacent to the primary CTA and inside the first viewport when the decision happens there. WebDoc checks density and placement, not vanity metrics alone.",
    example: "Before: Empty hero. After: 'In use by 2,400 teams' plus one named quote above the fold.",
  },
  {
    name: "Cognitive Load Theory",
    definition: "Working memory caps how many distinct claims a visitor can process per screen.",
    applies: "Multiple competing headlines and CTAs split attention. WebDoc flags stacks that exceed a single primary claim plus one supporting line in the hero.",
    example: "Before: Five headlines and three buttons. After: One headline, one supporting line, one primary CTA.",
  },
  {
    name: "The 8-Second Rule",
    definition: "Orientation completes or fails inside the first eight seconds of page load.",
    applies: "The hero must state audience, offer, and next action without scrolling on desktop and primary mobile breakpoints. WebDoc flags feature-led, vague, or below-fold heroes.",
    example: "Before: 'We help businesses grow.' After: 'Diagnostic scan of your marketing site — URL in, ranked findings out in ninety seconds.'",
  },
  {
    name: "Benefit vs Feature Psychology",
    definition: "Buyers select outcomes; specifications support the outcome claim.",
    applies: "Feature-only heroes underperform outcome-led copy with one measurable promise. WebDoc compares headline semantics to the stated visitor job-to-be-done.",
    example: "Before: 'AI-powered analysis engine.' After: 'Ranked conversion suppressions with quoted evidence from your live pages.'",
  },
  {
    name: "Risk Reversal",
    definition: "Visible guarantees and exit terms raise willingness to commit.",
    applies: "Refund, trial, and cancellation language should sit within one click of the primary CTA. WebDoc scores missing risk-reversal text where the CTA requests payment or signup.",
    example: "Before: 'Buy now' with no policy link. After: 'Buy now — 30-day refund linked in the subline.'",
  },
  {
    name: "Authority Bias",
    definition: "Credentials and third-party validation transfer trust to the offer.",
    applies: "Press, certifications, and leadership bios need placement before the commitment step. WebDoc checks for authority markers in the first two viewports on key templates.",
    example: "Before: No markers. After: 'Featured in TechCrunch' with founder credential line and photo.",
  },
  {
    name: "The Mere Exposure Effect",
    definition: "Repeated, consistent claims increase recall and preference.",
    applies: "The core promise should recur at hero, mid-page, and pre-CTA anchors. WebDoc flags single-mention value props on long pages.",
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
      style={{ background: "var(--bg-base)", paddingTop: 64 }}
    >
      <div className="flex">
        {/* Sidebar — sticky 240px */}
        <aside
          className="sticky top-16 h-[calc(100vh-4rem)] w-[240px] shrink-0 overflow-y-auto border-r py-8 pl-6 pr-4"
          style={{ borderColor: "var(--border-default)" }}
        >
          <input
            type="search"
            placeholder="Search documentation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-6 w-full rounded border bg-transparent px-3 py-2 font-mono text-[13px] outline-none placeholder:font-mono"
            style={{
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <nav className="space-y-6">
            {filteredNav.map((group) => (
              <div key={group.section}>
                <p
                  className="font-mono text-[10px] uppercase"
                  style={{ color: "var(--text-muted)", letterSpacing: "2px", marginBottom: 8 }}
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
                          borderLeftColor: activeId === item.id ? "var(--cyan)" : "transparent",
                          color: activeId === item.id ? "var(--cyan)" : "var(--text-secondary)",
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
          <DocSection id="getting-your-first-scan" title="Running your first diagnostic" visible={visibleIds.has("getting-your-first-scan")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Enter your URL on the homepage. Select depth if prompted. Run diagnostic. No account is required for the first run.
            </p>
            <h3 className="mb-3 max-w-[min(36rem,100%)] font-sans font-extrabold" style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              URL hygiene
            </h3>
            <ul className="mb-6 list-disc space-y-2 pl-5 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              <li>Include the scheme: https://</li>
              <li>Start with the homepage; highest traffic and highest suppression surface area</li>
              <li>On fetch errors, toggle www. or apex to match the live canonical host</li>
            </ul>
            <h3 className="mb-3 max-w-[min(36rem,100%)] font-sans font-extrabold" style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Pages in scope
            </h3>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-default)", background: "var(--bg-card)" }}>
              <table className="w-full border-collapse font-mono text-[13px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <th className="p-3 text-left font-medium" style={{ color: "var(--text-primary)" }}>Page</th>
                    <th className="p-3 text-left font-medium" style={{ color: "var(--text-primary)" }}>Diagnostic focus</th>
                  </tr>
                </thead>
                <tbody style={{ color: "var(--text-secondary)" }}>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}><td className="p-3">Homepage</td><td className="p-3">Hero, messaging, primary CTA, trust signal architecture</td></tr>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}><td className="p-3">Pricing</td><td className="p-3">Offer clarity, commitment step count</td></tr>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}><td className="p-3">About</td><td className="p-3">Authority and credibility density</td></tr>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}><td className="p-3">Product/Service</td><td className="p-3">Outcome proof, purchase path continuity</td></tr>
                  <tr><td className="p-3">Blog/FAQ</td><td className="p-3">Search relevance signals, content depth</td></tr>
                </tbody>
              </table>
            </div>
          </DocSection>

          <DocSection id="understanding-your-score" title="WebDoc Score bands" visible={visibleIds.has("understanding-your-score")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              WebDoc Score (0–100) aggregates conversion architecture health across revenue dimensions. Each band maps to expected suppression level.
            </p>
            <div className="space-y-3">
              {SCORE_RANGES.map((r) => (
                <div
                  key={r.range}
                  className="rounded-lg border-l-4 p-4"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: r.color,
                    borderLeftWidth: 4,
                  }}
                >
                  <p className="font-mono text-[12px] font-medium uppercase" style={{ color: r.color }}>
                    {r.range}: {r.label}
                  </p>
                  <p className="mt-2 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
                    {r.text}
                  </p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="reading-your-report" title="Interpreting diagnostic findings" visible={visibleIds.has("reading-your-report")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              The diagnostic report orders content by revenue impact. Each block below maps to a UI region.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-sans font-extrabold" style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              WebDoc Score ring
            </h3>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              The top ring is the composite WebDoc Score across all revenue dimensions. Track this number across rescans to measure architectural movement.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-sans font-extrabold" style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Revenue dimension scores
            </h3>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Conversion Architecture, Trust Signals, Message Clarity, Traffic Readiness, and Technical Foundation each expose a bar and sub-score. The lowest bars indicate which dimension currently drives suppression.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-sans font-extrabold" style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Finding cards
            </h3>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Each card lists severity, cited principle, quoted evidence from your DOM, and a written resolution. Critical findings stay sorted by revenue impact at the top of the list.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-sans font-extrabold" style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Hero diagnostic rewrite
            </h3>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Pro includes an AI-generated hero rewrite constrained by the same finding set. Edit to match brand voice; the text is implementation-ready draft copy.
            </p>
            <h3 className="mb-2 max-w-[min(36rem,100%)] font-sans font-extrabold" style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 0.98, letterSpacing: "-0.5px" }}>
              Resolution summary
            </h3>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              A short ordered list of the highest-impact resolutions to ship first.
            </p>
          </DocSection>

          <DocSection id="critical-vs-warning-vs-passing" title="Severity bands" visible={visibleIds.has("critical-vs-warning-vs-passing")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Severity tags sequence work by suppression strength.
            </p>
            <p className="mb-4 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--red)" }}>Critical</strong> — Actively suppressing conversions. Immediate resolution required. Typical triggers include failed eight-second hero read and invisible or ambiguous primary CTAs.
            </p>
            <p className="mb-4 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--orange)" }}>High</strong> — Measurable revenue suppression detected. Resolve after critical items clear (e.g., weak social proof placement, thin meta description).
            </p>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--green)" }}>Low / clear</strong> — Minor suppression or a check that produced no finding. Defer work until higher-priority cards are closed; use clear states as internal benchmarks.
            </p>
          </DocSection>

          <DocSection id="psychology-principles-explained" title="Principles cited in findings" visible={visibleIds.has("psychology-principles-explained")}>
            <p className="mb-8 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              WebDoc attaches a named principle to each finding. Below are the eight most frequent citations and how they surface in a diagnostic scan.
            </p>
            <div className="space-y-10">
              {PRINCIPLES.map((p) => (
                <div key={p.name}>
                  <p className="font-mono text-[14px] font-medium" style={{ color: "var(--cyan)" }}>
                    {p.name}
                  </p>
                  <p className="mt-1 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
                    {p.definition}
                  </p>
                  <p className="mt-3 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
                    {p.applies}
                  </p>
                  <div
                    className="mt-3 rounded-lg border p-3 font-mono text-[13px]"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>Example: </span>
                    {p.example}
                  </div>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="how-to-prioritize-fixes" title="Prioritizing resolutions" visible={visibleIds.has("how-to-prioritize-fixes")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Ship Critical resolutions first, then High. Inside Critical, follow the report order; it is already sorted by revenue impact.
            </p>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Close one finding per deploy when possible: implement the top resolution, run a diagnostic scan, read the delta, then proceed. Isolated changes keep score movement attributable.
            </p>
          </DocSection>

          <DocSection id="how-hero-rewrites-work" title="How hero rewrites work" visible={visibleIds.has("how-hero-rewrites-work")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Pro outputs an AI-generated hero block tied to the active finding list (outcome-led headline, risk reversal, CTA clarity). The model does not invent findings; it responds only to flagged cards.
            </p>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Treat the block as draft copy. Align tone with brand guidelines. Cross-reference the principle string on each finding to see why the rewrite shifted specific phrases.
            </p>
          </DocSection>

          <DocSection id="implementing-suggestions" title="Implementing resolutions" visible={visibleIds.has("implementing-suggestions")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Each card ships a concrete resolution. Paste into CMS or code, or hand the text to an editor as a scoped brief.
            </p>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              After deployment, run another diagnostic scan to refresh WebDoc Score and verify the finding clears. Pro retains history for trend comparison.
            </p>
          </DocSection>

          <DocSection id="when-to-regenerate" title="When to regenerate" visible={visibleIds.has("when-to-regenerate")}>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Regenerate the hero rewrite when positioning, audience, or offer copy changes materially, or when you need an alternate phrasing. Each run re-binds to the latest finding set so output stays consistent with current suppression data.
            </p>
          </DocSection>

          <DocSection id="best-urls-to-scan" title="Recommended URLs" visible={visibleIds.has("best-urls-to-scan")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Queue homepage first, then pricing, about, and primary product or service URLs. Each diagnostic scan ingests up to five pages.
            </p>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Match the hostname pattern used in paid and organic entry (www versus apex) so the HTML matches visitor-facing infrastructure.
            </p>
          </DocSection>

          <DocSection id="site-types-explained" title="Site models" visible={visibleIds.has("site-types-explained")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              WebDoc classifies ecommerce, SaaS, service, local, and content sites, then applies model-specific weights so checks stay comparable within the archetype.
            </p>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              No manual model selection is required; inference uses page signals. A misclassified model still returns valid findings; emphasis strings may shift slightly.
            </p>
          </DocSection>

          <DocSection id="improving-your-score" title="Moving the WebDoc Score" visible={visibleIds.has("improving-your-score")}>
            <p className="mb-6 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Close Critical cards, then High. Rescan after each batch. Ten- to twenty-point moves are common once the top three to five findings ship.
            </p>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Outcome-led heroes, visible primary CTAs, and dense trust markers in the first viewport move the composite score fastest. Use cited principles as edit constraints, not decoration.
            </p>
          </DocSection>

          <DocSection id="scan-history" title="Scan history" visible={visibleIds.has("scan-history")}>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Pro lists every past diagnostic scan and reopens prior reports. Compare WebDoc Score before and after resolution batches.
            </p>
          </DocSection>

          <DocSection id="sharing-reports" title="Sharing reports" visible={visibleIds.has("sharing-reports")}>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Pro enables read-only public links to the full diagnostic report. Revoke links from account settings when access should terminate.
            </p>
          </DocSection>

          <DocSection id="billing" title="Billing" visible={visibleIds.has("billing")}>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Pro is $50 per month, billed monthly. Cancel in account settings; access persists through the paid period. Refunds apply only under the five-finding guarantee documented on the pricing page.
            </p>
          </DocSection>

          <DocSection id="agency-plan" title="Agency plan" visible={visibleIds.has("agency-plan")}>
            <p className="font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              The Agency plan is $150 per month and supports up to 10 active client site diagnostics. It includes the full diagnostic suite, enhanced diagnostic depth, priority scan queue, and client-ready shareable diagnostic reports. Full scan history is retained across all client sites.
            </p>
            <p className="mt-4 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              API access and white label report exports are in development and will be added to the Agency plan on release.
            </p>
            <p className="mt-4 font-sans text-[15px] leading-[1.8]" style={{ color: "var(--text-secondary)" }}>
              Upgrade to Agency from account settings or the pricing page. Cancel anytime — access continues through the end of the paid period.
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
        className="mb-4 max-w-[min(40rem,100%)] font-sans font-extrabold"
        style={{
          color: "var(--text-primary)",
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
