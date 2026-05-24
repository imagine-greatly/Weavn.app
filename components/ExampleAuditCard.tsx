"use client";

import { motion } from "framer-motion";
import { AlertCircle, Search, MousePointer } from "lucide-react";

const exampleIssues = [
  {
    type: "Conversion Leak",
    description: "Your headline does not communicate a clear value proposition.",
    icon: AlertCircle,
  },
  {
    type: "SEO Issue",
    description: "No H1 tag detected on the landing page.",
    icon: Search,
  },
  {
    type: "UX Friction",
    description: "Primary CTA is below the fold.",
    icon: MousePointer,
  },
];

export default function ExampleAuditCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="rounded-2xl border border-[#1C1C1F] bg-[#0E0E10] p-6 transition-colors hover:border-[rgba(0,229,255,0.3)]"
    >
      <h3 className="mb-1 text-xs font-medium text-[color:#4A4A55] uppercase tracking-[0.16em]">
        Website Health Score
      </h3>
      <p className="mb-6 font-score text-5xl text-[color:#F2F2F7]">
        <span className="pulse-cyan">72</span>
        <span className="ml-2 align-middle text-2xl font-normal text-[color:#4A4A55]">
          / 100
        </span>
      </p>
      <div className="space-y-3">
        {exampleIssues.map((issue, i) => (
          <motion.div
            key={issue.type}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 * i, ease: "easeOut" }}
            className="rounded-xl border border-[#1C1C1F] bg-[#0E0E10] p-4"
          >
            <div className="mb-1 flex items-center gap-2">
              <issue.icon className="h-4 w-4 text-[#00E5FF]" />
              <span className="text-sm font-medium text-[color:#F2F2F7]">
                {issue.type}
              </span>
            </div>
            <p className="text-xs text-[color:#8E8E9A]">{issue.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
