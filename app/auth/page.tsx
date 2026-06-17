"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { ReportPayload } from "@/lib/reportSchema";

type AuthTab = "signin" | "create";

const MONO = '"IBM Plex Mono", monospace';
const DISP = '"Space Grotesk", sans-serif';
const BODY = '"IBM Plex Sans", sans-serif';

// Locked design tokens (mirror tailwind.config.ts / lib/design-tokens.ts). Nothing
// on this page uses a color outside this set: base=background, blue=steel/dashboard
// surface, purple=API/developer surface, green=success-only, red=severity-only,
// ink/inkDim=neutral text shades, labelMuted=muted label text.
const C = {
  green:      "#00C48C",
  blue:       "#6F9BC6",
  purple:     "#9D8CFF",
  labelMuted: "#6E7587",
  base:       "#050810",
  red:        "#E8635F",
  ink:        "#E6E9EE",
  inkDim:     "#9398A8",
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidEmail(s: string): boolean {
  const t = s.trim();
  return t.includes("@") && t.includes(".");
}

function mapAuthErrorToCtaMessage(raw: string): string {
  const msg   = (raw || "").trim();
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials"))   return "Invalid credentials. Authentication failed.";
  if (lower.includes("user already registered"))     return "Account already exists. Sign in with access email.";
  if (
    lower.includes("password should be at least 8 characters") ||
    (lower.includes("password") && lower.includes("8") && lower.includes("characters"))
  ) return "Access key must be at least 8 characters.";
  return "Authentication request failed.";
}

// Post-auth STARTING workspace from the captured signup surface/plan. This only sets
// the initial workspace — it never restricts the other surface (both are always
// reachable via the persistent surface-switcher). Default when surface is absent: /app.
function resolvePostAuthDestination(): string {
  if (typeof sessionStorage === "undefined") return "/app";
  const surface = sessionStorage.getItem("auth_surface") || "";
  const plan = (sessionStorage.getItem("auth_plan") || "").toLowerCase();
  // Unambiguous API plans → Developers console. "enterprise" is intentionally omitted
  // (it exists on both surfaces); the surface param disambiguates, else we default to /app.
  const API_PLANS = ["dev", "builder", "scale"];
  if (surface === "api" || API_PLANS.includes(plan)) return "/console";
  return "/app";
}

function buildScanRedirect(): string {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)pendingUrl=([^;]*)/);
    if (match) {
      const raw = decodeURIComponent(match[1]);
      document.cookie = "pendingUrl=;path=/;max-age=0";
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return `/dashboard?url=${encodeURIComponent(normalized)}`;
    }
  }
  if (typeof sessionStorage !== "undefined") {
    const raw = sessionStorage.getItem("pendingUrl");
    if (raw) {
      sessionStorage.removeItem("pendingUrl");
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return `/dashboard?url=${encodeURIComponent(normalized)}`;
    }
  }
  // No pending scan → route to the workspace implied by the signup surface.
  return resolvePostAuthDestination();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.826.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p style={{ marginTop: 8, fontFamily: MONO, fontWeight: 400, fontSize: 11, color: C.red, lineHeight: 1.4 }}>
      {children}
    </p>
  );
}

// ── Page content ──────────────────────────────────────────────────────────────

function AuthPageContent() {
  const searchParams = useSearchParams();

  const initialTab: AuthTab = useMemo(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") return "create";
    const t = searchParams.get("tab");
    if (t === "create" || t === "signup") return "create";
    return "signin";
  }, [searchParams]);

  const [tab, setTab] = useState<AuthTab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [fullName,  setFullName]  = useState("");
  const [showPw,    setShowPw]    = useState(false);

  const [emailError,    setEmailError]    = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [globalError,   setGlobalError]   = useState<string | null>(null);

  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [googleError,    setGoogleError]    = useState<string | null>(null);
  const [isGoogleLoading,setIsGoogleLoading]= useState(false);
  const [signupEmailSent,setSignupEmailSent]= useState(false);
  const [pendingDomain,  setPendingDomain]  = useState<string | null>(null);

  const surface = searchParams.get("surface") || "dashboard";

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem("auth_surface", surface);
    const plan = searchParams.get("plan");
    if (plan) sessionStorage.setItem("auth_plan", plan);
  }, [surface, searchParams]);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    const raw = sessionStorage.getItem("pendingUrl");
    if (!raw) return;
    document.cookie = `pendingUrl=${encodeURIComponent(raw)};path=/;max-age=300`;
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      setPendingDomain(u.hostname.replace(/^www\./, ""));
    } catch {
      setPendingDomain(raw);
    }
  }, []);

  const resetFormState = useCallback(() => {
    setEmail(""); setPassword(""); setFullName(""); setShowPw(false);
    setGlobalError(null); setEmailError(null); setPasswordError(null); setFullNameError(null);
  }, []);

  const switchTab = useCallback((next: AuthTab) => {
    if (next === tab) return;
    setTab(next);
    resetFormState();
  }, [tab, resetFormState]);

  // ── Handlers (unchanged) ──────────────────────────────────────────────────

  async function handleSignIn() {
    setGlobalError(null); setEmailError(null); setPasswordError(null);
    const em = email.trim();
    if (!em)               { setEmailError("Access email required."); return; }
    if (!isValidEmail(em)) { setEmailError("Invalid access email format."); return; }
    if (password.length < 8) { setPasswordError("Access key must be at least 8 characters."); return; }
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) {
        const msg = error?.message ?? "";
        if      (msg.includes("Invalid login credentials")) setGlobalError("Invalid credentials. Authentication failed.");
        else if (msg.includes("Email not confirmed"))       setGlobalError("Account not found. Verify access email.");
        else if (msg.includes("Too many requests"))         setGlobalError("Authentication rate limit reached. Retry shortly.");
        else if (msg)                                       setGlobalError(msg);
        else                                                setGlobalError("Authentication request failed.");
        setIsSubmitting(false);
        return;
      }
      setTimeout(() => {
        const next = searchParams.get("next");
        window.location.replace(next ?? buildScanRedirect());
      }, 800);
    } catch (caught: unknown) {
      const msg = caught instanceof Error ? caught.message : "";
      if      (msg.includes("Invalid login credentials")) setGlobalError("Invalid credentials. Authentication failed.");
      else if (msg.includes("Email not confirmed"))       setGlobalError("Account not found. Verify access email.");
      else if (msg.includes("Too many requests"))         setGlobalError("Authentication rate limit reached. Retry shortly.");
      else if (msg)                                       setGlobalError(msg);
      else                                                setGlobalError("Authentication request failed.");
      setIsSubmitting(false);
    }
  }

  async function savePendingReportIfAny(userId: string) {
    const raw = localStorage.getItem("pending_report");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { domain?: string; payload?: ReportPayload };
      const domain  = String(parsed.domain ?? "");
      const payload = parsed.payload ?? null;
      if (!domain || !payload) return;
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("reports").insert({ domain, payload, user_id: userId });
      if (error) console.warn("Failed to save pending report:", error); // eslint-disable-line no-console
    } catch (e) {
      console.warn("Invalid pending_report payload:", e); // eslint-disable-line no-console
    }
    localStorage.removeItem("pending_report");
  }

  async function handleCreateAccount() {
    setGlobalError(null); setEmailError(null); setPasswordError(null); setFullNameError(null);
    const em = email.trim();
    if (!em)               { setEmailError("Access email required."); return; }
    if (!isValidEmail(em)) { setEmailError("Invalid access email format."); return; }
    if (!fullName.trim())  { setFullNameError("Operator name required."); return; }
    if (password.length < 8) { setPasswordError("Access key must be at least 8 characters."); return; }
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: em, password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) {
        setGlobalError(mapAuthErrorToCtaMessage(String(error.message ?? "")));
        setIsSubmitting(false);
        return;
      }
      const userId = data?.user?.id;
      if (!userId) { setGlobalError("Authentication request failed."); setIsSubmitting(false); return; }
      const { error: profileError } = await supabase
        .from("profiles").upsert({ id: userId, plan: "free" }, { onConflict: "id" });
      if (profileError) console.warn("Failed to create profile:", profileError); // eslint-disable-line no-console
      if (localStorage.getItem("pending_report")) await savePendingReportIfAny(userId);
      try {
        await fetch("/api/auth/provision-key", { method: "POST", credentials: "include" });
      } catch (err) {
        console.warn("[signup] provision-key failed:", err); // eslint-disable-line no-console
      }
      if (data?.session) {
        setTimeout(() => {
          const next = searchParams.get("next");
          // surface=api → /console, dashboard/none → /app (buildScanRedirect also
          // honors a pending scan URL). Replaces the old /playground landing.
          window.location.replace(next ?? buildScanRedirect());
        }, 800);
      } else {
        setSignupEmailSent(true);
        setIsSubmitting(false);
      }
    } catch {
      setGlobalError("Authentication request failed.");
      setIsSubmitting(false);
    }
  }

  // ── Input style helpers ───────────────────────────────────────────────────

  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: C.base,
    border: "0.5px solid rgba(111,155,198,0.2)",
    boxShadow: "none", borderRadius: 0,
    padding: "12px 16px",
    color: "#E6E9EE", fontFamily: MONO, fontWeight: 400, fontSize: 13,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const labelStyle: CSSProperties = {
    display: "block", fontFamily: MONO, fontSize: 10, fontWeight: 400,
    color: C.labelMuted, marginBottom: 6,
    letterSpacing: "0.15em", textTransform: "uppercase" as const,
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border     = "0.5px solid rgba(111,155,198,0.55)";
    e.currentTarget.style.boxShadow  = "0 0 0 3px rgba(111,155,198,0.08), 0 0 20px rgba(111,155,198,0.06)";
    e.currentTarget.style.outline    = "none";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border    = "0.5px solid rgba(111,155,198,0.2)";
    e.currentTarget.style.boxShadow = "none";
  };

  const isCreate = tab === "create";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .auth-input::placeholder { color: #6E7587; font-family: "IBM Plex Mono", monospace; font-size: 12px; opacity: 1; }
        @keyframes authPulseDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @media (max-width: 767px) {
          .auth-grid       { grid-template-columns: 1fr !important; }
          .auth-form       { order: -1 !important; }
          .auth-engine     { border-right: none !important; border-top: 0.5px solid rgba(157,140,255,0.15) !important; padding: 40px 22px !important; }
          .auth-form-panel { padding: 40px 22px !important; }
        }
      `}</style>

      <div
        className="auth-grid"
        style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", minHeight: "100vh", background: C.base }}
      >

        {/* ══════════════════════════════════════════════════════════════════
            LEFT PANEL — THE ENGINE (purple-leaning, ~61%). Illustrative only —
            these doors depict the architecture; they are NOT navigation.
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="auth-engine"
          style={{
            position: "relative",
            overflow: "hidden",
            background: C.base,
            borderRight: "0.5px solid rgba(157,140,255,0.15)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "56px 56px",
          }}
        >
          {/* Content-anchored purple bloom behind the lower-middle (two-stop fade to bg) */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
            background: "radial-gradient(ellipse 640px 540px at 50% 70%, rgba(157,140,255,0.11) 0%, rgba(5,8,16,0) 60%)",
          }} />

          {/* Purple corner brackets (1px) — all four corners */}
          {[
            { top: 22,    left: 22,  borderTop: "1px solid rgba(157,140,255,0.3)",    borderLeft:  "1px solid rgba(157,140,255,0.3)" },
            { top: 22,    right: 22, borderTop: "1px solid rgba(157,140,255,0.3)",    borderRight: "1px solid rgba(157,140,255,0.3)" },
            { bottom: 22, left: 22,  borderBottom: "1px solid rgba(157,140,255,0.3)", borderLeft:  "1px solid rgba(157,140,255,0.3)" },
            { bottom: 22, right: 22, borderBottom: "1px solid rgba(157,140,255,0.3)", borderRight: "1px solid rgba(157,140,255,0.3)" },
          ].map((s, i) => (
            <div key={i} aria-hidden style={{ position: "absolute", width: 16, height: 16, pointerEvents: "none", ...s }} />
          ))}

          {/* Engine content (centered column) */}
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560, margin: "0 auto" }}>

            {/* Kicker */}
            <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.28em", color: C.labelMuted, margin: "0 0 18px" }}>
              THE ENGINE
            </p>

            {/* Terminal request panel */}
            <div style={{ border: "0.5px solid rgba(157,140,255,0.25)", background: "rgba(157,140,255,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "0.5px solid rgba(157,140,255,0.18)" }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.purple, letterSpacing: "0.04em" }}>POST /v1/scan</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.labelMuted }}>~90s</span>
              </div>
              <div style={{ padding: "16px 18px", fontFamily: MONO, fontSize: 12.5, lineHeight: 1.7 }}>
                <div style={{ color: C.labelMuted }}>{"{"}</div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: C.purple }}>{'"url"'}</span>
                  <span style={{ color: C.labelMuted }}>{": "}</span>
                  <span style={{ color: C.blue }}>{'"acme-saas.com"'}</span>
                  <span style={{ color: C.labelMuted }}>{","}</span>
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: C.purple }}>{'"score"'}</span>
                  <span style={{ color: C.labelMuted }}>{": "}</span>
                  <span style={{ color: C.red }}>{"37"}</span>
                  <span style={{ color: C.labelMuted }}>{","}</span>
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: C.purple }}>{'"percentile"'}</span>
                  <span style={{ color: C.labelMuted }}>{": "}</span>
                  <span style={{ color: C.red }}>{"21"}</span>
                  <span style={{ color: C.labelMuted }}>{","}</span>
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: C.purple }}>{'"checks"'}</span>
                  <span style={{ color: C.labelMuted }}>{": "}</span>
                  <span style={{ color: C.ink }}>{"307"}</span>
                </div>
                <div style={{ color: C.labelMuted }}>{"}"}</div>
              </div>
            </div>

            {/* Connector threads — each flows into its door's top border (no end nodes).
                PURPLE → Developer API door (left); STEEL → Dashboard door (right). */}
            <div aria-hidden style={{ position: "relative", height: 46 }}>
              <svg width="100%" height="46" viewBox="0 0 1000 100" preserveAspectRatio="none" style={{ display: "block" }}>
                <path d="M 500 0 C 500 58 283 38 283 100" stroke={C.purple} strokeWidth="0.85" fill="none" opacity="0.5" vectorEffect="non-scaling-stroke" />
                <path d="M 500 0 C 500 58 783 38 783 100" stroke={C.blue}   strokeWidth="0.85" fill="none" opacity="0.5" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>

            {/* Surface doors — unequal (API primary + wider). ILLUSTRATIVE, not links. */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, alignItems: "start" }}>

              {/* DEVELOPER API door — purple, primary, wider; brighter purple top border */}
              <div style={{ background: "rgba(157,140,255,0.03)", border: "0.5px solid rgba(157,140,255,0.18)", borderTop: "1.5px solid rgba(157,140,255,0.55)", padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: C.purple }}>DEVELOPER API</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", color: C.labelMuted }}>PRIMARY</span>
                </div>
                <p style={{ fontFamily: BODY, fontSize: 12.5, lineHeight: 1.55, color: C.inkDim, margin: "0 0 14px" }}>
                  Build directly on the engine. POST a URL, get structured JSON back.
                </p>
                {["Structured JSON response", "Webhooks + batch scans", "307 checks · 27 categories", "Your key, your stack"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                    <span aria-hidden style={{ width: 10, height: 1, background: C.purple, flexShrink: 0, opacity: 0.7 }} />
                    <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.ink, letterSpacing: "0.02em" }}>{f}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14, border: "0.5px solid rgba(157,140,255,0.25)", background: "rgba(157,140,255,0.05)", padding: "8px 12px", fontFamily: MONO, fontSize: 11, color: C.purple, letterSpacing: "0.04em" }}>
                  weavn_live_7•••••••••••••
                </div>
              </div>

              {/* DASHBOARD door — steel, secondary, narrower, quieter; brighter steel top border */}
              <div style={{ background: "rgba(111,155,198,0.025)", border: "0.5px solid rgba(111,155,198,0.15)", borderTop: "1.5px solid rgba(111,155,198,0.45)", padding: "16px 18px" }}>
                <span style={{ display: "block", fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: C.blue, marginBottom: 10 }}>DASHBOARD</span>
                <p style={{ fontFamily: BODY, fontSize: 12, lineHeight: 1.55, color: C.labelMuted, margin: "0 0 14px" }}>
                  The same scan, rendered visually. No code required.
                </p>
                {["Scored reports", "White-label exports"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                    <span aria-hidden style={{ width: 10, height: 1, background: C.blue, flexShrink: 0, opacity: 0.55 }} />
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.inkDim, letterSpacing: "0.02em" }}>{f}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT PANEL — FORM (~39%). All auth logic/handlers preserved verbatim.
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="auth-form auth-form-panel"
          style={{
            position: "relative",
            overflow: "hidden",
            background: C.base,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "56px 56px",
          }}
        >
          {/* Steel corner brackets — top-right + bottom-right only */}
          {[
            { top: 20,    right: 20, borderTop: "0.5px solid rgba(111,155,198,0.25)",    borderRight: "0.5px solid rgba(111,155,198,0.25)" },
            { bottom: 20, right: 20, borderBottom: "0.5px solid rgba(111,155,198,0.25)", borderRight: "0.5px solid rgba(111,155,198,0.25)" },
          ].map((s, i) => (
            <div key={i} aria-hidden style={{ position: "absolute", width: 14, height: 14, pointerEvents: "none", ...s }} />
          ))}

          <div style={{ width: "100%", maxWidth: 400, margin: "0 auto", position: "relative", zIndex: 1 }}>

            {/* SIGN IN / CREATE ACCOUNT segmented toggle (existing mode state) */}
            <div style={{ display: "flex", background: C.base, border: "0.5px solid rgba(111,155,198,0.2)", padding: 3, width: "fit-content", marginBottom: 26 }}>
              {(["signin", "create"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  style={{
                    fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em",
                    padding: "8px 20px", border: "none", cursor: "pointer", borderRadius: 0, transition: "all 0.15s",
                    background: tab === t ? "rgba(111,155,198,0.12)" : "transparent",
                    color:      tab === t ? C.blue : C.labelMuted,
                  }}
                >
                  {t === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <h1 style={{ fontFamily: DISP, fontSize: 22, fontWeight: 500, color: C.ink, margin: "0 0 22px", lineHeight: 1.15 }}>
              {isCreate ? "Create your account." : "Welcome back."}
            </h1>

            {/* Pending domain context (preserved) */}
            {pendingDomain ? (
              <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 5, height: 5, background: C.green, flexShrink: 0, display: "inline-block", animation: "authPulseDot 1.5s ease-in-out infinite" }} />
                <span style={{ fontFamily: MONO, color: C.green, fontSize: 10, letterSpacing: "0.12em" }}>
                  DIAGNOSTIC QUEUED — {pendingDomain}
                </span>
              </div>
            ) : null}

            {/* Continue with Google (existing OAuth handler, verbatim) */}
            <button
              type="button"
              disabled={isSubmitting || isGoogleLoading}
              onClick={async () => {
                setGoogleError(null);
                setIsGoogleLoading(true);
                try {
                  const pending = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("pendingUrl") : null;
                  if (pending) {
                    document.cookie = "pendingUrl=" + encodeURIComponent(pending) + ";path=/;max-age=300;SameSite=Lax";
                    sessionStorage.setItem("pendingUrl", pending);
                  }
                  const supabase = getSupabaseBrowserClient();
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    // Carry the signup surface through OAuth so the callback can land
                    // API users on /console and dashboard users on /app.
                    options: { redirectTo: window.location.origin + "/auth/callback?surface=" + encodeURIComponent(surface) },
                  });
                  if (error) { setGoogleError(error.message || "Google authentication failed."); setIsGoogleLoading(false); }
                } catch {
                  setGoogleError("Google authentication failed.");
                  setIsGoogleLoading(false);
                }
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                width: "100%", padding: "13px", borderRadius: 0,
                background: "transparent",
                border: "0.5px solid rgba(111,155,198,0.3)",
                color: C.ink, fontFamily: MONO, fontSize: 12, letterSpacing: "0.05em",
                cursor: isSubmitting || isGoogleLoading ? "not-allowed" : "pointer",
                opacity: isGoogleLoading ? 0.72 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isGoogleLoading) {
                  e.currentTarget.style.background = "rgba(111,155,198,0.06)";
                  e.currentTarget.style.border     = "0.5px solid rgba(111,155,198,0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.border     = "0.5px solid rgba(111,155,198,0.3)";
              }}
            >
              <GoogleIcon />
              <span style={{ opacity: isGoogleLoading ? 0.7 : 1 }}>Continue with Google</span>
            </button>
            {googleError ? <ErrorText>{googleError}</ErrorText> : null}

            {/* OR divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "18px 0" }}>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(111,155,198,0.12)" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted }}>OR</span>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(111,155,198,0.12)" }} />
            </div>

            {/* NAME — create only (preserved; required by handleCreateAccount) */}
            {isCreate ? (
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="auth-name" style={labelStyle}>NAME</label>
                <input
                  id="auth-name" type="text" autoComplete="name"
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name" className="auth-input"
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
                />
                {fullNameError ? <ErrorText>{fullNameError}</ErrorText> : null}
              </div>
            ) : null}

            {/* EMAIL */}
            <div>
              <label htmlFor="auth-email" style={labelStyle}>EMAIL</label>
              <input
                id="auth-email" type="email" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" className="auth-input"
                style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
              />
              {emailError ? <ErrorText>{emailError}</ErrorText> : null}
            </div>

            {/* PASSWORD (show/hide preserved) */}
            <div style={{ marginTop: 18 }}>
              <label htmlFor="auth-pw" style={labelStyle}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  id="auth-pw"
                  type={showPw ? "text" : "password"}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="········" className="auth-input"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={inputFocus} onBlur={inputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    border: "none", background: "transparent", padding: 0, cursor: "pointer",
                    color: C.labelMuted, display: "flex", alignItems: "center",
                  }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                </button>
              </div>
              {passwordError ? <ErrorText>{passwordError}</ErrorText> : null}
            </div>

            {/* Forgot password — signin only (preserved) */}
            {tab === "signin" ? (
              <div style={{ textAlign: "right", marginTop: 10 }}>
                <Link
                  href="/auth/forgot-password"
                  style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted, textDecoration: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.blue; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.labelMuted; }}
                >
                  Forgot password?
                </Link>
              </div>
            ) : null}

            {/* Submit (existing handlers) */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void (tab === "signin" ? handleSignIn() : handleCreateAccount())}
              style={{
                width: "100%", padding: "13px", borderRadius: 0,
                background: "rgba(111,155,198,0.08)",
                border: "0.5px solid rgba(111,155,198,0.5)",
                color: C.blue, fontFamily: MONO, fontSize: 13, fontWeight: 400,
                letterSpacing: "0.15em", textTransform: "uppercase",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.75 : 1,
                marginTop: 24,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = "rgba(111,155,198,0.14)";
                  e.currentTarget.style.boxShadow  = "0 0 24px rgba(111,155,198,0.12)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(111,155,198,0.08)";
                e.currentTarget.style.boxShadow  = "none";
              }}
            >
              {isCreate ? "CREATE ACCOUNT →" : "SIGN IN →"}
            </button>
            {globalError ? <ErrorText>{globalError}</ErrorText> : null}

            {signupEmailSent && isCreate ? (
              <p style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, color: C.labelMuted, lineHeight: 1.5 }}>
                Confirmation email sent. Complete verification to continue.
              </p>
            ) : null}

            {/* Footer toggle link (reuses existing switchTab) */}
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.labelMuted, textAlign: "center", marginTop: 20, marginBottom: 0 }}>
              {tab === "signin" ? (
                <>
                  {"New here? "}
                  <span
                    role="button" tabIndex={0} style={{ color: C.blue, cursor: "pointer" }}
                    onClick={() => switchTab("create")}
                    onKeyDown={(e) => { if (e.key === "Enter") switchTab("create"); }}
                  >Create one →</span>
                </>
              ) : (
                <>
                  {"Already have an account? "}
                  <span
                    role="button" tabIndex={0} style={{ color: C.blue, cursor: "pointer" }}
                    onClick={() => switchTab("signin")}
                    onKeyDown={(e) => { if (e.key === "Enter") switchTab("signin"); }}
                  >Sign in →</span>
                </>
              )}
            </p>

            {/* Terms — create only (preserved) */}
            {isCreate ? (
              <p style={{ marginTop: 12, marginBottom: 0, fontFamily: MONO, fontSize: 10, color: C.labelMuted, textAlign: "center", lineHeight: 1.6 }}>
                By creating an account you agree to our{" "}
                <Link href="/terms"   style={{ color: C.blue, textDecoration: "none" }}>Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" style={{ color: C.blue, textDecoration: "none" }}>Privacy Policy</Link>.
              </p>
            ) : null}

          </div>
        </div>

      </div>
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}
