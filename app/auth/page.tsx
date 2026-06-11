"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { ReportPayload } from "@/lib/reportSchema";
import WebdocMark from "@/components/ui/WebdocMark";
import ScoreRing from "@/components/ui/ScoreRing";

type AuthTab = "signin" | "create";

const MONO = '"IBM Plex Mono", monospace';
const SANS = '"IBM Plex Sans", sans-serif';
const DISP = '"Space Grotesk", sans-serif';

const C = {
  green:      "#00C48C",
  blue:       "#6F9BC6",
  purple:     "#9D8CFF",
  labelMuted: "#6E7587",
  base:       "#050810",
  red:        "#E8635F",
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
  return "/app/dashboard";
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
        .from("profiles").upsert({ user_id: userId, plan: "free" }, { onConflict: "user_id" });
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
          const authSurface = typeof sessionStorage !== "undefined" ? (sessionStorage.getItem("auth_surface") || "dashboard") : "dashboard";
          window.location.replace(next ?? `/onboarding?surface=${authSurface}`);
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
        @keyframes ct1 { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes ct2 { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes ct3 { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes ct4 { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .ct-trace { animation: none !important; stroke-dashoffset: 0; }
        }
        @media (max-width: 767px) {
          .auth-root     { flex-direction: column !important; }
          .auth-left     { display: none !important; }
          .auth-mobile-header { display: flex !important; }
          .auth-right    { padding: 32px 20px !important; }
        }
      `}</style>

      <div className="auth-root" style={{ display: "flex", minHeight: "100vh", flexDirection: "row" }}>

        {/* ══════════════════════════════════════════════════════════════════
            LEFT PANEL — "here's what you're about to unlock"
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="auth-left"
          style={{
            flex: "0 0 42%",
            background: C.base,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 48px",
          }}
        >
          {/* Atmosphere */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: [
              "radial-gradient(ellipse 700px 900px at 20% 40%, rgba(111,155,198,0.07) 0%, transparent 60%)",
              "radial-gradient(ellipse 400px 500px at 80% 85%, rgba(157,140,255,0.05) 0%, transparent 55%)",
            ].join(", "),
          }} />
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: [
              "repeating-linear-gradient(rgba(111,155,198,0.025) 1px, transparent 1px)",
              "repeating-linear-gradient(90deg, rgba(111,155,198,0.025) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "52px 52px",
          }} />
          {/* Circuit traces */}
          <svg
            aria-hidden
            viewBox="0 0 600 900"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}
          >
            <path className="ct-trace" d="M 52,104 H 260 V 52 H 416 V 156 H 520 V 312 H 364 V 416 H 208 V 520" fill="none" stroke="#6F9BC6" strokeWidth="0.6" opacity="0.3" strokeDasharray="1" pathLength="1" style={{ animation: 'ct1 8s linear 0s infinite' }} />
            <path className="ct-trace" d="M 0,312 H 156 V 208 H 312 V 364 H 468 V 260 H 572 V 468 H 416 V 572" fill="none" stroke="#9D8CFF" strokeWidth="0.6" opacity="0.2" strokeDasharray="1" pathLength="1" style={{ animation: 'ct2 10s linear 2s infinite' }} />
            <path className="ct-trace" d="M 364,0 V 156 H 520 V 52 H 572 V 260 H 468 V 364 H 572 V 520" fill="none" stroke="#6F9BC6" strokeWidth="0.5" opacity="0.18" strokeDasharray="1" pathLength="1" style={{ animation: 'ct3 7s linear 4s infinite' }} />
            <path className="ct-trace" d="M 104,572 H 312 V 468 H 208 V 624 H 416 V 520 H 520 V 676" fill="none" stroke="#00C48C" strokeWidth="0.5" opacity="0.13" strokeDasharray="1" pathLength="1" style={{ animation: 'ct4 9s linear 1s infinite' }} />
            <rect x="51" y="103" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="259" y="103" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="259" y="51" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="415" y="51" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="415" y="155" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="519" y="155" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="519" y="311" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="363" y="311" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="363" y="415" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="207" y="415" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="207" y="519" width="2" height="2" fill="#6F9BC6" opacity="0.25"/>
            <rect x="-1" y="311" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="155" y="311" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="155" y="207" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="311" y="207" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="311" y="363" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="467" y="363" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="467" y="259" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="571" y="259" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="571" y="467" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="415" y="467" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="415" y="571" width="2" height="2" fill="#9D8CFF" opacity="0.18"/>
            <rect x="363" y="-1" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="363" y="155" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="519" y="155" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="519" y="51" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="571" y="51" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="571" y="259" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="467" y="259" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="467" y="363" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="571" y="363" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="571" y="519" width="2" height="2" fill="#6F9BC6" opacity="0.15"/>
            <rect x="103" y="571" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="311" y="571" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="311" y="467" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="207" y="467" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="207" y="623" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="415" y="623" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="415" y="519" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="519" y="519" width="2" height="2" fill="#00C48C" opacity="0.11"/>
            <rect x="519" y="675" width="2" height="2" fill="#00C48C" opacity="0.11"/>
          </svg>
          {/* Corner ticks */}
          {[
            { top: 24,    left: 24,    borderTop: "0.5px solid rgba(111,155,198,0.25)", borderLeft:   "0.5px solid rgba(111,155,198,0.25)" },
            { top: 24,    right: 24,   borderTop: "0.5px solid rgba(111,155,198,0.25)", borderRight:  "0.5px solid rgba(111,155,198,0.25)" },
            { bottom: 24, left: 24,    borderBottom: "0.5px solid rgba(111,155,198,0.25)", borderLeft: "0.5px solid rgba(111,155,198,0.25)" },
            { bottom: 24, right: 24,   borderBottom: "0.5px solid rgba(111,155,198,0.25)", borderRight:"0.5px solid rgba(111,155,198,0.25)" },
          ].map((s, i) => (
            <div key={i} aria-hidden style={{ position: "absolute", width: 16, height: 16, pointerEvents: "none", ...s }} />
          ))}

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

            {/* TOP — brand identity */}
            <div style={{ marginBottom: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
                <WebdocMark size={48} animated={false} />
                <span style={{ fontFamily: DISP, fontSize: 24, fontWeight: 600, color: "#E6E9EE", letterSpacing: "-0.5px" }}>
                  webdoc<span style={{ color: C.blue }}>.ai</span>
                </span>
              </div>
              <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: C.labelMuted, margin: 0 }}>
                CONVERSION INTELLIGENCE
              </p>
            </div>

            {/* MIDDLE — scan result preview */}
            <div
              className="auth-left-preview"
              style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 32, paddingBottom: 16 }}
            >
              <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(111,155,198,0.5)", marginBottom: 16, marginTop: 0 }}>
                WHAT YOU&apos;RE ABOUT TO UNLOCK
              </p>
              <div style={{
                background: "rgba(5,8,16,0.8)",
                border: "0.5px solid rgba(111,155,198,0.18)",
                padding: 0,
                overflow: "hidden",
              }}>
                {/* Panel header */}
                <div style={{ padding: "10px 16px", borderBottom: "0.5px solid rgba(111,155,198,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div aria-hidden style={{ width: 5, height: 5, borderRadius: "50%", background: C.green }} />
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted }}>scan complete · acme-saas.com</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.green }}>200 OK</span>
                </div>
                {/* Panel body */}
                <div style={{ padding: 20, display: "flex", alignItems: "flex-start", gap: 20 }}>
                  <div style={{ flexShrink: 0, textAlign: "center" }}>
                    <ScoreRing score={61} size="md" animate={false} />
                    <p style={{ fontFamily: MONO, fontSize: 9, color: C.labelMuted, textAlign: "center", marginTop: 6, marginBottom: 0 }}>acme-saas.com</p>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <p style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", color: C.labelMuted, marginBottom: 2, marginTop: 0 }}>PERCENTILE</p>
                      <p style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: C.blue, marginBottom: 0, marginTop: 0 }}>63rd in B2B SaaS</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", color: C.labelMuted, marginBottom: 2, marginTop: 0 }}>TOP FINDING</p>
                      <p style={{ fontFamily: SANS, fontSize: 13, color: "#E6E9EE", lineHeight: 1.4, marginBottom: 3, marginTop: 0 }}>Hero headline is feature-led, not outcome-led</p>
                      <p style={{ fontFamily: MONO, fontSize: 11, color: C.green, marginTop: 0, marginBottom: 0 }}>+12–18% estimated lift</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: MONO, fontSize: 9, textTransform: "uppercase", color: C.labelMuted, marginBottom: 2, marginTop: 0 }}>FINDINGS</p>
                      <p style={{ fontFamily: MONO, fontSize: 13, color: C.blue, marginBottom: 0, marginTop: 0 }}>23 ranked · P1→P3</p>
                    </div>
                  </div>
                </div>
                {/* Panel footer */}
                <div style={{ padding: "10px 16px", borderTop: "0.5px solid rgba(111,155,198,0.08)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.labelMuted }}>307 checks</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.labelMuted }}>27 categories</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: C.labelMuted }}>87,340ms</span>
                </div>
              </div>
            </div>

            {/* BOTTOM — reassurance */}
            <p style={{ fontFamily: MONO, fontSize: 11, color: "rgba(111,155,198,0.4)", marginTop: 32, marginBottom: 0 }}>
              Free to start · no credit card · cancel anytime
            </p>

          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT PANEL — form
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="auth-right"
          style={{
            flex: 1,
            background: "#080D18",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
          }}
        >
          {/* Atmosphere */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 500px 500px at 60% 30%, rgba(111,155,198,0.04) 0%, transparent 60%)",
          }} />
          {/* Corner ticks */}
          {[
            { top: 20,    left: 20,    borderTop: "0.5px solid rgba(111,155,198,0.15)", borderLeft:   "0.5px solid rgba(111,155,198,0.15)" },
            { top: 20,    right: 20,   borderTop: "0.5px solid rgba(111,155,198,0.15)", borderRight:  "0.5px solid rgba(111,155,198,0.15)" },
            { bottom: 20, left: 20,    borderBottom: "0.5px solid rgba(111,155,198,0.15)", borderLeft: "0.5px solid rgba(111,155,198,0.15)" },
            { bottom: 20, right: 20,   borderBottom: "0.5px solid rgba(111,155,198,0.15)", borderRight:"0.5px solid rgba(111,155,198,0.15)" },
          ].map((s, i) => (
            <div key={i} aria-hidden style={{ position: "absolute", width: 14, height: 14, pointerEvents: "none", ...s }} />
          ))}

          {/* Form card */}
          <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

            {/* Mobile-only wordmark header */}
            <div
              className="auth-mobile-header"
              style={{ display: "none", alignItems: "center", gap: 10, marginBottom: 28 }}
            >
              <WebdocMark size={36} animated={false} />
              <span style={{ fontFamily: DISP, fontSize: 20, fontWeight: 600, color: "#E6E9EE" }}>
                webdoc<span style={{ color: C.blue }}>.ai</span>
              </span>
            </div>

            {/* Tab toggle */}
            <div style={{ display: "flex", background: C.base, border: "0.5px solid rgba(111,155,198,0.2)", padding: 3, width: "fit-content", marginBottom: 32 }}>
              {(["signin", "create"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    padding: "8px 20px",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 0,
                    transition: "all 0.15s",
                    background: tab === t ? "rgba(111,155,198,0.12)" : "transparent",
                    color:      tab === t ? C.blue : C.labelMuted,
                  }}
                >
                  {t === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
                </button>
              ))}
            </div>

            {/* Heading */}
            <h1 style={{ fontFamily: DISP, fontSize: 28, fontWeight: 700, color: "#E6E9EE", margin: "0 0 28px", lineHeight: 1.1 }}>
              {isCreate ? "Start scanning." : "Welcome back."}
            </h1>

            {/* Pending domain context */}
            {pendingDomain ? (
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 5, height: 5, background: C.green, flexShrink: 0, display: "inline-block", animation: "authPulseDot 1.5s ease-in-out infinite" }} />
                <span style={{ fontFamily: MONO, color: C.green, fontSize: 10, letterSpacing: "0.12em" }}>
                  DIAGNOSTIC QUEUED — {pendingDomain}
                </span>
              </div>
            ) : null}

            {/* Google OAuth button */}
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
                    options: { redirectTo: window.location.origin + "/auth/callback" },
                  });
                  if (error) { setGoogleError(error.message || "Google authentication failed."); setIsGoogleLoading(false); }
                } catch {
                  setGoogleError("Google authentication failed.");
                  setIsGoogleLoading(false);
                }
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                width: "100%", padding: "14px", borderRadius: 0,
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid rgba(255,255,255,0.15)",
                color: "#E6E9EE", fontFamily: MONO, fontSize: 12, letterSpacing: "0.05em",
                cursor: isSubmitting || isGoogleLoading ? "not-allowed" : "pointer",
                opacity: isGoogleLoading ? 0.72 : 1,
                transition: "all 0.15s",
                marginBottom: 20,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isGoogleLoading) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.border     = "0.5px solid rgba(255,255,255,0.25)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.border     = "0.5px solid rgba(255,255,255,0.15)";
              }}
            >
              <GoogleIcon />
              <span style={{ opacity: isGoogleLoading ? 0.7 : 1 }}>Continue with Google</span>
            </button>
            {googleError ? <ErrorText>{googleError}</ErrorText> : null}

            {/* OR divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "20px 0" }}>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted }}>OR</span>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.07)" }} />
            </div>

            {/* Name — signup only */}
            {isCreate ? (
              <div style={{ marginBottom: 16 }}>
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

            {/* Email */}
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

            {/* Password */}
            <div style={{ marginTop: 16 }}>
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

            {/* Forgot password */}
            {tab === "signin" ? (
              <div style={{ textAlign: "right", marginTop: 8 }}>
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

            {/* Submit button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void (tab === "signin" ? handleSignIn() : handleCreateAccount())}
              style={{
                width: "100%", padding: "13px", borderRadius: 0,
                background: "rgba(111,155,198,0.08)",
                border: "1px solid rgba(111,155,198,0.5)",
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

            {/* Toggle link */}
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.labelMuted, textAlign: "center", marginTop: 20, marginBottom: 0 }}>
              {tab === "signin" ? (
                <>
                  {"Don't have an account? "}
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

            {/* Terms — signup only */}
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
