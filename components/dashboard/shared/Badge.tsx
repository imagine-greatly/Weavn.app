"use client";

import type { ReactNode } from "react";

type BadgeVariant = "cyan" | "critical" | "warning" | "success" | "muted";
type BadgeSize = "sm" | "md";

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  cyan: {
    color: "rgba(0,200,255,0.85)",
    border: "1px solid rgba(0,200,255,0.35)",
    background: "rgba(0,200,255,0.06)",
  },
  critical: {
    color: "rgba(255,45,45,0.9)",
    border: "1px solid rgba(255,45,45,0.35)",
    background: "rgba(255,45,45,0.08)",
  },
  warning: {
    color: "rgba(255,149,0,0.9)",
    border: "1px solid rgba(255,149,0,0.35)",
    background: "rgba(255,149,0,0.08)",
  },
  success: {
    color: "rgba(0,255,135,0.9)",
    border: "1px solid rgba(0,255,135,0.35)",
    background: "rgba(0,255,135,0.08)",
  },
  muted: {
    color: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.04)",
  },
};

const SIZE_STYLES: Record<BadgeSize, React.CSSProperties> = {
  sm: { fontSize: 10, padding: "3px 7px", letterSpacing: "0.08em" },
  md: { fontSize: 11, padding: "4px 9px", letterSpacing: "0.08em" },
};

type BadgeProps = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  children: ReactNode;
};

export default function Badge({
  variant = "cyan",
  size = "sm",
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded font-mono uppercase ${className}`}
      style={{
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
      }}
    >
      {children}
    </span>
  );
}
