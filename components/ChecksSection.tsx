"use client";

import { ScrollReveal } from "@/components/ScrollReveal";

/**
 * 166 revenue checks — full scope of what webdoc analyzes.
 * Revenue-impact column order. Refer to DESIGN_SYSTEM.md.
 */

const COLUMNS: { title: string; accent: string; checks: string[] }[] = [
  {
    title: "REVENUE IMPACT",
    accent: "var(--red)",
    checks: [
      "Pain Recognition",
      "Loss Aversion Triggers",
      "Social Proof Depth",
      "Urgency Signals",
      "Trust Architecture",
    ],
  },
  {
    title: "MESSAGING",
    accent: "var(--orange)",
    checks: [
      "Hero Clarity",
      "Value Proposition",
      "Benefit vs Feature",
      "Objection Handling",
      "Emotional Resonance",
    ],
  },
  {
    title: "CONVERSION",
    accent: "var(--green)",
    checks: [
      "CTA Effectiveness",
      "Friction Mapping",
      "Form Anxiety",
      "Pricing Clarity",
      "Exit Intent Signals",
    ],
  },
  {
    title: "SEO",
    accent: "var(--cyan)",
    checks: [
      "Title Optimization",
      "Meta Signals",
      "Header Hierarchy",
      "Keyword Alignment",
      "Internal Links",
    ],
  },
  {
    title: "UX",
    accent: "rgba(0,200,255,0.6)",
    checks: [
      "Visual Hierarchy",
      "Readability Score",
      "Mobile Experience",
      "Navigation Clarity",
      "Page Flow",
    ],
  },
  {
    title: "PERFORMANCE",
    accent: "var(--text-muted)",
    checks: [
      "Load Speed",
      "Core Web Vitals",
      "Image Optimization",
      "Script Overhead",
      "Cache Health",
    ],
  },
];

function CheckRow({ label }: { label: string }) {
  return (
    <div
      className="group flex cursor-default items-center justify-between border-l transition-[background-color,border-color] duration-150"
      style={{
        padding: "10px 0 10px 12px",
        borderLeftWidth: 1,
        borderLeftColor: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(0,200,255,0.04)";
        e.currentTarget.style.borderLeftColor = "rgba(0,200,255,0.3)";
        const arrow = e.currentTarget.querySelector("[data-arrow]") as HTMLElement;
        if (arrow) arrow.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderLeftColor = "transparent";
        const arrow = e.currentTarget.querySelector("[data-arrow]") as HTMLElement;
        if (arrow) arrow.style.opacity = "0";
      }}
    >
      <span
        className="font-body text-[15px] transition-colors duration-150 group-hover:[color:var(--text-primary)]"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <span
        data-arrow
        className="shrink-0 font-mono text-sm transition-opacity duration-150"
        style={{ color: "var(--cyan)", opacity: 0 }}
      >
        →
      </span>
    </div>
  );
}

function CheckColumn({ title, accent, checks }: { title: string; accent: string; checks: string[] }) {
  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--bg-base)",
        padding: "0 24px 28px",
      }}
    >
      <div style={{ height: 2, width: "100%", background: accent, marginBottom: 12 }} />
      <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
        <div style={{ width: 6, height: 6, background: accent, flexShrink: 0 }} aria-hidden />
        <h3
          className="font-ui-label"
          style={{ color: "var(--cyan)", fontSize: "11px" }}
        >
          {title}
        </h3>
        <span
          className="font-mono text-[10px]"
          style={{
            color: "var(--cyan)",
            background: "rgba(0,200,255,0.08)",
            border: "1px solid rgba(0,200,255,0.2)",
            padding: "2px 6px",
            borderRadius: 2,
          }}
        >
          {checks.length}
        </span>
      </div>
      <div>
        {checks.map((check) => (
          <CheckRow key={check} label={check} />
        ))}
      </div>
    </div>
  );
}

export default function ChecksSection() {
  return (
    <section
      className="w-full py-[120px] px-6"
      style={{
        background:
          "repeating-linear-gradient(0deg, rgba(0,200,255,0.018) 0px, rgba(0,200,255,0.018) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(0,200,255,0.018) 0px, rgba(0,200,255,0.018) 1px, transparent 1px, transparent 40px), rgba(0,200,255,0.012)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* Section header */}
      <div className="mx-auto mb-16 max-w-[600px] text-center">
        <ScrollReveal variant="headline">
          <h2
            className="font-headline text-[48px] leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            166 revenue checks<span style={{ color: "var(--cyan)" }}>.</span>
            <br />
            6 categories<span style={{ color: "var(--cyan)" }}>.</span>
          </h2>
        </ScrollReveal>
      </div>

      {/* Grid */}
      <div
        className="mx-auto grid gap-px md:grid-cols-2 lg:grid-cols-6"
        style={{
          maxWidth: 1100,
          background: "var(--border-default)",
        }}
      >
        {COLUMNS.map((col, i) => (
          <ScrollReveal key={col.title} variant="card" index={i}>
            <CheckColumn title={col.title} accent={col.accent} checks={col.checks} />
          </ScrollReveal>
        ))}
      </div>

    </section>
  );
}
