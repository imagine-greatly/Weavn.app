"use client";

import { useState } from "react";
import { useEffect, useRef } from "react";

/**
 * Shared URL input bar — hero and final CTA. DESIGN_SYSTEM.md: Tier 1/2/3 glow.
 */

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

type ScanUrlBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (normalizedUrl: string) => void;
  /** Optional: show analyzing state from parent (e.g. when navigating) */
  disabled?: boolean;
  /** Optional: continuous outer pulse on RUN DIAGNOSTICS button (e.g. Final CTA) */
  buttonPulse?: boolean;
  /** When true, focus the input on mount/update */
  autoFocus?: boolean;
  /** Optional override for default CTA label */
  buttonLabel?: string;
};

export default function ScanUrlBar({
  value,
  onChange,
  onSubmit,
  disabled = false,
  buttonPulse = false,
  autoFocus = false,
  buttonLabel = "RUN DIAGNOSTICS",
}: ScanUrlBarProps) {
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [barPulse, setBarPulse] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const analyzing = isAnalyzing || disabled;

  useEffect(() => {
    if (!autoFocus) return;
    if (disabled || isAnalyzing) return;
    // Delay to ensure layout is ready.
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 50);
    return () => clearTimeout(t);
  }, [autoFocus, disabled, isAnalyzing]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(value);
    if (!normalized) {
      setError("Please enter a website URL.");
      return;
    }
    try {
      new URL(normalized);
    } catch {
      setError("Please enter a valid URL.");
      return;
    }
    setError("");
    setIsAnalyzing(true);
    setBarPulse(true);
    setTimeout(() => setBarPulse(false), 300);
    setTimeout(() => {
      onSubmit(normalized);
    }, 800);
  }

  return (
    <div className="group relative w-full max-w-[600px]">
      <div
        className="absolute -inset-1 rounded-lg pointer-events-none group-focus-within:animate-[inputFocusPulse_2s_ease-in-out_infinite]"
        style={{
          background: "transparent",
          boxShadow: "var(--cyan-glow-soft)",
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="hero-bar-focus-within relative flex h-16 items-center rounded-md border transition-[border-color,box-shadow] duration-150"
        style={{
          background: "rgba(10,13,26,0.9)",
          border: barPulse
            ? "1px solid rgba(0,220,255,0.6)"
            : "1px solid var(--border-default)",
          boxShadow: barPulse ? "var(--cyan-glow-intense)" : undefined,
        }}
      >
        <span
          className="shrink-0 pl-5 font-mono text-[13px]"
          style={{ color: "var(--cyan)", opacity: 0.5 }}
        >
          &gt;_
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setError("");
          }}
          placeholder="https://yourwebsite.com"
          disabled={analyzing}
          className="hero-input min-w-0 flex-1 border-none bg-transparent px-3 font-mono text-[14px] outline-none placeholder:font-mono placeholder:text-[14px]"
          style={{ color: "var(--text-primary)" }}
          aria-label="Website URL"
        />
        <button
          type="submit"
          disabled={analyzing}
          className={`font-button mr-1.5 shrink-0 rounded py-3.5 px-5 text-xs transition-colors duration-150 hover:duration-150 disabled:opacity-90 ${buttonPulse ? "animate-[ctaButtonPulse_3s_ease-in-out_infinite]" : ""}`}
          style={{
            background: "var(--cyan)",
            color: "#050810",
            margin: "6px 6px 6px 0",
            ...(buttonPulse && { boxShadow: "0 0 20px rgba(0,200,255,0.3)" }),
          }}
          onMouseEnter={(e) => {
            if (analyzing) return;
            e.currentTarget.style.background = "#33D6FF";
            e.currentTarget.style.textShadow = "0 0 20px rgba(0,200,255,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--cyan)";
            e.currentTarget.style.textShadow = "none";
          }}
        >
          {analyzing ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block animate-spin" style={{ fontSize: 14 }}>⟳</span>
              ANALYZING...
            </span>
          ) : (
            buttonLabel
          )}
        </button>
      </form>
      {error && (
        <p className="font-ui-label mt-2" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
