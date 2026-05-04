"use client";

import type { CSSProperties, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export default function Card({ children, className = "", style }: CardProps) {
  return (
    <section
      className={`rounded border ${className}`}
      style={{
        borderColor: "rgba(0,200,255,0.14)",
        background: "rgba(7,12,20,0.6)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}
