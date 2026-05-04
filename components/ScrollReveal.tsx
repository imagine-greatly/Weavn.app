"use client";

import { useRef } from "react";
import { motion, useInView, type Target } from "framer-motion";

/** DESIGN_SYSTEM / product spec: fast-out, snappy — not floaty */
const EASE_SNAPPY: [number, number, number, number] = [0.16, 1, 0.3, 1];

export type ScrollRevealVariant =
  | "headline"
  | "sub"
  | "card"
  | "list"
  | "demo"
  | "slide-left"
  | "slide-right";

type ScrollRevealProps = {
  variant: ScrollRevealVariant;
  children: React.ReactNode;
  /** Extra delay in seconds (stacked with variant defaults & stagger) */
  delay?: number;
  /** For `card` / `list`: index for stagger */
  index?: number;
  /** Card stagger step (default 0.07s); list default 0.05s */
  staggerStep?: number;
  className?: string;
};

export function ScrollReveal({
  variant,
  children,
  delay: delayProp,
  index = 0,
  staggerStep,
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  const duration = 0.55;
  let delay = delayProp ?? 0;

  if (variant === "sub" && delayProp === undefined) {
    delay = 0.1;
  }
  if (variant === "card") {
    delay = (delayProp ?? 0) + index * (staggerStep ?? 0.07);
  }
  if (variant === "list") {
    delay = (delayProp ?? 0) + index * (staggerStep ?? 0.05);
  }

  let initial: Target = { opacity: 0, y: 24 };
  let animate: Target = { opacity: 1, y: 0 };

  if (variant === "demo") {
    initial = { opacity: 0, y: 24, scale: 0.97 };
    animate = { opacity: 1, y: 0, scale: 1 };
  } else if (variant === "slide-left") {
    initial = { opacity: 0, x: -40, y: 0 };
    animate = { opacity: 1, x: 0, y: 0 };
  } else if (variant === "slide-right") {
    initial = { opacity: 0, x: 40, y: 0 };
    animate = { opacity: 1, x: 0, y: 0 };
  }

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={inView ? animate : initial}
      transition={{ duration, delay, ease: EASE_SNAPPY }}
      className={className}
      style={{ willChange: inView ? "auto" : "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
