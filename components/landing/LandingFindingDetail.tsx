"use client";

const spaceMono = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const spaceGrotesk = "var(--font-space-grotesk), sans-serif";
const orbitron = "var(--font-orbitron), ui-sans-serif, sans-serif";

const bodyCopy: React.CSSProperties = {
  fontFamily: spaceGrotesk,
  fontSize: 15,
  fontWeight: 400,
  color: "#E0E6FF",
  lineHeight: 1.75,
};

const monoSectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
  fontSize: 10,
  color: "#00C8FF",
  letterSpacing: "0.15em",
  marginBottom: 12,
  textTransform: "uppercase",
  fontWeight: 400,
};

function SectionDivider() {
  return (
    <div
      role="separator"
      aria-hidden
      style={{ width: "100%", height: 1, background: "#1A2035", marginTop: 48, marginBottom: 48 }}
    />
  );
}

const RESOLUTION_TIERS = [
  {
    key: "immediate",
    title: "Immediate",
    sub: "Executable today. No developer required.",
    body: "Move the 'Start Free Trial' button into the hero section using your CMS or page builder. In Webflow, drag the button component above the fold in the hero block. In Framer, reorder your hero stack. Confirm visibility at 375px on mobile before publishing.",
    time: "Est. time: 30–60 minutes",
    projectedImpact: "+18–24% click-through rate from hero on mobile",
    accent: "#00C8FF",
    titleColor: "#00C8FF",
    cardBorder: "#1A2035",
  },
  {
    key: "proper",
    title: "Proper",
    sub: "Correct long-term implementation.",
    body: "Restructure the hero to follow the Problem → Value → CTA sequence. Lead with the visitor's core pain point, follow with your specific outcome promise, then present the CTA as the logical resolution. Validate CTA visibility at 320px, 375px, and 768px without scroll.",
    time: "Est. time: 2–4 hours",
    projectedImpact: "+31% qualified trial starts in first session",
    accent: "#8899AA",
    titleColor: "#FFFFFF",
    cardBorder: "#1A2035",
  },
  {
    key: "advanced",
    title: "Advanced",
    sub: "What high-converting SaaS sites implement at scale.",
    body: "Implement a sticky CTA bar that follows the user on scroll. A/B test two hero CTA variants — one urgency-framed ('Start Free Trial — No Card Required') and one outcome-framed ('See Your First Report in 8 Seconds'). High-converting SaaS benchmarks show CTA within 480px of page top on 94% of sessions.",
    time: "Est. time: 1–2 weeks",
    projectedImpact: "+44% conversion across mobile and desktop cohorts",
    accent: "#1A2035",
    titleColor: "#8899AA",
    cardBorder: "#2A3048",
  },
] as const;

const ADVISOR_CHIPS = [
  "What is the fastest fix?",
  "How much revenue is this costing me?",
  "Show me a CTA copy example",
] as const;

const RELATED_FINDINGS = [
  {
    category: "cta-architecture",
    title: "CTA button copy is generic — does not state the specific outcome of clicking",
  },
  {
    category: "cta-architecture",
    title: "Mobile CTA tap target is below minimum size threshold on 3 core pages",
  },
] as const;

export default function LandingFindingDetail() {
  return (
    <div style={{ minHeight: "100vh", background: "#050810", position: "relative" }}>

      {/* Top chrome bar */}
      <div
        style={{
          background: "#080D18",
          borderBottom: "1px solid #0D1626",
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 0", minWidth: 200 }}>
          <span style={{ fontFamily: spaceMono, fontSize: 11, color: "#8899AA", letterSpacing: "0.02em" }}>
            ← BACK TO REPORT
          </span>
        </div>
        <div
          style={{
            flex: "1 1 auto",
            textAlign: "center",
            fontFamily: spaceMono,
            fontSize: 10,
            color: "#8899AA",
            letterSpacing: "0.02em",
          }}
        >
          saas-startup.com · Finding 03 of 14
        </div>
        <div
          style={{
            flex: "1 1 0",
            minWidth: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontFamily: spaceMono,
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: "0.08em",
              color: "#FFFFFF",
              background: "var(--red)",
              borderRadius: 2,
              padding: "2px 8px",
              textTransform: "uppercase",
            }}
          >
            CRITICAL
          </span>
          <span style={{ fontFamily: spaceMono, fontSize: 10, color: "#8899AA" }}>← PREV</span>
          <span style={{ fontFamily: spaceMono, fontSize: 10, color: "#8899AA" }}>NEXT →</span>
        </div>
      </div>

      <main
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "32px 40px 80px",
          boxSizing: "border-box",
        }}
      >

        {/* FINDING HEADER CARD */}
        <div
          style={{
            background: "rgba(7,12,20,0.97)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--red)",
            borderRadius: "0 16px 16px 0",
            overflow: "hidden",
            boxShadow: "inset 4px 0 20px rgba(255,45,45,0.1)",
            marginBottom: 40,
          }}
        >
          <div style={{ padding: "28px 32px 32px", background: "rgba(13,16,32,0.9)" }}>
            <h1
              style={{
                fontFamily: spaceGrotesk,
                fontWeight: 700,
                fontSize: 28,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                margin: "0 0 16px 0",
                letterSpacing: "-0.5px",
              }}
            >
              No hero CTA visible above the fold
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: spaceMono,
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: "1.5px",
                  color: "var(--red)",
                  background: "rgba(255,45,45,0.06)",
                  border: "1px solid rgba(255,45,45,0.25)",
                  borderRadius: 3,
                  padding: "2px 8px",
                }}
              >
                CRITICAL
              </span>
              <span
                style={{
                  fontFamily: spaceMono,
                  fontSize: 9,
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 3,
                  padding: "2px 8px",
                  letterSpacing: "1px",
                }}
              >
                cta-architecture
              </span>
              <span
                style={{
                  fontFamily: spaceMono,
                  fontSize: 9,
                  color: "var(--text-muted)",
                  border: "1px solid var(--border-default)",
                  borderRadius: 3,
                  padding: "2px 8px",
                  letterSpacing: "1px",
                }}
              >
                30–60 min
              </span>
              <span
                style={{
                  fontFamily: spaceMono,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "rgba(0,200,255,0.95)",
                  border: "1px solid rgba(0,200,255,0.25)",
                  borderRadius: 4,
                  padding: "4px 10px",
                  background: "rgba(0,200,255,0.06)",
                }}
              >
                Finding 03 — 14 Identified
              </span>
            </div>

            <p
              style={{
                margin: "6px 0 12px 0",
                fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                fontSize: 11,
                color: "#8899AA",
                letterSpacing: "0.06em",
                lineHeight: 1.45,
              }}
            >
              Finding 3 of 14 — Ranked #3 by revenue suppression impact
            </p>

            <span
              style={{
                fontFamily: spaceGrotesk,
                fontSize: 15,
                fontWeight: 500,
                color: "var(--red)",
                lineHeight: 1.55,
                maxWidth: 720,
                display: "block",
              }}
            >
              Revenue Suppression: Critical
            </span>

            <div style={{ marginTop: 16 }}>
              <a
                href="#resolution-protocol"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("landing-resolution-protocol")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                  fontSize: 11,
                  color: "#00C8FF",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                SKIP TO RESOLUTION
              </a>
            </div>
          </div>
        </div>

        {/* EVIDENCE */}
        <SectionDivider />
        <div>
          <div style={monoSectionLabel}>EVIDENCE</div>
          <blockquote
            style={{
              margin: 0,
              padding: "18px 22px 18px 24px",
              borderLeft: "3px solid #00C8FF",
              background: "rgba(0,200,255,0.06)",
              borderRadius: "0 10px 10px 0",
              boxShadow: "0 0 40px rgba(0,180,255,0.04)",
              fontStyle: "italic",
            }}
          >
            <span
              style={{
                display: "block",
                whiteSpace: "pre-wrap",
                fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                fontSize: 13,
                color: "#8899AA",
                lineHeight: 1.6,
              }}
            >
              {"Hero section contains product headline and subtext only. Primary CTA button ('Start Free Trial') detected at Y:1,340px. No actionable element exists within the first viewport on desktop (1080px) or mobile (844px). Scroll distance to CTA exceeds 2× the median device viewport height."}
            </span>
          </blockquote>
          <div
            style={{
              marginTop: 12,
              fontFamily: spaceMono,
              fontSize: 10,
              color: "#8899AA",
              letterSpacing: "0.04em",
            }}
          >
            Observed at: Homepage — saas-startup.com
          </div>
        </div>

        {/* DIAGNOSTIC ANALYSIS */}
        <SectionDivider />
        <div>
          <div style={monoSectionLabel}>DIAGNOSTIC ANALYSIS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>
              Visitors arriving on saas-startup.com complete an unconscious orientation scan within the first 2–4 seconds. During this window the brain is pattern-matching the page against known conversion contexts. When no action surface is present in the first viewport, the page is categorized as informational — and the visitor&apos;s intent to engage drops sharply before they ever reach the CTA.
            </p>
            <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>
              This is not a visibility problem. The CTA exists on the page. It is a sequencing failure: the offer is being made after the decision window has already closed for a large share of your traffic. Mobile visitors — who represent 61% of SaaS trial traffic on category benchmarks — face a scroll distance of more than twice their viewport height before reaching any conversion surface.
            </p>
            <div style={{ borderTop: "1px solid #1A2035", paddingTop: 20 }}>
              <div
                style={{
                  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                  fontSize: 11,
                  color: "rgba(0,200,255,0.7)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontWeight: 400,
                  marginBottom: 8,
                }}
              >
                CONVERSION MECHANISM
              </div>
              <p style={{ margin: 0, maxWidth: 820, ...bodyCopy }}>
                <span style={{ color: "#00C8FF", fontWeight: 500 }}>
                  Action Paralysis (Above-Fold Anchoring):{" "}
                </span>
                <span style={{ color: "#8899AA" }}>
                  Users form their initial intent to act — or not — within the first viewport. When no CTA is present at this anchoring point, the default cognitive response is inaction. Scroll behavior data confirms most users never recover this intent after the first viewport passes.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* REVENUE IMPACT */}
        <SectionDivider />
        <div>
          <div style={monoSectionLabel}>REVENUE IMPACT</div>
          <div
            style={{
              fontFamily: orbitron,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--red)",
              marginBottom: 16,
            }}
          >
            CRITICAL SUPPRESSION
          </div>
          <p
            style={{
              margin: "0 0 16px 0",
              fontFamily: spaceMono,
              fontSize: 12,
              color: "rgba(136,153,170,0.72)",
              lineHeight: 1.5,
              maxWidth: 820,
            }}
          >
            Every month this finding remains unresolved, suppression compounds — visitors who arrive with clear intent are exiting before any conversion surface is rendered.
          </p>
          <p
            style={{
              margin: "0 0 24px 0",
              fontFamily: spaceGrotesk,
              fontSize: 14,
              color: "#8899AA",
              lineHeight: 1.65,
              maxWidth: 820,
            }}
          >
            At this suppression level, an estimated 60–75% of first-visit visitors exit before reaching a primary conversion surface — meaning the majority of acquisition spend on saas-startup.com is generating traffic that never reaches an actionable state. Every day without a hero CTA above the fold compounds the cost: paid and organic visitors who arrive with clear purchase intent are instead reinforcing a disengagement pattern that grows progressively harder to reverse.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
            {[
              {
                label: "This site:",
                desc: "CTA at Y:1,340px — below fold on 97% of devices",
                w: "23%",
                c: "var(--red)" as const,
                shadow: "rgba(255,45,45,0.33)",
                stat: "~0% hero CTR",
                statColor: "var(--red)" as const,
              },
              {
                label: "High-converting benchmark:",
                desc: "CTA within first 480px — visible without scroll",
                w: "86%",
                c: "#00E676" as const,
                shadow: "#00E67655",
                stat: "~4–6% hero CTR",
                statColor: "#00E676" as const,
              },
            ].map((row) => (
              <div key={row.label}>
                <div style={{ fontFamily: spaceMono, fontSize: 10, color: "#8899AA", marginBottom: 6 }}>
                  {row.label}{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{row.desc}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 4,
                      background: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: row.w,
                        height: "100%",
                        borderRadius: 4,
                        background: row.c,
                        boxShadow: `0 0 12px ${row.shadow}`,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: spaceMono,
                      fontSize: 10,
                      color: row.statColor,
                      whiteSpace: "nowrap",
                      minWidth: 80,
                      opacity: 0.8,
                    }}
                  >
                    {row.stat}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESOLUTION PROTOCOL */}
        <SectionDivider />
        <div id="landing-resolution-protocol">
          <div style={monoSectionLabel}>RESOLUTION PROTOCOL</div>
          <p
            style={{
              margin: "0 0 24px 0",
              maxWidth: 820,
              fontFamily: spaceGrotesk,
              fontSize: 16,
              fontWeight: 400,
              color: "var(--text-primary)",
              lineHeight: 1.7,
            }}
          >
            Reposition the primary CTA above the fold. This is a single repositioning change — no copy rewrites, no design overhaul required. Move the &apos;Start Free Trial&apos; button into the hero section so it appears within the first viewport on both desktop and mobile.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 24 }}>
            {RESOLUTION_TIERS.map((tier) => (
              <div
                key={tier.key}
                style={{
                  position: "relative",
                  background: "#0A0F1E",
                  border: `1px solid ${tier.cardBorder}`,
                  borderRadius: 8,
                  padding: "20px 22px 20px 26px",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: tier.accent,
                    opacity: tier.key === "advanced" ? 1 : 0.9,
                  }}
                />
                <div
                  style={{
                    fontFamily: spaceGrotesk,
                    fontSize: 18,
                    fontWeight: 700,
                    color: tier.titleColor,
                    marginBottom: 4,
                  }}
                >
                  {tier.title}
                </div>
                <div style={{ fontFamily: spaceMono, fontSize: 10, color: "#8899AA", marginBottom: 12 }}>
                  {tier.sub}
                </div>
                <p style={{ margin: "0 0 12px 0", ...bodyCopy, lineHeight: 1.7 }}>{tier.body}</p>
                <div style={{ fontFamily: spaceMono, fontSize: 10, color: "var(--text-muted)" }}>
                  {tier.time}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: spaceMono,
                    fontSize: 10,
                    color: "#00C8FF",
                    letterSpacing: "0.04em",
                    opacity: 0.8,
                  }}
                >
                  ↑ {tier.projectedImpact}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,230,118,0.062)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            style={{
              width: "100%",
              maxWidth: 820,
              height: 48,
              borderRadius: 6,
              border: "1px solid #00E676",
              background: "transparent",
              color: "#00E676",
              fontFamily: "var(--font-space-mono), ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 400,
              cursor: "pointer",
            }}
          >
            Mark finding as resolved
          </button>
        </div>

        {/* AI ADVISOR */}
        <SectionDivider />
        <div
          style={{
            position: "relative",
            background: "rgba(5,8,16,0.98)",
            border: "1px solid rgba(0,200,255,0.2)",
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "var(--cyan-glow-active)",
            marginBottom: 48,
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.6), transparent)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />

          {/* Panel header */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid rgba(0,200,255,0.1)",
              background: "rgba(7,12,20,0.98)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  boxShadow: "0 0 8px rgba(0,200,255,0.6)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: spaceMono,
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "3px",
                  color: "var(--cyan)",
                }}
              >
                AI ADVISOR
              </span>
              <span style={{ fontFamily: spaceMono, fontSize: 9, color: "var(--text-muted)" }}>
                · on this issue
              </span>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: spaceMono,
                  fontSize: 8,
                  letterSpacing: "1.5px",
                  color: "rgba(255,255,255,0.2)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                }}
              >
                ADVISOR
              </div>
              <div
                style={{
                  maxWidth: "100%",
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "2px 12px 12px 12px",
                  background: "rgba(17,20,40,0.8)",
                  border: "1px solid var(--border-default)",
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  fontSize: 15,
                  fontWeight: 400,
                  color: "#FFFFFF",
                  lineHeight: 1.7,
                }}
              >
                This is your third-highest revenue suppression finding, and it&apos;s the fastest to resolve. The CTA positioning issue on saas-startup.com means you&apos;re losing qualified visitors before they reach any conversion surface — the majority of them on mobile. The Immediate fix takes under an hour and requires no developer. Start there: move the button into the hero, then validate on a 375px viewport. Let me know your stack and I can tell you exactly which element to move and where.
              </div>
            </div>
          </div>

          {/* Chips */}
          <div style={{ padding: "0 24px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ADVISOR_CHIPS.map((c, i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.3)";
                  e.currentTarget.style.color = "var(--cyan)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-default)",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontFamily: spaceMono,
                  fontSize: 9,
                  color: "var(--text-muted)",
                  transition: "all 150ms ease",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "16px 24px 24px",
              borderTop: "1px solid rgba(0,200,255,0.08)",
              background: "rgba(5,8,16,0.6)",
              flexShrink: 0,
            }}
          >
            <textarea
              placeholder="Ask the diagnostic advisor..."
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                minHeight: 88,
                maxHeight: 200,
                resize: "vertical",
                background: "rgba(17,20,40,0.8)",
                border: "1px solid var(--border-default)",
                borderRadius: 8,
                padding: "12px 16px",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: 14,
                color: "var(--text-primary)",
                outline: "none",
                lineHeight: 1.5,
                marginBottom: 12,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,200,255,0.35)";
                e.currentTarget.style.boxShadow = "0 0 40px rgba(0,180,255,0.06)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              type="button"
              disabled
              style={{
                width: "100%",
                height: 44,
                borderRadius: 8,
                background: "var(--bg-elevated)",
                border: "none",
                cursor: "not-allowed",
                color: "var(--text-muted)",
                fontFamily: spaceMono,
                fontSize: 11,
                letterSpacing: "2px",
                fontWeight: 700,
              }}
            >
              SEND
            </button>
          </div>
        </div>

        {/* RELATED DIAGNOSTIC FINDINGS */}
        <SectionDivider />
        <div style={{ paddingBottom: 48 }}>
          <div style={monoSectionLabel}>RELATED DIAGNOSTIC FINDINGS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {RELATED_FINDINGS.map((f, i) => (
              <div
                key={i}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.35)";
                  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,200,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                  background: "rgba(7,12,20,0.6)",
                  cursor: "pointer",
                  transition: "border-color 150ms ease, box-shadow 150ms ease",
                }}
              >
                <div
                  style={{
                    fontFamily: spaceMono,
                    fontSize: 8,
                    color: "var(--text-muted)",
                    letterSpacing: "1px",
                    marginBottom: 4,
                  }}
                >
                  {f.category}
                </div>
                <div
                  style={{
                    fontFamily: spaceGrotesk,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--cyan)",
                    lineHeight: 1.35,
                  }}
                >
                  {f.title}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
