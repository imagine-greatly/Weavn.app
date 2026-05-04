"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

type UseCountUpOptions = {
  /** Animate when true (e.g. section in view) */
  active: boolean;
  durationMs: number;
  /** Decimal places for display */
  decimals?: number;
  /** Optional formatter (e.g. suffix) */
  format?: (n: number) => string;
};

/**
 * Count from `from` to `to` when `active` becomes true (once per mount).
 */
export function useCountUp(from: number, to: number, { active, durationMs, decimals = 0, format }: UseCountUpOptions) {
  const [value, setValue] = useState(from);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      startedRef.current = false;
      setValue(from);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    let raf = 0;
    let cancelled = false;
    const start = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min((now - start) / durationMs, 1);
      const eased = easeOutCubic(t);
      const v = from + (to - from) * eased;
      const rounded =
        decimals > 0 ? Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals) : Math.round(v);
      setValue(rounded);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(to);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [active, from, to, durationMs, decimals]);

  const display = format ? format(value) : decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  return { value, display };
}
