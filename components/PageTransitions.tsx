"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function buildNumbers(count: number, seed: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const n = Math.floor((Math.sin((i + 1) * (seed + 2.17)) * 10000) % 101);
    return String(Math.abs(n));
  });
}

export function ProductDepthMistTransition() {
  return (
    <div aria-hidden className="relative h-[110px] w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, transparent 0%, var(--bg-surface) 100%)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[40px]"
        style={{ boxShadow: "0 -40px 80px rgba(0,0,0,0.4)" }}
      />
    </div>
  );
}

export function ProductSignalGridTransition() {
  return (
    <div aria-hidden className="relative h-[68px] w-full overflow-hidden">
      <style>{`
        @keyframes prodScanDot {
          0%   { left: 9%;  opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 1; }
          100% { left: 91%; opacity: 0; }
        }
      `}</style>
      <div className="absolute left-1/2 top-1/2 h-px w-[82%] -translate-x-1/2 -translate-y-1/2" style={{ background: "rgba(0,200,255,0.14)" }} />
      {[18, 34, 50, 66, 82].map((x, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2"
          style={{ left: `${x}%`, background: "rgba(0,200,255,0.28)" }}
        />
      ))}
      <div
        className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{
          background: "var(--cyan)",
          boxShadow: "0 0 6px rgba(0,200,255,0.6)",
          animation: "prodScanDot 4s linear infinite",
        }}
      />
    </div>
  );
}

export function ProductDiagnosticArcTransition() {
  return (
    <div aria-hidden className="relative h-[72px] w-full overflow-hidden">
      <style>{`
        @keyframes sigBarFade {
          0%, 100% { opacity: 0.1; }
          50%       { opacity: 0.32; }
        }
      `}</style>
      {(
        [
          [{ w: "11%", left: "8%"  }, { w: "7%",  left: "28%" }, { w: "13%", left: "50%" }, { w: "9%",  left: "74%" }],
          [{ w: "9%",  left: "14%" }, { w: "13%", left: "36%" }, { w: "7%",  left: "58%" }, { w: "11%", left: "78%" }],
          [{ w: "7%",  left: "6%"  }, { w: "11%", left: "32%" }, { w: "9%",  left: "54%" }, { w: "13%", left: "76%" }],
        ] as { w: string; left: string }[][]
      ).map((row, ri) => (
        <div key={ri} className="relative" style={{ marginTop: ri === 0 ? 12 : 6, height: 6 }}>
          {row.map((bar, bi) => (
            <div
              key={bi}
              className="absolute h-full rounded-sm"
              style={{
                left: bar.left,
                width: bar.w,
                background: "rgba(0,200,255,0.22)",
                animation: `sigBarFade ${2.4 + bi * 0.3}s ease-in-out ${(ri * 4 + bi) * 0.18}s infinite`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProductFunnelTransition() {
  return (
    <div aria-hidden className="relative h-[60px] w-full overflow-hidden">
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2" style={{ background: "rgba(0,200,255,0.1)" }} />
      <div
        className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full live-pulse"
        style={{ background: "var(--cyan)", boxShadow: "0 0 8px rgba(0,200,255,0.5)" }}
      />
    </div>
  );
}

export function PricingTickerTransition() {
  const left = useMemo(() => buildNumbers(40, 5), []);
  const right = useMemo(() => buildNumbers(40, 7), []);
  return (
    <div aria-hidden className="relative h-[80px] w-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
      <div className="mt-3 flex w-max whitespace-nowrap" style={{ animation: "scrollLeft 22s linear infinite" }}>
        {[...left, ...left].map((v, i) => (
          <span key={`l-${i}`} className="font-mono text-[11px]" style={{ marginRight: 20, letterSpacing: "3px", color: i % 2 ? "rgba(0,200,255,0.08)" : "rgba(0,200,255,0.2)" }}>
            {v}
          </span>
        ))}
      </div>
      <div className="mt-2 flex w-max whitespace-nowrap" style={{ animation: "scrollRight 16s linear infinite" }}>
        {[...right, ...right].map((v, i) => (
          <span key={`r-${i}`} className="font-mono text-[11px]" style={{ marginRight: 20, letterSpacing: "3px", color: i % 3 ? "rgba(0,200,255,0.12)" : "rgba(0,200,255,0.22)" }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PricingBarsTransition() {
  return (
    <div aria-hidden className="relative h-[72px] w-full overflow-hidden">
      <div className="mx-auto flex h-full max-w-[1000px] items-end gap-2 px-6">
        {[22, 36, 18, 45, 60, 31, 54, 26, 42].map((h, i) => (
          <div key={i} className="rounded-t-sm" style={{ height: h, flex: 1, background: i % 2 ? "rgba(0,200,255,0.08)" : "rgba(0,200,255,0.16)" }} />
        ))}
      </div>
    </div>
  );
}

export function PricingDottedBridgeTransition() {
  return (
    <div aria-hidden className="relative h-[56px] w-full overflow-hidden">
      <div
        className="absolute left-0 right-0 top-1/2 h-px"
        style={{ background: "repeating-linear-gradient(90deg, rgba(0,200,255,0.24) 0 4px, transparent 4px 14px)" }}
      />
    </div>
  );
}

export function PricingHaloTransition() {
  return (
    <div aria-hidden className="relative h-[84px] w-full overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(0,200,255,0.25)] live-pulse" />
      <div className="absolute left-1/2 top-1/2 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(0,200,255,0.1)]" />
      <div className="absolute left-1/2 top-1/2 h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(0,200,255,0.06)]" />
    </div>
  );
}

export function HowPipelineTransition() {
  return (
    <div aria-hidden className="relative h-[68px] w-full overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-px w-[82%] -translate-x-1/2 -translate-y-1/2" style={{ background: "rgba(0,200,255,0.16)" }} />
      {[10, 26, 42, 58, 74, 90].map((x, i) => (
        <div
          key={i}
          className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{
            left: `${x}%`,
            background: "rgba(0,200,255,0.3)",
            animation: `nodePulse ${1.3 + i * 0.12}s ease-in-out ${i * 0.08}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function HowPacketsTransition() {
  return (
    <div aria-hidden className="relative h-[80px] w-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
      {[0, 1, 2].map((row) => (
        <div key={row} className="relative mt-2 h-4">
          <div
            className="absolute h-1.5 w-[26%] rounded-sm"
            style={{
              left: row % 2 ? "74%" : "-26%",
              background: "rgba(0,200,255,0.22)",
              animation: `${row % 2 ? "packetRight" : "packetLeft"} ${6 + row}s linear infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function HowTraceTransition() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || run) return;
      setRun(true);
      obs.disconnect();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [run]);
  return (
    <div ref={ref} aria-hidden className="relative h-[54px] w-full overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-px w-[80%] -translate-x-1/2 -translate-y-1/2" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div
        className="absolute top-1/2 h-px w-[30%] -translate-y-1/2"
        style={{
          left: run ? "70%" : "-30%",
          background: "linear-gradient(90deg, transparent, var(--cyan), transparent)",
          transition: "left 1.4s ease-out",
        }}
      />
    </div>
  );
}

export function HowTargetTransition() {
  return (
    <div aria-hidden className="relative h-[86px] w-full overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(0,200,255,0.12)]" />
      <div className="absolute left-1/2 top-1/2 h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(0,200,255,0.2)] live-pulse" />
      <div className="absolute left-1/2 top-0 h-[30px] w-px -translate-x-1/2" style={{ background: "rgba(0,200,255,0.08)" }} />
      <div className="absolute bottom-0 left-1/2 h-[30px] w-px -translate-x-1/2" style={{ background: "rgba(0,200,255,0.08)" }} />
    </div>
  );
}
