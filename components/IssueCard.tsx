"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { AuditIssue } from "@/lib/types";

const SEVERITY_STYLES = {
  critical: "bg-[rgba(255,45,45,0.12)] text-[#FF2D2D] border-[rgba(255,45,45,0.3)]",
  warning: "bg-[rgba(255,149,0,0.12)] text-[#FF9500] border-[rgba(255,149,0,0.3)]",
  improve: "bg-[rgba(0,255,135,0.08)] text-[#00FF87] border-[rgba(0,255,135,0.3)]",
};

interface IssueCardProps {
  issue: AuditIssue;
  onClick: () => void;
  index?: number;
}

export default function IssueCard({ issue, onClick, index = 0 }: IssueCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-[#1C1C1F] bg-[#0E0E10] p-5 transition-colors hover:border-[rgba(0,229,255,0.3)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize ${SEVERITY_STYLES[issue.severity]}`}
        >
          {issue.severity}
        </span>
        <ChevronRight className="h-4 w-4 text-[color:#4A4A55]" />
      </div>
      <h4 className="mb-2 text-lg font-semibold text-[color:#F2F2F7]">{issue.title}</h4>
      <p className="mb-4 text-sm text-[color:#8E8E9A]">{issue.description}</p>
      <p className="mb-4 text-xs text-[color:#4A4A55]">
        <span className="font-medium text-[color:#8E8E9A]">Why this matters:</span>{" "}
        {issue.whyItMatters}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="text-sm font-medium text-[#00E5FF] hover:text-[rgba(0,229,255,0.7)]"
      >
        View Fix
      </button>
    </motion.article>
  );
}
