"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { AuditIssue } from "@/lib/types";

const SEVERITY_STYLES = {
  critical: "bg-[rgba(255,45,45,0.12)] text-[#FF2D2D] border-[rgba(255,45,45,0.3)]",
  warning: "bg-[rgba(255,149,0,0.12)] text-[#FF9500] border-[rgba(255,149,0,0.3)]",
  improve: "bg-[rgba(0,255,135,0.08)] text-[#00FF87] border-[rgba(0,255,135,0.3)]",
};

interface IssueDrawerProps {
  issue: AuditIssue | null;
  open: boolean;
  onClose: () => void;
}

export default function IssueDrawer({ issue, open, onClose }: IssueDrawerProps) {
  const hasExample = !!issue?.exampleCopy;

  function handleCopy() {
    if (!issue) return;
    const text = issue.exampleCopy ?? issue.howToFix;
    if (navigator.clipboard && text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  if (!issue) {
    return null;
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-[#1C1C1F] bg-[#070708] p-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <header className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium capitalize ${SEVERITY_STYLES[issue.severity as keyof typeof SEVERITY_STYLES]}`}
                >
                  {issue.severity}
                </span>
                <h2 className="text-lg font-semibold text-[color:#F2F2F7]">
                  {issue.title}
                </h2>
                <p className="text-xs text-[color:#4A4A55]">
                  {issue.category.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[#1C1C1F] p-1.5 text-[color:#8E8E9A] hover:text-[color:#F2F2F7]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-6 overflow-y-auto pr-1">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[color:#F2F2F7]">
                  Evidence
                </h3>
                <p className="text-sm text-[color:#8E8E9A]">
                  {issue.description}
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-[color:#F2F2F7]">
                  Why it matters
                </h3>
                <p className="text-sm text-[color:#8E8E9A]">
                  {issue.whyItMatters}
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-[color:#F2F2F7]">
                  How to fix it
                </h3>
                <p className="text-sm text-[color:#8E8E9A]">
                  {issue.howToFix}
                </p>
              </section>

              {hasExample && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-[color:#F2F2F7]">
                    Example improved copy
                  </h3>
                  <div className="rounded-xl border border-[#1C1C1F] bg-[#0E0E10] p-4 font-mono text-xs text-[color:#F2F2F7]">
                    {issue.exampleCopy}
                  </div>
                </section>
              )}
            </div>

            <div className="mt-6 flex justify-between gap-3 border-t border-[#1C1C1F] pt-4">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#00E5FF] px-4 text-sm font-semibold text-[#070708] hover:bg-[#00b8cc]"
              >
                Copy Fix
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#1C1C1F] px-4 text-sm font-medium text-[color:#8E8E9A] hover:text-[color:#F2F2F7]"
              >
                Mark as Done
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

