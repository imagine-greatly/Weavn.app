"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const MONO = '"IBM Plex Mono", monospace';
const DISP = '"Space Grotesk", sans-serif';

const C = {
  green: "#00C48C",
  surface: "#070B15",
  card: "#0A0E18",
  border: "rgba(255,255,255,0.08)",
  primary: "#E6E9EE",
  secondary: "#9398A8",
  base: "#050810",
  red: "#E8635F",
} as const;

/**
 * Supabase dashboard (deploy checklist — do not skip when going to production):
 * - Authentication → Email Templates → Reset Password: the link redirect must match what we pass to
 *   `resetPasswordForEmail` (e.g. `{origin}/auth/reset-password`, or `/auth/callback` if you point the template there).
 * - Authentication → URL Configuration → Redirect URLs: include at least
 *   `{your-production-url}/auth/reset-password`, `http://localhost:3000/auth/reset-password`,
 *   and if using the server callback exchange flow, `{origin}/auth/callback`.
 */

function LogoRow() {
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <span
        className="shrink-0"
        style={{ width: 6, height: 6, background: C.green, display: "inline-block" }}
        aria-hidden
      />
      <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 18, color: C.primary, lineHeight: 1 }}>
        Weavn
      </span>
    </div>
  );
}

type SessionState = "checking" | "invalid" | "ready";

export default function ResetPasswordPage() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState(false);

  const inputBase: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 0,
    padding: "11px 16px",
    color: C.primary,
    fontFamily: MONO,
    fontWeight: 400,
    fontSize: 13,
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error && !cancelled) {
            setSessionState("invalid");
            return;
          }
          window.history.replaceState({}, "", "/auth/reset-password");
        }
      }

      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session && typeof window !== "undefined" && window.location.hash?.length > 1) {
        await new Promise((r) => setTimeout(r, 150));
        sessionData = (await supabase.auth.getSession()).data;
      }
      if (cancelled) return;
      setSessionState(sessionData.session ? "ready" : "invalid");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    setSubmitError(null);
    setConfirmError(null);
    setLengthError(null);

    if (newPassword.length < 8) {
      setLengthError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setSubmitError(error.message || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      setDoneMessage(true);
      window.setTimeout(() => {
        window.location.replace("/app");
      }, 2000);
    } catch (caught: unknown) {
      setSubmitError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center overflow-auto px-6 py-8"
      style={{ background: "transparent", minHeight: "100vh" }}
    >
      <style jsx>{`
        @keyframes ctaPulse {
          0% {
            opacity: 0.75;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 0.75;
          }
        }
      `}</style>
      <div className="w-full max-w-[480px]" style={{ maxWidth: "min(480px, 100%)" }}>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="flex flex-row items-center"
          style={{
            gap: 6,
            marginBottom: 32,
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--text-muted)",
            transition: "color 300ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--cyan)";
            e.currentTarget.style.transition = "color 150ms ease";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.transition = "color 300ms ease";
          }}
        >
          <span style={{ fontSize: 14, color: "inherit" }} aria-hidden>
            ←
          </span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace", fontSize: 11, color: "inherit" }}>
            Back to home
          </span>
        </button>

        <div style={{ marginBottom: 24 }}>
          <LogoRow />
        </div>

        <div
          style={{
            background: C.card,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 0,
            padding: "24px 24px 28px",
          }}
        >
          {sessionState === "checking" ? (
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: C.secondary }}>Verifying reset link…</p>
          ) : sessionState === "invalid" ? (
            <div>
              <p
                style={{
                  margin: 0,
                  marginBottom: 16,
                  fontFamily: DISP,
                  fontWeight: 300,
                  fontSize: 15,
                  color: C.secondary,
                  lineHeight: 1.55,
                }}
              >
                This reset link has expired or is invalid. Request a new one.
              </p>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: C.secondary,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                Request password reset →
              </Link>
            </div>
          ) : doneMessage ? (
            <p
              style={{
                margin: 0,
                fontFamily: DISP,
                fontWeight: 300,
                fontSize: 15,
                color: C.secondary,
              }}
            >
              Password updated successfully.
            </p>
          ) : (
            <>
              <h1
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontFamily: DISP,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: "0.02em",
                  color: C.primary,
                }}
              >
                SET NEW PASSWORD
              </h1>
              <p
                style={{
                  margin: 0,
                  marginBottom: 20,
                  fontFamily: MONO,
                  fontWeight: 400,
                  fontSize: 13,
                  color: C.secondary,
                  lineHeight: 1.5,
                }}
              >
                Choose a strong password for your account.
              </p>

              <label
                htmlFor="rp-pw"
                style={{
                  display: "block",
                  fontFamily: MONO,
                  fontSize: 11,
                  color: C.secondary,
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                NEW PASSWORD
              </label>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <input
                  id="rp-pw"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setLengthError(null);
                  }}
                  placeholder="New password"
                  className="placeholder:text-[#3A3A52]"
                  style={{ ...inputBase, paddingRight: 64 }}
                  disabled={isSubmitting}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,196,140,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,196,140,0.06)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transition = "border-color 300ms ease, box-shadow 300ms ease";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: MONO,
                    fontSize: 11,
                    color: C.green,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = C.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = C.green;
                  }}
                >
                  {showPw ? "HIDE" : "SHOW"}
                </button>
              </div>

              <label
                htmlFor="rp-pw2"
                style={{
                  display: "block",
                  fontFamily: MONO,
                  fontSize: 11,
                  color: C.secondary,
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                CONFIRM PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="rp-pw2"
                  type={showPw2 ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError(null);
                  }}
                  placeholder="Confirm new password"
                  className="placeholder:text-[#3A3A52]"
                  style={{ ...inputBase, paddingRight: 64 }}
                  disabled={isSubmitting}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,196,140,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,196,140,0.06)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transition = "border-color 300ms ease, box-shadow 300ms ease";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw2((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: MONO,
                    fontSize: 11,
                    color: C.green,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = C.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = C.green;
                  }}
                >
                  {showPw2 ? "HIDE" : "SHOW"}
                </button>
              </div>
              {confirmError ? (
                <p style={{ marginTop: 6, fontFamily: DISP, fontWeight: 300, fontSize: 12, color: C.red }}>{confirmError}</p>
              ) : null}
              {lengthError ? (
                <p style={{ marginTop: 6, fontFamily: DISP, fontWeight: 300, fontSize: 12, color: C.red }}>{lengthError}</p>
              ) : null}

              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "#6E7587",
                }}
              >
                Minimum 8 characters
              </p>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
                style={{
                  marginTop: 20,
                  width: "100%",
                  height: 46,
                  borderRadius: 0,
                  border: submitError ? `1px solid ${C.red}` : `1px solid ${C.green}`,
                  background: "transparent",
                  color: C.green,
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.75 : 1,
                  transition: "background 150ms ease",
                  animation: isSubmitting ? "ctaPulse 1s ease-in-out infinite" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (isSubmitting) return;
                  e.currentTarget.style.background = "rgba(0,196,140,0.08)";
                }}
                onMouseLeave={(e) => {
                  if (isSubmitting) return;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {isSubmitting ? "UPDATING..." : "UPDATE PASSWORD"}
              </button>

              {submitError ? (
                <p
                  style={{
                    marginTop: 10,
                    fontFamily: DISP,
                    fontWeight: 300,
                    fontSize: 13,
                    color: C.red,
                    textAlign: "center",
                  }}
                >
                  {submitError}
                </p>
              ) : null}
            </>
          )}
        </div>

        <p style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            href="/auth"
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: C.secondary,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
