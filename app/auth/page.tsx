"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { ReportPayload } from "@/lib/reportSchema";
import AnimatedBackground from "@/components/AnimatedBackground";
import BackgroundField from "@/components/BackgroundField";
import GrainOverlay from "@/components/GrainOverlay";
import Logo from "@/components/Logo";

type AuthTab = "signin" | "create";

const MONO = "var(--font-space-mono), monospace";
const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";

const C = {
  cyan: "#00C8FF",
  labelMuted: "#8899AA",
  base: "#050810",
  red: "#FF2D2D",
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
    <p style={{ marginTop: 6, fontFamily: MONO, fontWeight: 400, fontSize: 11, color: C.red, lineHeight: 1.4 }}>
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
  // Cookie survives OAuth redirects; sessionStorage does not
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)pendingUrl=([^;]*)/);
    if (match) {
      const raw = decodeURIComponent(match[1]);
      document.cookie = "pendingUrl=;path=/;max-age=0";
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return `/scan?url=${encodeURIComponent(normalized)}`;
    }
  }
  // Fallback: sessionStorage (email flows stay on the same page)
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
    // Write to cookie so it survives the OAuth redirect round-trip
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
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(0,200,255,0.15)",
    boxShadow: "none",
    borderRadius: 6,
    padding: "0 16px",
    height: 48,
    color: "#FFFFFF",
    fontFamily: MONO,
    fontWeight: 400,
    fontSize: 13,
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 400,
    color: C.labelMuted,
    marginBottom: 6,
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
    e.currentTarget.style.border = "1px solid rgba(0,200,255,0.8)";
    e.currentTarget.style.boxShadow =
      "0 0 0 1px rgba(0,200,255,0.3), 0 0 20px rgba(0,200,255,0.15), 0 0 40px rgba(0,200,255,0.08)";
    e.currentTarget.style.outline = "none";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid rgba(0,200,255,0.15)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <>
      {/* ── Background layer stack ── */}
      <BackgroundField />
      <AnimatedBackground />
      <GrainOverlay />

      {/* ── Atmospheric fixed layer (pointer-events none) ── */}

      {/* Cyan atmospheric bloom */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800,
          height: 600,
          background: "radial-gradient(ellipse, rgba(0,200,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Top-left corner bracket */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          width: 24,
          height: 24,
          borderTop: "1px solid rgba(0,200,255,0.2)",
          borderLeft: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Top-right corner bracket */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          width: 24,
          height: 24,
          borderTop: "1px solid rgba(0,200,255,0.2)",
          borderRight: "1px solid rgba(0,200,255,0.2)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── Page content ── */}
      <div
        style={{
          minHeight: "100vh",
          background: "#050810",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          position: "relative",
        }}
      >
        <style jsx>{`
          .auth-input::placeholder {
            color: #8899AA;
            font-family: var(--font-space-mono), monospace;
            font-size: 12px;
            opacity: 1;
          }
        `}</style>

        {/* Form container — transparent, floats on ambient background */}
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            position: "relative",
            zIndex: 1,
            background: "transparent",
            borderRadius: 12,
            padding: "48px 40px",
          }}
        >

          {/* Logo mark */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Logo size="md" />
          </div>

          {/* Platform label */}
          <p
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.15em",
              color: "rgba(0,200,255,0.5)",
              textAlign: "center",
              margin: "0 0 16px 0",
              textTransform: "uppercase",
            }}
          >
            Conversion Intelligence Platform
          </p>

          {/* Headline */}
          {pendingDomain ? (
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  margin: "0 0 8px 0",
                  lineHeight: 1.3,
                }}
              >
                Your diagnostic for {pendingDomain} is queued.
              </p>
              <p style={{ fontFamily: MONO, fontSize: 12, color: C.labelMuted, margin: 0 }}>
                Create your free account to run it.
              </p>
            </div>
          ) : null}

          {/* Google button */}
          <button
            type="button"
            disabled={isSubmitting || isGoogleLoading}
            onClick={async () => {
              setGoogleError(null);
              setIsGoogleLoading(true);
              try {
                // Persist pendingUrl to both storage mechanisms before the OAuth redirect
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
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 52,
              borderRadius: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(0,200,255,0.2)",
              boxShadow: "none",
              color: "#FFFFFF",
              fontFamily: MONO,
              fontSize: 12,
              cursor: isSubmitting || isGoogleLoading ? "not-allowed" : "pointer",
              opacity: isGoogleLoading ? 0.72 : 1,
              marginBottom: 24,
              transition: "background 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (isSubmitting || isGoogleLoading) return;
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.5)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(0,200,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(0,200,255,0.2)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span style={{ position: "absolute", left: 16, display: "flex", alignItems: "center" }}>
              <GoogleIcon />
            </span>
            <span style={{ opacity: isGoogleLoading ? 0.7 : 1 }}>Continue with Google</span>
          </button>
          {googleError ? <ErrorText>{googleError}</ErrorText> : null}

          {/* Or divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.labelMuted }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Form fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Name — signup only */}
            {tab === "create" ? (
              <div>
                <label htmlFor="auth-name" style={labelStyle}>Name</label>
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
              <label htmlFor="auth-email" style={labelStyle}>Email</label>
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
            <div>
              <label htmlFor="auth-pw" style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="auth-pw"
                  type={showPw ? "text" : "password"}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input"
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    color: C.labelMuted,
                    display: "flex",
                    alignItems: "center",
                  }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                </button>
              </div>
              {passwordError ? <ErrorText>{passwordError}</ErrorText> : null}
              {/* Forgot password — sign in only */}
              {tab === "signin" ? (
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <Link
                    href="/auth/forgot-password"
                    style={{ fontFamily: MONO, fontSize: 11, color: C.labelMuted, textDecoration: "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.cyan; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.labelMuted; }}
                  >
                    Forgot password?
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void (tab === "signin" ? handleSignIn() : handleCreateAccount())}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 6,
              background: "#0AACCC",
              border: "none",
              boxShadow: "none",
              color: C.base,
              fontFamily: MONO,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.75 : 1,
              marginTop: 16,
              transition: "background 150ms ease, box-shadow 150ms ease",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.background = "#00C8FF";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(0,200,255,0.25)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0AACCC";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {tab === "signin" ? "Sign In" : "Create Account"}
          </button>
          {globalError ? <ErrorText>{globalError}</ErrorText> : null}

          {/* Terms — signup only */}
          {tab === "create" ? (
            <p
              style={{
                marginTop: 12,
                fontFamily: MONO,
                fontSize: 10,
                color: C.labelMuted,
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              By creating an account you agree to our{" "}
              <Link href="/terms" style={{ color: C.cyan, textDecoration: "none" }}>
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" style={{ color: C.cyan, textDecoration: "none" }}>
                Privacy Policy
              </Link>
              .
            </p>
          ) : null}

          {signupEmailSent && tab === "create" ? (
            <p style={{ marginTop: 10, fontFamily: MONO, fontSize: 11, color: C.labelMuted, lineHeight: 1.5 }}>
              Confirmation email sent. Complete verification to continue.
            </p>
          ) : null}

          {/* Toggle line */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => switchTab(tab === "signin" ? "create" : "signin")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 12,
                color: C.labelMuted,
                padding: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.labelMuted; }}
            >
              {tab === "signin"
                ? "Don't have an account? Create one →"
                : "Already have an account? Sign in →"}
            </button>
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
