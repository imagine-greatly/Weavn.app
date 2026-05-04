"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Intersection ratio / margin — default "-60px 0px" bottom-ish reveal */
  rootMargin?: string;
  threshold?: number;
  /** Fire only once (default true) */
  once?: boolean;
};

/**
 * IntersectionObserver-based reveal flag for landing motion.
 * Pair with CSS transitions or framer-motion.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options: Options = {}) {
  const { rootMargin = "-60px 0px", threshold = 0, once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit) return;
        setInView(true);
        if (once) obs.disconnect();
      },
      { rootMargin, threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}
