"use client";

import { useState, type CSSProperties } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const OUTLINE_BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "1px solid rgba(0,200,255,0.35)",
  color: "#00C8FF",
  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: "2px",
  textTransform: "uppercase",
  minHeight: 44,
  padding: "0 32px",
  borderRadius: 2,
  cursor: "pointer",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

const PRIMARY_BASE: CSSProperties = {
  ...OUTLINE_BASE,
  background: "#FFFFFF",
  border: "1px solid #FFFFFF",
  color: "#050810",
  minHeight: 50,
};

type UpgradeButtonProps = {
  label?: string;
  style?: CSSProperties;
  className?: string;
  variant?: "outline" | "primary";
  /** Dashboard tier to check out into. Defaults to "pro" (legacy behaviour). */
  plan?: string;
  /** Billing interval. Defaults to "month" (legacy behaviour). */
  interval?: "month" | "year";
};

export default function UpgradeButton({
  label = "UPGRADE TO PRO →",
  style,
  className,
  variant = "outline",
  plan = "pro",
  interval = "month",
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/auth?mode=signup";
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, interval }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        await res.text();
        throw new Error("Server error — please try again");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("[upgrade] Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const base = variant === "primary" ? PRIMARY_BASE : OUTLINE_BASE;

  return (
    <div>
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className={className}
        style={{
          ...base,
          opacity: loading ? 0.75 : 1,
          cursor: loading ? "not-allowed" : "pointer",
          ...style,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            if (variant === "primary") {
              e.currentTarget.style.background = "#F2F4F8";
              e.currentTarget.style.borderColor = "#F2F4F8";
            } else {
              e.currentTarget.style.background = "rgba(0,200,255,0.04)";
              e.currentTarget.style.borderColor = "#00C8FF";
              e.currentTarget.style.boxShadow = "0 0 14px rgba(0,200,255,0.2)";
            }
          }
        }}
        onMouseLeave={(e) => {
          if (variant === "primary") {
            e.currentTarget.style.background = "#FFFFFF";
            e.currentTarget.style.borderColor = "#FFFFFF";
          } else {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(0,200,255,0.35)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {loading ? "REDIRECTING..." : label}
      </button>
      {error ? (
        <p
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 11,
            color: "var(--red)",
            marginTop: 8,
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
