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
      return `/scan?url=${encodeURIComponent(normalized)}`;
    }
  }
  if (typeof sessionStorage !== "undefined") {
    const raw = sessionStorage.getItem("pendingUrl");
    if (raw) {
      sessionStorage.removeItem("pendingUrl");
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return `/scan?url=${encodeURIComponent(normalized)}`;
    }
  }
  return "/dashboard";
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
        .circuit-animated { display: block; }
        .circuit-static   { display: none;  }
        @media (prefers-reduced-motion: reduce) {
          .circuit-animated { display: none  !important; }
          .circuit-static   { display: block !important; }
        }
        @media (max-width: 767px) {
          .auth-root     { flex-direction: column !important; }
          .auth-left     { flex: none !important; width: 100% !important; padding: 28px 28px 24px !important; min-height: auto !important; }
          .auth-left-preview  { display: none !important; }
          .auth-left-tagline  { display: block !important; }
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
            flex: "0 0 45%",
            background: C.base,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 56px",
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
          {/* Corner ticks */}
          {[
            { top: 24,    left: 24,    borderTop: "0.5px solid rgba(111,155,198,0.25)", borderLeft:   "0.5px solid rgba(111,155,198,0.25)" },
            { top: 24,    right: 24,   borderTop: "0.5px solid rgba(111,155,198,0.25)", borderRight:  "0.5px solid rgba(111,155,198,0.25)" },
            { bottom: 24, left: 24,    borderBottom: "0.5px solid rgba(111,155,198,0.25)", borderLeft: "0.5px solid rgba(111,155,198,0.25)" },
            { bottom: 24, right: 24,   borderBottom: "0.5px solid rgba(111,155,198,0.25)", borderRight:"0.5px solid rgba(111,155,198,0.25)" },
          ].map((s, i) => (
            <div key={i} aria-hidden style={{ position: "absolute", width: 16, height: 16, pointerEvents: "none", ...s }} />
          ))}

          {/* ── Circuit traces SVG ── */}
          {/* Animated version — hidden via prefers-reduced-motion */}
          <svg
            className="circuit-animated"
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}
          >
            <defs>
              {/* Trace glow (soft luminance layer) */}
              <filter id="ctTraceGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* Dot glow — pure bloom, no hard circle */}
              <filter id="ctDot1" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/></feMerge>
              </filter>
              <filter id="ctDot2" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/></feMerge>
              </filter>
              <filter id="ctDot3" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/></feMerge>
              </filter>
              <filter id="ctDot4" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/></feMerge>
              </filter>
            </defs>

            {/* ── TRACE 1 — steel blue, opacity 0.35, 8s, begin 0s ── */}
            {/* Glow layer */}
            <path id="ct1" d="M 52,104 H 208 V 52 H 364 V 156 H 468 V 260 H 364 V 364"
              fill="none" stroke="#6F9BC6" strokeWidth="0.75" opacity="0.14"
              strokeDasharray="884" filter="url(#ctTraceGlow)">
              <animate attributeName="stroke-dashoffset" values="884;0;0;884" keyTimes="0;0.625;0.875;1" dur="8s" begin="0s" repeatCount="indefinite"/>
            </path>
            {/* Base trace */}
            <path d="M 52,104 H 208 V 52 H 364 V 156 H 468 V 260 H 364 V 364"
              fill="none" stroke="#6F9BC6" strokeWidth="0.75" opacity="0.35"
              strokeDasharray="884">
              <animate attributeName="stroke-dashoffset" values="884;0;0;884" keyTimes="0;0.625;0.875;1" dur="8s" begin="0s" repeatCount="indefinite"/>
            </path>
            {/* Terminal dots — square rects at each waypoint */}
            {([[52,104],[208,104],[208,52],[364,52],[364,156],[468,156],[468,260],[364,260],[364,364]] as [number,number][]).map(([x,y]) => (
              <rect key={`t1-${x}-${y}`} x={x-1} y={y-1} width={2} height={2} fill="#6F9BC6" opacity="0.6"/>
            ))}
            {/* Signal dot */}
            <circle r="2" fill="#6F9BC6" opacity="0.9" filter="url(#ctDot1)">
              <animateMotion dur="8s" begin="0s" repeatCount="indefinite"
                keyTimes="0;0.625;0.875;1" keyPoints="0;1;1;0" calcMode="linear">
                <mpath href="#ct1"/>
              </animateMotion>
            </circle>

            {/* ── TRACE 2 — purple, opacity 0.25, 10s, begin 2s ── */}
            <path id="ct2" d="M 0,260 H 104 V 364 H 260 V 312 H 416 V 468 H 520 V 416"
              fill="none" stroke="#9D8CFF" strokeWidth="0.75" opacity="0.10"
              strokeDasharray="884" filter="url(#ctTraceGlow)">
              <animate attributeName="stroke-dashoffset" values="884;0;0;884" keyTimes="0;0.625;0.875;1" dur="10s" begin="2s" repeatCount="indefinite"/>
            </path>
            <path d="M 0,260 H 104 V 364 H 260 V 312 H 416 V 468 H 520 V 416"
              fill="none" stroke="#9D8CFF" strokeWidth="0.75" opacity="0.25"
              strokeDasharray="884">
              <animate attributeName="stroke-dashoffset" values="884;0;0;884" keyTimes="0;0.625;0.875;1" dur="10s" begin="2s" repeatCount="indefinite"/>
            </path>
            {([[0,260],[104,260],[104,364],[260,364],[260,312],[416,312],[416,468],[520,468],[520,416]] as [number,number][]).map(([x,y]) => (
              <rect key={`t2-${x}-${y}`} x={x-1} y={y-1} width={2} height={2} fill="#9D8CFF" opacity="0.6"/>
            ))}
            <circle r="2" fill="#9D8CFF" opacity="0.9" filter="url(#ctDot2)">
              <animateMotion dur="10s" begin="2s" repeatCount="indefinite"
                keyTimes="0;0.625;0.875;1" keyPoints="0;1;1;0" calcMode="linear">
                <mpath href="#ct2"/>
              </animateMotion>
            </circle>

            {/* ── TRACE 3 — steel blue, opacity 0.20, 6s, begin 4s ── */}
            <path id="ct3" d="M 312,0 V 104 H 468 V 208 H 572 V 364 H 520"
              fill="none" stroke="#6F9BC6" strokeWidth="0.75" opacity="0.08"
              strokeDasharray="676" filter="url(#ctTraceGlow)">
              <animate attributeName="stroke-dashoffset" values="676;0;0;676" keyTimes="0;0.625;0.875;1" dur="6s" begin="4s" repeatCount="indefinite"/>
            </path>
            <path d="M 312,0 V 104 H 468 V 208 H 572 V 364 H 520"
              fill="none" stroke="#6F9BC6" strokeWidth="0.75" opacity="0.20"
              strokeDasharray="676">
              <animate attributeName="stroke-dashoffset" values="676;0;0;676" keyTimes="0;0.625;0.875;1" dur="6s" begin="4s" repeatCount="indefinite"/>
            </path>
            {([[312,0],[312,104],[468,104],[468,208],[572,208],[572,364],[520,364]] as [number,number][]).map(([x,y]) => (
              <rect key={`t3-${x}-${y}`} x={x-1} y={y-1} width={2} height={2} fill="#6F9BC6" opacity="0.6"/>
            ))}
            <circle r="2" fill="#6F9BC6" opacity="0.9" filter="url(#ctDot3)">
              <animateMotion dur="6s" begin="4s" repeatCount="indefinite"
                keyTimes="0;0.625;0.875;1" keyPoints="0;1;1;0" calcMode="linear">
                <mpath href="#ct3"/>
              </animateMotion>
            </circle>

            {/* ── TRACE 4 — green, opacity 0.15, 9s, begin 1s ── */}
            <path id="ct4" d="M 104,520 H 260 V 468 H 364 V 572 H 520 V 468 H 572"
              fill="none" stroke="#00C48C" strokeWidth="0.75" opacity="0.06"
              strokeDasharray="728" filter="url(#ctTraceGlow)">
              <animate attributeName="stroke-dashoffset" values="728;0;0;728" keyTimes="0;0.625;0.875;1" dur="9s" begin="1s" repeatCount="indefinite"/>
            </path>
            <path d="M 104,520 H 260 V 468 H 364 V 572 H 520 V 468 H 572"
              fill="none" stroke="#00C48C" strokeWidth="0.75" opacity="0.15"
              strokeDasharray="728">
              <animate attributeName="stroke-dashoffset" values="728;0;0;728" keyTimes="0;0.625;0.875;1" dur="9s" begin="1s" repeatCount="indefinite"/>
            </path>
            {([[104,520],[260,520],[260,468],[364,468],[364,572],[520,572],[520,468],[572,468]] as [number,number][]).map(([x,y]) => (
              <rect key={`t4-${x}-${y}`} x={x-1} y={y-1} width={2} height={2} fill="#00C48C" opacity="0.6"/>
            ))}
            <circle r="2" fill="#00C48C" opacity="0.9" filter="url(#ctDot4)">
              <animateMotion dur="9s" begin="1s" repeatCount="indefinite"
                keyTimes="0;0.625;0.875;1" keyPoints="0;1;1;0" calcMode="linear">
                <mpath href="#ct4"/>
              </animateMotion>
            </circle>
          </svg>

          {/* Static version — shown only with prefers-reduced-motion */}
          <svg
            className="circuit-static"
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0, overflow: "hidden" }}
          >
            <path d="M 52,104 H 208 V 52 H 364 V 156 H 468 V 260 H 364 V 364" fill="none" stroke="#6F9BC6" strokeWidth="0.75" opacity="0.35"/>
            <path d="M 0,260 H 104 V 364 H 260 V 312 H 416 V 468 H 520 V 416"  fill="none" stroke="#9D8CFF" strokeWidth="0.75" opacity="0.25"/>
            <path d="M 312,0 V 104 H 468 V 208 H 572 V 364 H 520"              fill="none" stroke="#6F9BC6" strokeWidth="0.75" opacity="0.20"/>
            <path d="M 104,520 H 260 V 468 H 364 V 572 H 520 V 468 H 572"      fill="none" stroke="#00C48C" strokeWidth="0.75" opacity="0.15"/>
          </svg>

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1 }}>

            {/* Wordmark */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
              <WebdocMark size={44} animated={false} />
              <span style={{ fontFamily: DISP, fontSize: 26, fontWeight: 600, color: "#E6E9EE", letterSpacing: "-0.5px" }}>
                webdoc<span style={{ color: C.blue }}>.ai</span>
              </span>
            </div>

            {/* Tagline — mobile only (preview hidden on mobile) */}
            <p
              className="auth-left-tagline"
              style={{ display: "none", fontFamily: MONO, fontSize: 11, color: C.labelMuted, margin: 0, letterSpacing: "0.1em" }}
            >
              CONVERSION INTELLIGENCE · FREE TO START
            </p>

            {/* Scan result preview panel */}
            <div className="auth-left-preview">
              <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: C.labelMuted, marginBottom: 16, marginTop: 0 }}>
                WHAT YOU'RE ABOUT TO UNLOCK
              </p>

              <div style={{
                background: "rgba(111,155,198,0.03)",
                border: "0.5px solid rgba(111,155,198,0.15)",
                padding: 24,
              }}>
                {/* Top row: ScoreRing + details */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 24, marginBottom: 20 }}>

                  {/* Left: score ring */}
                  <div style={{ flexShrink: 0, textAlign: "center" }}>
                    <ScoreRing score={61} size="md" animate={false} />
                    <p style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted, textAlign: "center", marginTop: 8, marginBottom: 0 }}>
                      acme-saas.com
                    </p>
                  </div>

                  {/* Right: stats */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", color: C.labelMuted, marginBottom: 4, marginTop: 0 }}>
                      CONVERSION SCORE
                    </p>
                    <p style={{ fontFamily: MONO, fontSize: 10, color: C.red, marginBottom: 12, marginTop: 0 }}>
                      CRITICAL · score &lt; 70
                    </p>

                    <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", color: C.labelMuted, marginBottom: 4, marginTop: 0 }}>
                      PERCENTILE
                    </p>
                    <p style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: C.blue, marginBottom: 12, marginTop: 0 }}>
                      63rd in B2B SaaS
                    </p>

                    <p style={{ fontFamily: MONO, fontSize: 10, textTransform: "uppercase", color: C.labelMuted, marginBottom: 4, marginTop: 0 }}>
                      TOP FINDING
                    </p>
                    <p style={{ fontFamily: SANS, fontSize: 13, color: "#9398A8", lineHeight: 1.5, marginBottom: 4, marginTop: 0 }}>
                      Hero headline is feature-led, not outcome-led
                    </p>
                    <p style={{ fontFamily: MONO, fontSize: 11, color: C.green, marginBottom: 0, marginTop: 0 }}>
                      +12–18% estimated lift
                    </p>
                  </div>
                </div>

                {/* Bottom row */}
                <div style={{
                  borderTop: "0.5px solid rgba(111,155,198,0.08)",
                  paddingTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted }}>307 checks run</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted }}>27 categories</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.green }}>200 OK · 87,340ms</span>
                </div>
              </div>

              <p style={{ fontFamily: MONO, fontSize: 11, color: C.labelMuted, marginTop: 32, marginBottom: 0 }}>
                Free to start. No credit card required.
              </p>
            </div>

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
