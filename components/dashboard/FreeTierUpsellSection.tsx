"use client";

/**
 * Conversion-focused free-tier upsell — clinical futurism (DESIGN_SYSTEM.md).
 * Stripe: parent passes onUpgrade only (checkout flow unchanged).
 */

import { UPSELL_FALLBACK_LOCKED_TITLES } from "@/lib/dashboardUpsell";

const spaceMono = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const spaceGrotesk = "var(--font-space-grotesk), sans-serif";

const LOCKED_COUNT = 5;
const LOCKED_BORDER_CYCLE = ["#FF2D2D", "#FF6B00"] as const;

const FAKE_BLUR_BODY = {
  evidence:
    "Homepage hero lacks a primary conversion path above the fold. Elevated bounce on first paint without a clear next step.",
  cost: "Estimated 12–28% of qualified sessions exit before any micro-conversion.",
  resolution:
    "Replace feature-led copy with outcome-led headline and a singular CTA with risk reversal above the fold.",
};

export type FreeTierPersonalizedHeader =
  | {
      variant: "complete";
      domain: string;
      revenueScore: number;
      criticalIssues: number;
    }
  | { variant: "prompt" };

function LockIcon() {
  return (
    <svg width={16} height={20} viewBox="0 0 16 20" fill="none" aria-hidden>
      <path
        d="M4.5 9V5.5a3.5 3.5 0 0 1 7 0V9M3 9h10v9H3V9z"
        stroke="rgba(240,244,255,0.4)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonalizedHeaderBlock({ header }: { header: FreeTierPersonalizedHeader }) {
  const shell = {
    background: "rgba(0,200,255,0.03)",
    border: "1px solid rgba(0,200,255,0.12)",
    borderLeft: "3px solid #00C8FF",
    padding: "16px 24px",
    marginBottom: 32,
    borderRadius: 0,
  } as const;

  if (header.variant === "complete") {
    return (
      <div style={shell}>
        <div
          style={{
            fontFamily: spaceMono,
            fontSize: 8,
            letterSpacing: "0.25em",
            color: "rgba(0,200,255,0.6)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          REVENUE DIAGNOSTIC COMPLETE
        </div>
        <div
          style={{
            fontFamily: spaceMono,
            fontSize: 11,
            color: "#F0F4FF",
            lineHeight: 1.5,
          }}
        >
          {header.domain}
          <span style={{ color: "rgba(0,200,255,0.35)", margin: "0 0.35em" }}>·</span>
          Revenue Score: {header.revenueScore}/100
          <span style={{ color: "rgba(0,200,255,0.35)", margin: "0 0.35em" }}>·</span>
          {header.criticalIssues} critical{" "}
          {header.criticalIssues === 1 ? "finding" : "findings"} identified
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div
        style={{
          fontFamily: spaceMono,
          fontSize: 11,
          color: "#F0F4FF",
          lineHeight: 1.5,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#00C8FF",
            marginRight: 8,
            verticalAlign: "middle",
          }}
          aria-hidden
        />{" "}
        DIAGNOSTIC READY — Run your first revenue diagnostic below
      </div>
    </div>
  );
}

function PrimaryUnlockCTA({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onUpgrade}
        style={{
          background: "transparent",
          border: "1px solid #00C8FF",
          color: "#00C8FF",
          fontFamily: spaceMono,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          height: 44,
          padding: "0 32px",
          borderRadius: 2,
          cursor: "pointer",
          width: "auto",
          display: "block",
          margin: "0 auto",
          boxShadow: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,200,255,0.08)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(0,200,255,0.12)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        UPGRADE TO PRO DIAGNOSTIC →
      </button>
      <p
        style={{
          fontFamily: spaceMono,
          fontSize: 9,
          color: "rgba(240,244,255,0.3)",
          letterSpacing: "0.1em",
          marginTop: 12,
          textAlign: "center",
        }}
      >
        $50/month · Cancel anytime · Instant access
      </p>
    </>
  );
}

function SecondaryUnlockCTA({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      style={{
        background: "transparent",
        color: "#00C8FF",
        border: "1px solid #00C8FF",
        fontFamily: spaceMono,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        height: 44,
        padding: "0 32px",
        borderRadius: 2,
        width: "auto",
        display: "block",
        margin: "32px auto 0",
        cursor: "pointer",
        boxShadow: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(0,200,255,0.08)";
        e.currentTarget.style.boxShadow = "0 0 20px rgba(0,200,255,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      UPGRADE TO PRO DIAGNOSTIC →
    </button>
  );
}

function LockedFindingCard({
  title,
  borderColor,
  severityLabel,
}: {
  title: string;
  borderColor: string;
  severityLabel: "CRITICAL" | "HIGH";
}) {
  const sevBorder = severityLabel === "CRITICAL" ? "rgba(255,45,45,0.45)" : "rgba(255,107,0,0.4)";
  const sevColor = severityLabel === "CRITICAL" ? "#FF2D2D" : "#FF6B00";

  return (
    <article
      className="relative overflow-hidden"
      style={{
        maxHeight: 140,
        borderRadius: 0,
        background: "rgba(240,244,255,0.02)",
        border: "1px solid rgba(0,200,255,0.1)",
        borderLeft: `3px solid ${borderColor}`,
        marginBottom: 12,
        padding: "10px 14px",
        pointerEvents: "none",
      }}
    >
      <div
        className="relative"
        style={{
          filter: "blur(4px)",
          pointerEvents: "none",
          userSelect: "none",
          maxHeight: 120,
          overflow: "hidden",
        }}
        aria-hidden
      >
        <div className="flex flex-row flex-wrap items-center gap-1.5" style={{ marginBottom: 6 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 7,
              padding: "2px 6px",
              letterSpacing: "0.12em",
              background: "transparent",
              border: `1px solid ${sevBorder}`,
              color: sevColor,
              fontFamily: spaceMono,
            }}
          >
            {severityLabel}
          </div>
        </div>

        <h3
          style={{
            fontSize: 11,
            color: "#F0F4FF",
            margin: "0 0 8px 0",
            lineHeight: 1.3,
            fontFamily: spaceMono,
            fontWeight: 700,
          }}
        >
          {title}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <section>
            <div
              style={{
                fontSize: 7,
                color: "rgba(0,200,255,0.5)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 4,
                fontFamily: spaceMono,
              }}
            >
              EVIDENCE
            </div>
            <p
              style={{
                fontSize: 9,
                color: "rgba(240,244,255,0.72)",
                lineHeight: 1.5,
                margin: 0,
                fontFamily: spaceMono,
              }}
            >
              {FAKE_BLUR_BODY.evidence}
            </p>
          </section>
          <section>
            <div
              style={{
                fontSize: 7,
                color: "rgba(255,107,0,0.6)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 4,
                fontFamily: spaceMono,
              }}
            >
              REVENUE IMPACT
            </div>
            <p
              style={{
                fontSize: 9,
                color: "rgba(240,244,255,0.72)",
                lineHeight: 1.5,
                margin: 0,
                fontFamily: spaceMono,
              }}
            >
              {FAKE_BLUR_BODY.cost}
            </p>
          </section>
          <section
            style={{
              padding: "8px 10px",
              background: "rgba(240,244,255,0.03)",
              border: "1px solid rgba(0,200,255,0.08)",
              borderRadius: 0,
            }}
          >
            <div
              style={{
                fontSize: 7,
                color: "rgba(240,244,255,0.35)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 4,
                fontFamily: spaceMono,
              }}
            >
              RESOLUTION
            </div>
            <p
              style={{
                fontSize: 9,
                color: "rgba(240,244,255,0.55)",
                lineHeight: 1.5,
                margin: 0,
                fontFamily: spaceMono,
              }}
            >
              {FAKE_BLUR_BODY.resolution}
            </p>
          </section>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: 8, background: "rgba(5,8,16,0.08)" }}
        aria-hidden
      >
        <LockIcon />
        <span
          style={{
            fontFamily: spaceMono,
            fontSize: 8,
            letterSpacing: "0.2em",
            color: "rgba(240,244,255,0.4)",
            textTransform: "uppercase",
          }}
        >
          PRO DIAGNOSTIC ACCESS
        </span>
      </div>
    </article>
  );
}

export default function FreeTierUpsellSection({
  onUpgrade,
  personalizedHeader,
  lockedTitles,
  totalLeaks,
}: {
  onUpgrade: () => void;
  personalizedHeader: FreeTierPersonalizedHeader;
  lockedTitles: string[];
  totalLeaks: number;
}) {
  const titles = (() => {
    const out = lockedTitles.map((t) => t.trim()).filter(Boolean).slice(0, LOCKED_COUNT);
    for (const f of UPSELL_FALLBACK_LOCKED_TITLES) {
      if (out.length >= LOCKED_COUNT) break;
      if (!out.includes(f)) out.push(f);
    }
    let k = 0;
    while (out.length < LOCKED_COUNT) {
      out.push(UPSELL_FALLBACK_LOCKED_TITLES[k % UPSELL_FALLBACK_LOCKED_TITLES.length]!);
      k++;
    }
    return out.slice(0, LOCKED_COUNT);
  })();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 960,
        marginTop: 48,
        marginLeft: "auto",
        marginRight: "auto",
        paddingTop: 40,
        paddingBottom: 48,
        borderTop: "1px solid rgba(0,200,255,0.1)",
        background: "#050810",
        borderRadius: 0,
      }}
    >
      <div style={{ padding: "0 24px" }}>
        <PersonalizedHeaderBlock header={personalizedHeader} />

        <div className="relative" style={{ marginBottom: 0 }}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(0,200,255,0.02) 0%, transparent 70%)",
              borderRadius: 0,
            }}
            aria-hidden
          />
          <p
            style={{
              fontFamily: spaceMono,
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "#00C8FF",
              textTransform: "uppercase",
              margin: "0 0 8px 0",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00C8FF",
                marginRight: 8,
                flexShrink: 0,
              }}
              aria-hidden
            />
            {LOCKED_COUNT} DIAGNOSTIC FINDINGS REQUIRE PRO ACCESS
          </p>
          <p
            style={{
              fontFamily: spaceMono,
              fontSize: 9,
              color: "rgba(240,244,255,0.35)",
              textAlign: "center",
              margin: "0 0 20px 0",
              lineHeight: 1.5,
              position: "relative",
              zIndex: 1,
            }}
          >
            Pro diagnostic license includes all findings, revenue impact analysis, and exact resolutions.
          </p>
          <div style={{ position: "relative", zIndex: 1 }}>
            {titles.map((title, i) => (
              <LockedFindingCard
                key={`${i}-${title.slice(0, 32)}`}
                title={title}
                borderColor={LOCKED_BORDER_CYCLE[i % LOCKED_BORDER_CYCLE.length]!}
                severityLabel={i % 2 === 0 ? "CRITICAL" : "HIGH"}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: 1,
            background: "rgba(0,200,255,0.08)",
            margin: "28px 0 32px",
          }}
          aria-hidden
        />

        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
          <p
            style={{
              fontFamily: spaceGrotesk,
              fontSize: 26,
              fontWeight: 700,
              color: "#F0F4FF",
              margin: "0 0 8px 0",
              lineHeight: 1.2,
            }}
          >
            UPGRADE TO PRO DIAGNOSTIC
          </p>
          <p
            style={{
              fontFamily: spaceMono,
              fontSize: 11,
              color: "rgba(240,244,255,0.45)",
              lineHeight: 1.7,
              margin: "0 auto 12px auto",
              maxWidth: 440,
              textAlign: "center",
            }}
          >
            Full diagnostic access required.
          </p>
          <p
            style={{
              fontFamily: spaceMono,
              fontSize: 11,
              color: "rgba(240,244,255,0.45)",
              lineHeight: 1.7,
              margin: "0 auto 28px auto",
              maxWidth: 440,
              textAlign: "center",
            }}
          >
            Access all {totalLeaks} diagnostic findings with full evidence, revenue impact analysis, and exact resolutions.
          </p>
          <PrimaryUnlockCTA onUpgrade={onUpgrade} />
        </div>

        <div className="free-tier-upsell-feature-grid" style={{ margin: "48px 0 0" }}>
          {[
            {
              label: "UNLIMITED DIAGNOSTICS",
              desc: "Scan any website. Rescan after resolutions. Track WebDoc Score movement with every improvement.",
            },
            {
              label: "ALL DIAGNOSTIC FINDINGS",
              desc: "Every finding with full evidence, revenue impact analysis, and exact resolution protocol.",
            },
            {
              label: "CONVERSION-OPTIMIZED COPY",
              desc: "AI-generated rewrites for your highest-impact sections — built from your diagnostic findings, not templates.",
            },
            {
              label: "AI RESOLUTION ADVISOR",
              desc: "Ask anything about your site. The advisor retains your full diagnostic context and ranks what to resolve first.",
            },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                background: "rgba(240,244,255,0.025)",
                border: "1px solid rgba(0,200,255,0.1)",
                borderTop: "2px solid rgba(0,200,255,0.35)",
                borderRadius: 0,
                padding: "20px 18px",
              }}
            >
              <div
                style={{
                  fontFamily: spaceMono,
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "#F0F4FF",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                {c.label}
              </div>
              <p
                style={{
                  fontFamily: spaceMono,
                  fontSize: 10,
                  color: "rgba(240,244,255,0.5)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {c.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", paddingBottom: 8 }}>
          <SecondaryUnlockCTA onUpgrade={onUpgrade} />
        </div>
      </div>
    </div>
  );
}
