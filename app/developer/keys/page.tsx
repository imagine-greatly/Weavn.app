"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const SM = "'Space Mono', 'Courier New', monospace";
const SG = "'Space Grotesk', sans-serif";

export default function KeysPage() {
  const router = useRouter();
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      // Check if user already has an active key
      const { data: existing } = await supabase
        .from("api_keys")
        .select("id, key_prefix")
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (existing) {
        setHasExistingKey(true);
        setLoading(false);
        return;
      }

      // First visit — generate key
      try {
        const res = await fetch("/api/developer/generate-key", { method: "POST" });
        if (!res.ok) throw new Error("Failed to generate key");
        const { key: newKey } = await res.json();
        setKey(newKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
      setLoading(false);
    }
    init();
  }, [router]);

  function handleCopy() {
    if (!key) return;
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: SM, fontSize: 13, color: "rgba(0,200,255,0.6)", letterSpacing: "0.15em" }}>
          GENERATING KEY...
        </p>
      </div>
    );
  }

  if (hasExistingKey) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
          <p style={{ fontFamily: SM, fontSize: 11, color: "rgba(0,200,255,0.5)", letterSpacing: "0.2em", marginBottom: 16 }}>
            API KEY ALREADY EXISTS
          </p>
          <p style={{ fontFamily: SG, fontSize: 16, color: "rgba(240,244,255,0.7)", marginBottom: 32 }}>
            You already have an active API key. For security, the full key cannot be recovered. Use the developer portal to manage or rotate your key.
          </p>
          <button
            onClick={() => router.push("/developer")}
            style={{ background: "#00C8FF", color: "#050810", border: "none", borderRadius: 4, padding: "12px 32px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", cursor: "pointer" }}
          >
            GO TO DEVELOPER PORTAL →
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: SM, fontSize: 13, color: "#ef4444" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#050810", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ maxWidth: 640, width: "100%" }}>
        {/* Header */}
        <p style={{ fontFamily: SM, fontSize: 11, color: "#00C8FF", letterSpacing: "0.2em", marginBottom: 8 }}>
          API KEY GENERATED
        </p>
        <h1 style={{ fontFamily: SG, fontSize: 32, fontWeight: 700, color: "#F0F4FF", marginBottom: 8 }}>
          Copy your API key now.
        </h1>
        <p style={{ fontFamily: SG, fontSize: 15, color: "rgba(240,244,255,0.55)", marginBottom: 40 }}>
          This is the only time your full key will be displayed. It cannot be recovered after you leave this page.
        </p>

        {/* Key display */}
        <div style={{ border: "1px solid rgba(0,200,255,0.3)", borderLeft: "3px solid #00C8FF", borderRadius: 4, padding: "24px", marginBottom: 24, background: "rgba(0,200,255,0.04)" }}>
          <p style={{ fontFamily: SM, fontSize: 11, color: "rgba(0,200,255,0.5)", letterSpacing: "0.15em", marginBottom: 12 }}>
            YOUR API KEY
          </p>
          <p style={{ fontFamily: SM, fontSize: 14, color: "#F0F4FF", wordBreak: "break-all", lineHeight: 1.6 }}>
            {key}
          </p>
        </div>

        {/* Warning */}
        <div style={{ border: "1px solid rgba(245,158,11,0.3)", borderLeft: "3px solid #f59e0b", borderRadius: 4, padding: "12px 16px", marginBottom: 32, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontFamily: SM, fontSize: 11, color: "#f59e0b", marginTop: 2 }}>⚠</span>
          <p style={{ fontFamily: SM, fontSize: 12, color: "rgba(245,158,11,0.8)", margin: 0, lineHeight: 1.6 }}>
            Store this key securely. Once you leave this page it cannot be shown again. Use the developer portal to rotate it if lost.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              background: copied ? "#22c55e" : "#00C8FF",
              color: "#050810",
              border: "none",
              borderRadius: 4,
              padding: "14px 24px",
              fontFamily: SM,
              fontSize: 12,
              letterSpacing: "0.15em",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {copied ? "COPIED ✓" : "COPY KEY"}
          </button>
          <button
            onClick={() => router.push("/developer")}
            style={{
              flex: 1,
              background: "transparent",
              color: "#00C8FF",
              border: "1px solid rgba(0,200,255,0.4)",
              borderRadius: 4,
              padding: "14px 24px",
              fontFamily: SM,
              fontSize: 12,
              letterSpacing: "0.15em",
              cursor: "pointer",
            }}
          >
            GO TO PORTAL →
          </button>
        </div>
      </div>
    </div>
  );
}
