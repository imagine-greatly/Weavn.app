"use client";

import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
};

export default function SectionHeader({
  title,
  subtitle,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div>
        <h3
          className="font-body text-sm font-semibold uppercase"
          style={{ color: "rgba(0,200,255,0.9)", letterSpacing: "0.08em" }}
        >
          {title}
        </h3>
        {subtitle ? (
          <p
            className="mt-1 font-sans text-xs"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
