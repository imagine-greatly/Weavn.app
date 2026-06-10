"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { ReportPayload } from "@/lib/reportSchema";
import WebdocMark from "@/components/ui/WebdocMark";

type AuthTab = "signin" | "create";

const MONO = '"IBM Plex Mono", monospace';
const DISP = '"Space Grotesk", sans-serif';

const C = {
  green: "#00C48C",
  blue: "#6F9BC6",
  labelMuted: "#6E7587",
  base: "#050810",
  red: "#E8635F",
} as const;

function isValidEmail(s: string): boolean {
  const t = s.trim();
  return t.includes("@") && t.includes(".");
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.4H42V20H24v8h10.9c-1.2 4.8-5.5 8-10.9 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3.2l5.7-5.7C34.9 2.8 30.7 1 26 1 14.9 1 6 10 6 21s8.9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.6z" />
      <path fill="#FF3D00" d="M6.8 14.5l6.6 4.8C14.8 16.1 19.3 12 24 12c3 0 5.7 1.1 7.8 3.2l5.7-5.7C34.9 2.8 30.7 1 26 1 17.4 1 10.1 5.9 6.8 14.5z" />
      <path fill="#4CAF50" d="M24 41c-4.7 0-9.2-2.1-11.4-5.8l-6.7 4.8C9.4 45 17.2 48 24 48c5.6 0 10.5-1.9 13.9-5.1l-6.4-5.2C29.7 40 27 41 24 41z" />
      <path fill="#1976D2" d="M43.6 20.4H42V20H24v8h10.9c-.8 2.9-2.7 5.4-5.4 6.9l6.4 5.2C39.7 42.2 44 36 44 29c0-2.1-.4-4-1-5.6z" />
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

function mapAuthErrorToCtaMessage(raw: string): string {
  const msg = (raw || "").trim();
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Invalid credentials. Authentication failed.";
  if (lower.includes("user already registered")) return "Account already exists. Sign in with access email.";
  if (
    lower.includes("password should be at least 8 characters") ||
    (lower.includes("password") && lower.includes("8") && lower.includes("characters"))
  ) {
    return "Access key must be at least 8 characters.";
  }
  return "Authentication request failed.";
}

/** Read the pendingUrl cookie, clear it, and return a /scan redirect or /dashboard. */
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [signupEmailSent, setSignupEmailSent] = useState(false);
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);

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
    setEmail("");
    setPassword("");
    setFullName("");
    setShowPw(false);
    setGlobalError(null);
    setEmailError(null);
    setPasswordError(null);
    setFullNameError(null);
  }, []);

  const switchTab = useCallback(
    (next: AuthTab) => {
      if (next === tab) return;
      setTab(next);
      resetFormState();
    },
    [tab, resetFormState],
  );

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "#080D18",
    border: "0.5px solid rgba(111,155,198,0.2)",
    boxShadow: "none",
    borderRadius: 0,
    padding: "10px 14px",
    height: 42,
    color: "#E6E9EE",
    fontFamily: MONO,
    fontWeight: 400,
    fontSize: 13,
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: 400,
    color: C.labelMuted,
    marginBottom: 6,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
  };

  async function handleSignIn() {
    setGlobalError(null);
    setEmailError(null);
    setPasswordError(null);
    const em = email.trim();
    if (!em) { setEmailError("Access email required."); return; }
    if (!isValidEmail(em)) { setEmailError("Invalid access email format."); return; }
    if (password.length < 8) { setPasswordError("Access key must be at least 8 characters."); return; }
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) {
        const msg = error?.message ?? "";
        if (msg.includes("Invalid login credentials")) {
          setGlobalError("Invalid credentials. Authentication failed.");
        } else if (msg.includes("Email not confirmed")) {
          setGlobalError("Account not found. Verify access email.");
        } else if (msg.includes("Too many requests")) {
          setGlobalError("Authentication rate limit reached. Retry shortly.");
        } else if (msg) {
          setGlobalError(msg);
        } else {
          setGlobalError("Authentication request failed.");
        }
        setIsSubmitting(false);
        return;
      }
      setTimeout(() => {
        const next = searchParams.get("next");
        if (next) {
          window.location.replace(next);
        } else {
          window.location.replace(buildScanRedirect());
        }
      }, 800);
    } catch (caught: unknown) {
      const msg = caught instanceof Error ? caught.message : "";
      if (msg.includes("Invalid login credentials")) {
        setGlobalError("Invalid credentials. Authentication failed.");
      } else if (msg.includes("Email not confirmed")) {
        setGlobalError("Account not found. Verify access email.");
      } else if (msg.includes("Too many requests")) {
        setGlobalError("Authentication rate limit reached. Retry shortly.");
      } else if (msg) {
        setGlobalError(msg);
      } else {
        setGlobalError("Authentication request failed.");
      }
      setIsSubmitting(false);
    }
  }

  async function savePendingReportIfAny(userId: string) {
    const raw = localStorage.getItem("pending_report");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { domain?: string; payload?: ReportPayload };
      const domain = String(parsed.domain ?? "");
      const payload = parsed.payload ?? null;
      if (!domain || !payload) return;
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("reports").insert({ domain, payload, user_id: userId });
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to save pending report:", error);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Invalid pending_report payload:", e);
    }
    localStorage.removeItem("pending_report");
  }

  async function handleCreateAccount() {
    setGlobalError(null);
    setEmailError(null);
    setPasswordError(null);
    setFullNameError(null);
    const em = email.trim();
    if (!em) { setEmailError("Access email required."); return; }
    if (!isValidEmail(em)) { setEmailError("Invalid access email format."); return; }
    if (!fullName.trim()) { setFullNameError("Operator name required."); return; }
    if (password.length < 8) { setPasswordError("Access key must be at least 8 characters."); return; }
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) {
        setGlobalError(mapAuthErrorToCtaMessage(String(error.message ?? "")));
        setIsSubmitting(false);
        return;
      }
      const userId = data?.user?.id;
      if (!userId) {
        setGlobalError("Authentication request failed.");
        setIsSubmitting(false);
        return;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, plan: "free" }, { onConflict: "user_id" });
      if (profileError) {
        // eslint-disable-next-line no-console
        console.warn("Failed to create profile:", profileError);
      }
      const pending = localStorage.getItem("pending_report");
      if (pending) await savePendingReportIfAny(userId);
      // Always attempt key provisioning — the auth webhook covers the no-session
      // (email-confirmation) path as a fallback, but we try eagerly here too.
      try {
        await fetch("/api/auth/provision-key", { method: "POST", credentials: "include" });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[signup] provision-key failed:", err);
      }
      const hasSession = Boolean(data?.session);
      if (hasSession) {
        setTimeout(() => {
          const next = searchParams.get("next");
          if (next) {
            window.location.replace(next);
          } else {
            window.location.replace(buildScanRedirect());
          }
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

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid rgba(111,155,198,0.5)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(111,155,198,0.08)";
    e.currentTarget.style.outline = "none";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "0.5px solid rgba(111,155,198,0.2)";
    e.currentTarget.style.boxShadow = "none";
  };

  const isCreate = tab === "create";

  return (
    <>
      <style>{`
        .auth-input::placeholder {
          color: #6E7587;
          font-family: "IBM Plex Mono", monospace;
          font-size: 12px;
          opacity: 1;
        }
        @keyframes authPulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (max-width: 767px) {
          .auth-panels { flex-direction: column !important; }
          .auth-brand-panel { width: 100% !important; min-height: auto !important; padding: 32px 32px !important; }
          .auth-brand-stats { display: none !important; }
          .auth-brand-footer { display: none !important; }
          .auth-brand-divider { display: none !important; }
        }
      `}</style>

      <div className="auth-panels" style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── LEFT — Brand panel ── */}
        <div
          className="auth-brand-panel"
          style={{
            width: "40%",
            background: "#050810",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 56px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* Atmosphere */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: [
              "radial-gradient(ellipse 600px 800px at 30% 50%, rgba(111,155,198,0.06) 0%, transparent 60%)",
              "radial-gradient(ellipse 300px 400px at 70% 80%, rgba(157,140,255,0.04) 0%, transparent 55%)",
            ].join(", "),
          }} />
          {/* Corner ticks */}
          <div aria-hidden style={{ position: "absolute", top: 20, left: 20, width: 14, height: 14, borderTop: "0.5px solid rgba(111,155,198,0.2)", borderLeft: "0.5px solid rgba(111,155,198,0.2)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", top: 20, right: 20, width: 14, height: 14, borderTop: "0.5px solid rgba(111,155,198,0.2)", borderRight: "0.5px solid rgba(111,155,198,0.2)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", bottom: 20, left: 20, width: 14, height: 14, borderBottom: "0.5px solid rgba(111,155,198,0.2)", borderLeft: "0.5px solid rgba(111,155,198,0.2)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", bottom: 20, right: 20, width: 14, height: 14, borderBottom: "0.5px solid rgba(111,155,198,0.2)", borderRight: "0.5px solid rgba(111,155,198,0.2)", pointerEvents: "none" }} />

          {/* Brand content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <WebdocMark size={64} animated={false} />
            <h1 style={{ fontFamily: DISP, fontSize: 28, fontWeight: 600, color: "#E6E9EE", letterSpacing: "-0.5px", marginTop: 20, marginBottom: 0, lineHeight: 1.2 }}>
              webdoc<span style={{ color: C.blue }}>.ai</span>
            </h1>
            <p style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: C.labelMuted, marginTop: 8, marginBottom: 0 }}>
              CONVERSION INTELLIGENCE
            </p>

            {/* Tapered divider */}
            <div
              className="auth-brand-divider"
              style={{
                height: "0.5px",
                background: "linear-gradient(to right, rgba(111,155,198,0.3), transparent)",
                marginTop: 40,
                marginBottom: 40,
              }}
            />

            {/* Instrument panel */}
            <div className="auth-brand-stats" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {([
                { k: "engine",   v: "307 checks · 27 categories",  vc: C.blue  },
                { k: "response", v: "structured JSON · ~90s",       vc: C.blue  },
                { k: "corpus",   v: "4,812 sites · weekly updates", vc: C.green },
              ] as { k: string; v: string; vc: string }[]).map(row => (
                <div key={row.k} style={{ fontFamily: MONO, fontSize: 12, display: "flex" }}>
                  <span style={{ color: "#8080c0" }}>{row.k}</span>
                  <span style={{ color: C.labelMuted }}>: </span>
                  <span style={{ color: row.vc }}>{row.v}</span>
                </div>
              ))}
            </div>

            <p
              className="auth-brand-footer"
              style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted, marginTop: 40, marginBottom: 0 }}
            >
              Same engine on every plan. Cancel anytime.
            </p>
          </div>
        </div>

        {/* ── RIGHT — Form panel ── */}
        <div style={{
          flex: 1,
          background: "#080D18",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          padding: "40px 24px",
        }}>
          {/* Grid texture */}
          <div aria-hidden style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: [
              "linear-gradient(rgba(111,155,198,0.02) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(111,155,198,0.02) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "60px 60px",
          }} />
          {/* Corner ticks */}
          <div aria-hidden style={{ position: "absolute", top: 20, left: 20, width: 14, height: 14, borderTop: "0.5px solid rgba(111,155,198,0.15)", borderLeft: "0.5px solid rgba(111,155,198,0.15)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", top: 20, right: 20, width: 14, height: 14, borderTop: "0.5px solid rgba(111,155,198,0.15)", borderRight: "0.5px solid rgba(111,155,198,0.15)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", bottom: 20, left: 20, width: 14, height: 14, borderBottom: "0.5px solid rgba(111,155,198,0.15)", borderLeft: "0.5px solid rgba(111,155,198,0.15)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", bottom: 20, right: 20, width: 14, height: 14, borderBottom: "0.5px solid rgba(111,155,198,0.15)", borderRight: "0.5px solid rgba(111,155,198,0.15)", pointerEvents: "none" }} />

          {/* Form card */}
          <div style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 400,
            background: "#050810",
            border: "0.5px solid rgba(111,155,198,0.15)",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
          }}>

            {/* Pending domain context */}
            {pendingDomain ? (
              <div style={{ marginBottom: 20 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 5, height: 5, borderRadius: 0,
                      background: C.green, flexShrink: 0, display: "inline-block",
                      animation: "authPulseDot 1.5s ease-in-out infinite",
                    }}
                  />
                  <span style={{ fontFamily: MONO, color: C.green, fontSize: 10, letterSpacing: "0.12em" }}>
                    DIAGNOSTIC QUEUED — {pendingDomain}
                  </span>
                </span>
              </div>
            ) : null}

            {/* Form header */}
            <p style={{ fontFamily: MONO, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: C.blue, margin: "0 0 8px" }}>
              {isCreate ? "CREATE ACCOUNT" : "SIGN IN"}
            </p>
            <h2 style={{ fontFamily: DISP, fontSize: 24, fontWeight: 700, color: "#E6E9EE", margin: "0 0 32px" }}>
              {isCreate ? "Create your account." : "Welcome back."}
            </h2>

            {/* Google button */}
            <button
              type="button"
              disabled={isSubmitting || isGoogleLoading}
              onClick={async () => {
                setGoogleError(null);
                setIsGoogleLoading(true);
                try {
                  const pending =
                    typeof sessionStorage !== "undefined"
                      ? sessionStorage.getItem("pendingUrl")
                      : null;
                  if (pending) {
                    document.cookie =
                      "pendingUrl=" +
                      encodeURIComponent(pending) +
                      ";path=/;max-age=300;SameSite=Lax";
                    sessionStorage.setItem("pendingUrl", pending);
                  }
                  const supabase = getSupabaseBrowserClient();
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: window.location.origin + "/auth/callback" },
                  });
                  if (error) {
                    setGoogleError(error.message || "Google authentication failed.");
                    setIsGoogleLoading(false);
                  }
                } catch {
                  setGoogleError("Google authentication failed.");
                  setIsGoogleLoading(false);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                padding: "12px",
                borderRadius: 0,
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.12)",
                color: "#E6E9EE",
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: "0.05em",
                cursor: isSubmitting || isGoogleLoading ? "not-allowed" : "pointer",
                opacity: isGoogleLoading ? 0.72 : 1,
                transition: "background 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && !isGoogleLoading) e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
            >
              <GoogleIcon />
              <span style={{ opacity: isGoogleLoading ? 0.7 : 1 }}>Continue with Google</span>
            </button>
            {googleError ? <ErrorText>{googleError}</ErrorText> : null}

            {/* OR divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.labelMuted }}>OR</span>
              <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* Name — signup only */}
            {isCreate ? (
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="auth-name" style={labelStyle}>NAME</label>
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="auth-input"
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                {fullNameError ? <ErrorText>{fullNameError}</ErrorText> : null}
              </div>
            ) : null}

            {/* Email */}
            <div>
              <label htmlFor="auth-email" style={labelStyle}>EMAIL</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="auth-input"
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="········"
                  className="auth-input"
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
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
                width: "100%",
                padding: "12px",
                borderRadius: 0,
                background: "rgba(111,155,198,0.08)",
                border: "1px solid rgba(111,155,198,0.5)",
                color: C.blue,
                fontFamily: MONO,
                fontSize: 13,
                fontWeight: 400,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.75 : 1,
                marginTop: 24,
                transition: "background 150ms ease, box-shadow 150ms ease",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.background = "rgba(111,155,198,0.15)";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(111,155,198,0.12)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(111,155,198,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {tab === "signin" ? "SIGN IN →" : "CREATE ACCOUNT →"}
            </button>
            {globalError ? <ErrorText>{globalError}</ErrorText> : null}

            {signupEmailSent && isCreate ? (
              <p style={{ marginTop: 8, fontFamily: MONO, fontSize: 11, color: C.labelMuted, lineHeight: 1.5 }}>
                Confirmation email sent. Complete verification to continue.
              </p>
            ) : null}

            {/* Mode toggle */}
            <p style={{ fontFamily: MONO, fontSize: 11, color: C.labelMuted, textAlign: "center", marginTop: 20, marginBottom: 0 }}>
              {tab === "signin" ? (
                <>
                  {"Don't have an account? "}
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ color: C.blue, cursor: "pointer" }}
                    onClick={() => switchTab("create")}
                    onKeyDown={(e) => { if (e.key === "Enter") switchTab("create"); }}
                  >
                    Create one →
                  </span>
                </>
              ) : (
                <>
                  {"Already have an account? "}
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ color: C.blue, cursor: "pointer" }}
                    onClick={() => switchTab("signin")}
                    onKeyDown={(e) => { if (e.key === "Enter") switchTab("signin"); }}
                  >
                    Sign in →
                  </span>
                </>
              )}
            </p>

            {/* Terms — signup only */}
            {isCreate ? (
              <p style={{
                marginTop: 12, marginBottom: 0,
                fontFamily: MONO, fontSize: 10, color: C.labelMuted,
                textAlign: "center", lineHeight: 1.6,
              }}>
                By creating an account you agree to our{" "}
                <Link href="/terms" style={{ color: C.blue, textDecoration: "none" }}>Terms of Service</Link>{" "}
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

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageContent />
    </Suspense>
  );
}
