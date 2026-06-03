"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const SM = "'Space Mono', 'Courier New', monospace";
const SG = "'Space Grotesk', sans-serif";
const CYAN = "#00C8FF";
const BG = "#050810";
const CARD = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(240,244,255,0.4)";
const TEXT = "#F0F4FF";

const CURL_EXAMPLE = `curl -X POST https://webdocai.com/api/v1/scan \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`;

const JS_EXAMPLE = `const response = await fetch('https://webdocai.com/api/v1/scan', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: 'https://example.com' })
})
const data = await response.json()
console.log(data.score) // 54`;

const PY_EXAMPLE = `import requests
response = requests.post(
  'https://webdocai.com/api/v1/scan',
  headers={'Authorization': 'Bearer YOUR_API_KEY'},
  json={'url': 'https://example.com'}
)
print(response.json()['score']) # 54`;

type ApiKey = { id: string; key_prefix: string; scans_used: number; plan: string; active: boolean };
type UsageRow = { url: string; score: number | null; status: string; created_at: string; response_time_ms: number | null };
type Webhook = { id: string; url: string; active: boolean; created_at: string };

function formatTime(ms: number | null) {
  if (!ms) return "—";
  return ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function DeveloperPortal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [activeTab, setActiveTab] = useState<"curl" | "js" | "python">("curl");
  const [rotating, setRotating] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [showWebhookInput, setShowWebhookInput] = useState(false);
  const [keyMsg, setKeyMsg] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      // Fetch active API key
      const { data: keys } = await supabase
        .from("api_keys")
        .select("id, key_prefix, scans_used, plan, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      const key = keys?.[0] ?? null;
      setApiKey(key as ApiKey | null);

      if (key) {
        // Fetch last 10 usage rows for this key
        const { data: usageData } = await supabase
          .from("api_usage")
          .select("url, score, status, created_at, response_time_ms")
          .eq("api_key_id", key.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setUsage((usageData ?? []) as UsageRow[]);

        // Fetch webhooks via session-auth internal route
        const whRes = await fetch("/api/developer/webhooks");
        if (whRes.ok) {
          const { webhooks: whData } = await whRes.json();
          setWebhooks((whData ?? []) as Webhook[]);
        }
      }

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleRotate() {
    if (!confirm("Rotate your API key? Your current key will stop working immediately.")) return;
    setRotating(true);
    try {
      const res = await fetch("/api/developer/generate-key", { method: "DELETE" });
      if (!res.ok) throw new Error("Rotation failed");
      const { key } = await res.json();
      setKeyMsg(`New key (copy now): ${key}`);
      // Reload to get updated key info
      window.location.reload();
    } catch {
      setKeyMsg("Rotation failed. Try again.");
    }
    setRotating(false);
  }

  async function handleAddWebhook() {
    if (!newWebhookUrl) return;
    setAddingWebhook(true);
    try {
      const res = await fetch("/api/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newWebhookUrl }),
      });
      if (res.ok) {
        const wh = await res.json();
        setWebhooks(prev => [wh, ...prev]);
        setNewWebhookUrl("");
        setShowWebhookInput(false);
      }
    } catch { /* ignore */ }
    setAddingWebhook(false);
  }

  async function handleDeleteWebhook(id: string) {
    await fetch("/api/developer/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setWebhooks(prev => prev.filter(w => w.id !== id));
  }

  const codeMap = { curl: CURL_EXAMPLE, js: JS_EXAMPLE, python: PY_EXAMPLE };
  const maskKey = (prefix: string) => prefix + "••••••••••••••••••••";
  const scansUsed = apiKey?.scans_used ?? 0;
  const scansMax = 100;
  const pct = Math.min(100, (scansUsed / scansMax) * 100);

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: SM, fontSize: 12, color: "rgba(0,200,255,0.5)", letterSpacing: "0.15em" }}>LOADING...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: SM, fontSize: 13, color: MUTED, marginBottom: 24 }}>No API key found.</p>
          <button
            onClick={() => router.push("/developer/keys")}
            style={{ background: CYAN, color: BG, border: "none", borderRadius: 4, padding: "12px 28px", fontFamily: SM, fontSize: 12, letterSpacing: "0.15em", cursor: "pointer" }}
          >
            GENERATE API KEY →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontFamily: SM, fontSize: 11, color: CYAN, letterSpacing: "0.2em", marginBottom: 8 }}>DEVELOPER PORTAL</p>
          <h1 style={{ fontFamily: SG, fontSize: 36, fontWeight: 700, color: TEXT, margin: 0 }}>API Dashboard</h1>
        </div>

        {keyMsg && (
          <div style={{ border: "1px solid rgba(0,200,255,0.4)", borderLeft: "3px solid #00C8FF", borderRadius: 4, padding: "14px 20px", marginBottom: 32, background: "rgba(0,200,255,0.06)" }}>
            <p style={{ fontFamily: SM, fontSize: 12, color: CYAN, margin: 0, wordBreak: "break-all" }}>{keyMsg}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>

          {/* API Key card */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, background: CARD }}>
            <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.18em", marginBottom: 16 }}>API KEY</p>
            <div style={{ fontFamily: SM, fontSize: 14, color: TEXT, marginBottom: 8, wordBreak: "break-all" }}>
              {maskKey(apiKey.key_prefix)}
            </div>
            <p style={{ fontFamily: SM, fontSize: 11, color: "rgba(245,158,11,0.7)", marginBottom: 20 }}>
              ⚠ Your key is only shown once at creation
            </p>
            <button
              onClick={handleRotate}
              disabled={rotating}
              style={{
                background: "transparent",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 4,
                padding: "8px 18px",
                fontFamily: SM,
                fontSize: 11,
                letterSpacing: "0.12em",
                cursor: rotating ? "not-allowed" : "pointer",
                opacity: rotating ? 0.5 : 1,
              }}
            >
              {rotating ? "ROTATING..." : "REGENERATE KEY"}
            </button>
          </div>

          {/* Usage meter card */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, background: CARD }}>
            <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.18em", marginBottom: 16 }}>USAGE</p>
            <p style={{ fontFamily: SM, fontSize: 28, color: CYAN, marginBottom: 4 }}>
              {scansUsed}
              <span style={{ fontSize: 14, color: MUTED }}> scans</span>
            </p>
            <p style={{ fontFamily: SM, fontSize: 11, color: MUTED, marginBottom: 16 }}>total scans run</p>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 2, height: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: CYAN, borderRadius: 2, transition: "width 0.5s" }} />
            </div>
            <p style={{ fontFamily: SM, fontSize: 11, color: MUTED, marginTop: 8 }}>
              Plan: <span style={{ color: TEXT }}>{apiKey.plan.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Quick start */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, background: CARD, marginBottom: 24 }}>
          <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.18em", marginBottom: 20 }}>QUICK START</p>
          <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `1px solid ${BORDER}` }}>
            {(["curl", "js", "python"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab ? `2px solid ${CYAN}` : "2px solid transparent",
                  padding: "8px 20px",
                  fontFamily: SM,
                  fontSize: 12,
                  color: activeTab === tab ? CYAN : MUTED,
                  cursor: "pointer",
                  marginBottom: -1,
                }}
              >
                {tab === "js" ? "JavaScript" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <pre style={{
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            padding: "20px 24px",
            fontFamily: SM,
            fontSize: 13,
            color: TEXT,
            overflowX: "auto",
            margin: 0,
            lineHeight: 1.7,
          }}>
            {codeMap[activeTab]}
          </pre>
        </div>

        {/* Recent scans */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, background: CARD, marginBottom: 24 }}>
          <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.18em", marginBottom: 20 }}>RECENT SCANS</p>
          {usage.length === 0 ? (
            <p style={{ fontFamily: SM, fontSize: 13, color: MUTED }}>No scans yet. Make your first API call.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SM, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["URL", "SCORE", "STATUS", "TIME", "DATE"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: MUTED, fontWeight: 400, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usage.map((row, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid rgba(255,255,255,0.04)`, cursor: "default" }}
                    >
                      <td style={{ padding: "10px 12px", color: TEXT, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.url}
                      </td>
                      <td style={{ padding: "10px 12px", color: row.score !== null ? CYAN : MUTED }}>
                        {row.score ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: row.status === "success" ? "#22c55e" : "#ef4444" }}>
                        {row.status.toUpperCase()}
                      </td>
                      <td style={{ padding: "10px 12px", color: MUTED }}>
                        {formatTime(row.response_time_ms)}
                      </td>
                      <td style={{ padding: "10px 12px", color: MUTED, whiteSpace: "nowrap" }}>
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Webhooks */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 4, padding: 28, background: CARD }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.18em", margin: 0 }}>WEBHOOKS</p>
            <button
              onClick={() => setShowWebhookInput(!showWebhookInput)}
              style={{ background: "transparent", border: `1px solid rgba(0,200,255,0.4)`, borderRadius: 4, padding: "6px 14px", fontFamily: SM, fontSize: 11, color: CYAN, cursor: "pointer", letterSpacing: "0.1em" }}
            >
              + ADD WEBHOOK
            </button>
          </div>

          {showWebhookInput && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                type="url"
                placeholder="https://your-server.com/webhook"
                value={newWebhookUrl}
                onChange={e => setNewWebhookUrl(e.target.value)}
                style={{ flex: 1, background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "10px 14px", fontFamily: SM, fontSize: 12, color: TEXT, outline: "none" }}
              />
              <button
                onClick={handleAddWebhook}
                disabled={addingWebhook}
                style={{ background: CYAN, color: BG, border: "none", borderRadius: 4, padding: "10px 18px", fontFamily: SM, fontSize: 11, letterSpacing: "0.1em", cursor: addingWebhook ? "not-allowed" : "pointer", opacity: addingWebhook ? 0.5 : 1 }}
              >
                SAVE
              </button>
            </div>
          )}

          {webhooks.length === 0 ? (
            <p style={{ fontFamily: SM, fontSize: 13, color: MUTED }}>No webhooks registered.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {webhooks.map(wh => (
                <div key={wh.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <div>
                    <p style={{ fontFamily: SM, fontSize: 13, color: TEXT, margin: 0, marginBottom: 2 }}>{wh.url}</p>
                    <p style={{ fontFamily: SM, fontSize: 11, color: wh.active ? "#22c55e" : MUTED, margin: 0 }}>
                      {wh.active ? "ACTIVE" : "INACTIVE"} · {formatDate(wh.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, padding: "6px 12px", fontFamily: SM, fontSize: 11, color: "#ef4444", cursor: "pointer" }}
                  >
                    DELETE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
