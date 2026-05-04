"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const MONO = 'var(--font-jetbrains-mono), var(--font-space-mono), monospace';
const GROTESK = 'var(--font-space-grotesk), sans-serif';
const ORBITRON = 'var(--font-orbitron), sans-serif';

const C = {
  cyan: "#00C8FF",
  surface: "#070C14",
  card: "#0D1020",
  border: "#1C1C2E",
  primary: "#F0F4FF",
  secondary: "#8E8EA0",
  base: "#050810",
  red: "#FF2D2D",
} as const;

function LogoRow() {
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <span
        className="shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: C.cyan, borderRadius: "50%" }}
        aria-hidden
      />
      <span style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: 18, color: C.primary, lineHeight: 1 }}>
        webdoc
      </span>
      <span style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: 18, color: C.cyan, lineHeight: 1 }}>
        ai
      </span>
    </div>
  );
}

function isValidEmail(s: string): boolean {
  const t = s.trim();
  return t.includes("@") && t.includes(".");
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const inputBase: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "11px 16px",
    color: C.primary,
    fontFamily: GROTESK,
    fontWeight: 400,
    fontSize: 16,
    outline: "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };

  async function handleSubmit() {
    setSubmitError(null);
    setEmailError(null);
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/reset-password`,
      });
      if (error) {
        setSubmitError(error.message || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      setSentTo(email.trim());
    } catch (caught: unknown) {
      setSubmitError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center overflow-auto px-6 py-8"
      style={{ background: C.surface, minHeight: "100vh" }}
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
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "24px 24px 28px",
            boxShadow: "0 0 40px rgba(0,180,255,0.06)",
          }}
        >
          {sentTo ? (
            <p
              style={{
                margin: 0,
                fontFamily: GROTESK,
                fontWeight: 300,
                fontSize: 15,
                color: C.secondary,
                lineHeight: 1.6,
              }}
            >
              Check your email — we&apos;ve sent a reset link to {sentTo}
            </p>
          ) : (
            <>
              <h1
                style={{
                  margin: 0,
                  marginBottom: 8,
                  fontFamily: ORBITRON,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: "0.06em",
                  color: C.primary,
                }}
              >
                RESET PASSWORD
              </h1>
              <p
                style={{
                  margin: 0,
                  marginBottom: 20,
                  fontFamily: MONO,
                  fontWeight: 400,
                  fontSize: 13,
                  color: "rgba(0,200,255,0.6)",
                  lineHeight: 1.5,
                }}
              >
                Enter your email address and we&apos;ll send you a reset link.
              </p>

              <label
                htmlFor="fp-email"
                style={{
                  display: "block",
                  fontFamily: MONO,
                  fontSize: 11,
                  color: C.secondary,
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                EMAIL
              </label>
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="placeholder:text-[#3A3A52]"
                style={inputBase}
                disabled={isSubmitting}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,200,255,0.4)";
                  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,200,255,0.15), 0 0 16px rgba(0,200,255,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transition = "border-color 300ms ease, box-shadow 300ms ease";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSubmit();
                }}
              />
              {emailError ? (
                <p style={{ marginTop: 6, fontFamily: GROTESK, fontWeight: 300, fontSize: 12, color: C.red }}>{emailError}</p>
              ) : null}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
                style={{
                  marginTop: 20,
                  width: "100%",
                  height: 46,
                  borderRadius: 8,
                  border: submitError ? `1px solid ${C.red}` : "none",
                  background: C.cyan,
                  color: C.base,
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.1em",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.75 : 1,
                  transition: "background-color 150ms ease, box-shadow 150ms ease, opacity 250ms ease, border-color 150ms ease",
                  animation: isSubmitting ? "ctaPulse 1s ease-in-out infinite" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (isSubmitting) return;
                  e.currentTarget.style.background = "#20D4FF";
                  e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,200,255,0.4), 0 0 20px rgba(0,200,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  if (isSubmitting) return;
                  e.currentTarget.style.background = C.cyan;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transition = "background-color 300ms ease, box-shadow 300ms ease";
                }}
              >
                {isSubmitting ? "SENDING..." : "SEND RESET LINK"}
              </button>

              {submitError ? (
                <p
                  style={{
                    marginTop: 10,
                    fontFamily: GROTESK,
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
              color: "rgba(0,200,255,0.6)",
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
