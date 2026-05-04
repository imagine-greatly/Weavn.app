"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const CATEGORIES = [
  { name: "Messaging", score: 68 },
  { name: "Conversion", score: 72 },
  { name: "SEO", score: 85 },
  { name: "UX", score: 64 },
];

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export default function ScoreCard() {
  const totalScore = useCountUp(72, 900);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl border border-[#1C1C1F] bg-[#0E0E10] p-6 transition-colors hover:border-[rgba(0,229,255,0.3)]"
    >
      <h3 className="mb-1 text-xs font-medium tracking-[0.16em] text-[color:#4A4A55] uppercase">
        Website Health Score
      </h3>
      <p className="mb-8 font-score text-6xl text-[color:#F2F2F7]">
        <span className="pulse-cyan">{totalScore}</span>
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CATEGORIES.map((cat, i) => {
          const value = useCountUp(cat.score, 700 + i * 100);
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4, ease: "easeOut" }}
            >
              <p className="mb-2 text-xs font-medium text-[color:#8E8E9A]">
                {cat.name}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-[#1C1C1F]">
                <motion.div
                  className="h-full rounded-full bg-[#00E5FF]"
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.score}%` }}
                  transition={{ duration: 0.7, delay: 0.2 + i * 0.1 }}
                />
              </div>
              <p className="mt-1 font-score text-sm text-[color:#F2F2F7]">
                {value}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
