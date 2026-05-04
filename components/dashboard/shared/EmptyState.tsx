"use client";

import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded border p-4 text-center ${className}`}
      style={{
        borderColor: "rgba(0,200,255,0.14)",
        background: "rgba(7,12,20,0.55)",
      }}
    >
      <h4
        className="font-body text-sm font-semibold uppercase"
        style={{ color: "rgba(0,200,255,0.86)", letterSpacing: "0.08em" }}
      >
        {title}
      </h4>
      {description ? (
        <p className="mt-2 font-sans text-xs" style={{ color: "rgba(255,255,255,0.68)" }}>
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
