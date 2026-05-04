"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

const SURFACE = "#0A0F1E";
const BORDER = "#1A2035";
const CYAN = "#00C8FF";
const MUTED = "#8899AA";
const MONO = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";
const BODY = "Inter, ui-sans-serif, system-ui, sans-serif";

const outlineBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0 24px",
  background: "transparent",
  border: `1px solid ${CYAN}`,
  borderRadius: 3,
  color: CYAN,
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "background 150ms ease",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: "0.12em",
        color: MUTED,
        marginBottom: 8,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

function PathwayCard({
  kicker,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  submitting,
  status,
}: {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  submitting: boolean;
  status: "idle" | "ok" | "err";
}) {
  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
        padding: "28px 32px",
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: 11, color: CYAN, letterSpacing: "0.14em", margin: 0 }}>
        {kicker}
      </p>
      <h2
        style={{
          fontFamily: BODY,
          fontSize: 18,
          fontWeight: 600,
          color: "#FFFFFF",
          margin: "10px 0 0 0",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: BODY,
          fontSize: 14,
          lineHeight: 1.7,
          color: MUTED,
          margin: "12px 0 0 0",
        }}
      >
        {description}
      </p>
      <div style={{ marginTop: 22 }}>{children}</div>
      <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <button type="submit" disabled={submitting} style={outlineBtn}>
          {submitting ? "SENDING" : submitLabel}
        </button>
        {status === "ok" ? (
          <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--green)" }}>Sent</span>
        ) : null}
        {status === "err" ? (
          <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--red)" }}>Send failed</span>
        ) : null}
      </div>
    </form>
  );
}

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "";

  const [issueUrl, setIssueUrl] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [issueEmail, setIssueEmail] = useState("");
  const [issueState, setIssueState] = useState<"idle" | "ok" | "err">("idle");
  const [issueBusy, setIssueBusy] = useState(false);

  const [fbBody, setFbBody] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbState, setFbState] = useState<"idle" | "ok" | "err">("idle");
  const [fbBusy, setFbBusy] = useState(false);

  const [stQ1, setStQ1] = useState("");
  const [stQ2, setStQ2] = useState("");
  const [stQ3, setStQ3] = useState("");
  const [stName, setStName] = useState("");
  const [stSite, setStSite] = useState("");
  const [stState, setStState] = useState<"idle" | "ok" | "err">("idle");
  const [stBusy, setStBusy] = useState(false);

  async function postContact(type: "issue" | "feedback" | "story", data: object, email?: string) {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data, email: email || undefined }),
    });
    return res.ok;
  }

  const inputBase: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 4,
    border: `1px solid ${BORDER}`,
    background: "#080D18",
    color: "#FFFFFF",
    fontFamily: BODY,
    fontSize: 14,
    padding: "12px 14px",
  };

  return (
    <div style={{ minHeight: "100svh", background: "var(--bg-base)", padding: "96px 24px 80px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <h1
          className="font-headline"
          style={{
            color: "#FFFFFF",
            fontSize: 52,
            lineHeight: 1.05,
            letterSpacing: "-1px",
            margin: 0,
          }}
        >
          Talk to us.
        </h1>
        <p style={{ fontFamily: BODY, fontSize: 18, color: MUTED, margin: "16px 0 0 0", maxWidth: 520 }}>
          WebDoc is built by a small team. We read every message.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 48 }}>
          <PathwayCard
            kicker="SOMETHING'S WRONG"
            title="Report a diagnostic issue"
            description="If a finding is inaccurate, a feature isn't working, or something looks broken — tell us directly."
            submitLabel="Send Report →"
            submitting={issueBusy}
            status={issueState}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!issueUrl.trim() || !issueBody.trim()) return;
              setIssueBusy(true);
              setIssueState("idle");
              const ok = await postContact(
                "issue",
                { siteUrl: issueUrl.trim(), description: issueBody.trim() },
                issueEmail
              );
              setIssueBusy(false);
              setIssueState(ok ? "ok" : "err");
              if (ok) {
                setIssueUrl("");
                setIssueBody("");
                setIssueEmail("");
              }
            }}
          >
            <FieldLabel>Your website URL (the one you scanned)</FieldLabel>
            <input
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              style={{ ...inputBase, marginBottom: 16 }}
              placeholder="https://example.com"
            />
            <FieldLabel>What's wrong</FieldLabel>
            <textarea
              value={issueBody}
              onChange={(e) => setIssueBody(e.target.value)}
              style={{ ...inputBase, minHeight: 120, resize: "vertical", marginBottom: 16 }}
            />
            <FieldLabel>Your email (optional)</FieldLabel>
            <input
              value={issueEmail}
              onChange={(e) => setIssueEmail(e.target.value)}
              style={inputBase}
              placeholder="you@company.com"
            />
          </PathwayCard>

          <PathwayCard
            kicker="MAKE IT BETTER"
            title="Share what should change"
            description="What's missing, what's confusing, what would make WebDoc more useful for your business."
            submitLabel="Send Feedback →"
            submitting={fbBusy}
            status={fbState}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!fbBody.trim()) return;
              setFbBusy(true);
              setFbState("idle");
              const ok = await postContact("feedback", { message: fbBody.trim() }, fbEmail);
              setFbBusy(false);
              setFbState(ok ? "ok" : "err");
              if (ok) {
                setFbBody("");
                setFbEmail("");
              }
            }}
          >
            <FieldLabel>Your feedback</FieldLabel>
            <textarea
              value={fbBody}
              onChange={(e) => setFbBody(e.target.value)}
              style={{ ...inputBase, minHeight: 160, resize: "vertical", marginBottom: 16 }}
            />
            <FieldLabel>Your email (optional)</FieldLabel>
            <input
              value={fbEmail}
              onChange={(e) => setFbEmail(e.target.value)}
              style={inputBase}
              placeholder="you@company.com"
            />
          </PathwayCard>

          <PathwayCard
            kicker="TELL YOUR STORY"
            title="What did WebDoc find?"
            description="Three questions. Your answers help us improve the product and may appear on the site."
            submitLabel="Share Your Story →"
            submitting={stBusy}
            status={stState}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!stQ1.trim() && !stQ2.trim() && !stQ3.trim()) return;
              setStBusy(true);
              setStState("idle");
              const ok = await postContact(
                "story",
                {
                  surprised: stQ1.trim(),
                  resolvedFirst: stQ2.trim(),
                  changedAfter: stQ3.trim(),
                  name: stName.trim() || undefined,
                  website: stSite.trim() || undefined,
                },
                undefined
              );
              setStBusy(false);
              setStState(ok ? "ok" : "err");
              if (ok) {
                setStQ1("");
                setStQ2("");
                setStQ3("");
                setStName("");
                setStSite("");
              }
            }}
          >
            <FieldLabel>What did WebDoc find that surprised you?</FieldLabel>
            <textarea
              value={stQ1}
              onChange={(e) => setStQ1(e.target.value)}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", marginBottom: 14 }}
            />
            <FieldLabel>What did you resolve first?</FieldLabel>
            <textarea
              value={stQ2}
              onChange={(e) => setStQ2(e.target.value)}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", marginBottom: 14 }}
            />
            <FieldLabel>What changed after?</FieldLabel>
            <textarea
              value={stQ3}
              onChange={(e) => setStQ3(e.target.value)}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", marginBottom: 14 }}
            />
            <FieldLabel>Your name or handle (optional)</FieldLabel>
            <input value={stName} onChange={(e) => setStName(e.target.value)} style={{ ...inputBase, marginBottom: 14 }} />
            <FieldLabel>Your website (optional)</FieldLabel>
            <input value={stSite} onChange={(e) => setStSite(e.target.value)} style={inputBase} />
          </PathwayCard>
        </div>

        <div style={{ marginTop: 56, paddingTop: 32, borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontFamily: BODY, fontSize: 14, color: MUTED, margin: 0 }}>Or email us directly:</p>
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              style={{
                display: "inline-block",
                marginTop: 10,
                fontFamily: MONO,
                fontSize: 13,
                color: CYAN,
                textDecoration: "none",
              }}
            >
              {contactEmail}
            </a>
          ) : (
            <p style={{ fontFamily: MONO, fontSize: 12, color: MUTED, marginTop: 10 }}>
              Set NEXT_PUBLIC_CONTACT_EMAIL in your environment.
            </p>
          )}
          <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED, margin: "18px 0 0 0", letterSpacing: "0.06em" }}>
            We respond within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
