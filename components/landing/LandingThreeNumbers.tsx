"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ScrollReveal } from "@/components/ScrollReveal";

const COLS = [
  {
    id: "8s",
    color: "var(--cyan)",
    bloom: "rgba(0,200,255,0.036)",
    label: "AVERAGE DECISION WINDOW",
    sub: "Time available before visitor orientation fails",
    from: 0,
    to: 8,
    decimals: 0,
    suffix: "s" as const,
  },
  {
    id: "73",
    color: "var(--orange)",
    bloom: "rgba(255,149,0,0.03)",
    label: "OF SITES FAIL ABOVE THE FOLD",
    sub: "Visitor exits before primary copy registers",
    from: 0,
    to: 73,
    decimals: 0,
    suffix: "%" as const,
  },
  {
    id: "23",
    color: "var(--green)",
    bloom: "rgba(0,255,135,0.03)",
    label: "CONVERSION LIFT RANGE",
    sub: "Measured delta after hero copy aligns with outcome-led diagnostics",
    from: 0,
    to: 2.3,
    decimals: 1,
    suffix: "×" as const,
  },
];

const COUNT_MS = 1200;

function StatColumn({
  c,
  active,
}: {
  c: (typeof COLS)[number];
  active: boolean;
}) {
  const { display } = useCountUp(c.from, c.to, {
    active,
    durationMs: COUNT_MS,
    decimals: c.decimals,
  });
  const valueText = `${display}${c.suffix}`;

  return (
    <div className="relative flex flex-col items-center text-center md:px-6">
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] z-0 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: c.bloom,
          filter: "blur(60px)",
          opacity: active ? 1 : 0.5,
          transition: "opacity 0.6s ease-out",
        }}
        aria-hidden
      />
      <div className="relative z-[1]">
        <p className="font-logo text-[72px] font-bold leading-none tabular-nums" style={{ color: c.color }}>
          {valueText}
        </p>
        <p
          className="mt-3 font-mono text-[11px] uppercase"
          style={{ color: "var(--text-muted)", letterSpacing: "2px" }}
        >
          {c.label}
        </p>
        <p className="mx-auto mt-2 max-w-[220px] font-sans text-[14px] font-light" style={{ color: "var(--text-secondary)" }}>
          {c.sub}
        </p>
      </div>
    </div>
  );
}

export default function LandingThreeNumbers() {
  const { ref, inView } = useScrollReveal<HTMLElement>({ threshold: 0.15 });

  return (
    <section ref={ref} className="relative overflow-hidden px-6 pt-[120px] pb-[60px]" style={{ background: "#050810" }}>
      <ScrollReveal variant="headline">
        <div className="mx-auto grid max-w-[800px] gap-10 md:grid-cols-3 md:gap-0">
          {COLS.map((c) => (
            <StatColumn key={c.id} c={c} active={inView} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
