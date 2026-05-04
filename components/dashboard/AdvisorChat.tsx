"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { formatWebDocScoreWithBand } from "@/lib/displayScoreColor";
import type { ReportPayload } from "@/lib/reportSchema";
import { getDashboardMoneyLeaks } from "@/lib/dashboardMoneyLeaks";

type StoredReportRow = {
  id: string;
  domain: string;
  created_at: string;
  analysis: ReportPayload;
};

const spaceMono = "var(--font-jetbrains-mono), var(--font-space-mono), monospace";

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, "$1")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function AdvisorChat({
  reports,
  userId,
  resetSignal,
  activeDomain = "",
  planLocked = false,
  onUpgrade,
}: {
  reports: StoredReportRow[];
  userId: string | null;
  resetSignal: number;
  activeDomain?: string;
  /** Free plan: same shell as Pro; input/send soft-disabled + upgrade strip. */
  planLocked?: boolean;
  onUpgrade?: () => void;
}) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const resolvedDomain = useMemo(() => {
    const t = activeDomain.trim();
    if (t) return t;
    const s = [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return s[0]?.domain ?? "";
  }, [activeDomain, reports]);

  useEffect(() => {
    const activeReports = reports
      .filter((r) => r.domain === resolvedDomain)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const latest = activeReports[0];
    if (!latest) return;

    const analysis = latest.analysis as unknown as Record<string, unknown>;
    const conversionScore =
      (typeof analysis.conversionScore === "number" ? analysis.conversionScore : null) ??
      (typeof analysis.healthScore === "number" ? analysis.healthScore : 0);
    const dimScoresRaw = analysis.dimensionScores ?? [];
    const dimScores = Array.isArray(dimScoresRaw) ? dimScoresRaw : [];
    const weakestDim =
      dimScores.length > 0
        ? [...dimScores].sort(
            (a: { score?: number }, b: { score?: number }) =>
              (a.score ?? 0) - (b.score ?? 0)
          )[0] as Record<string, unknown> | undefined
        : null;

    const leaksSorted = [...getDashboardMoneyLeaks(latest.analysis as ReportPayload)].sort(
      (a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0)
    );
    const topLeak = leaksSorted[0];
    const killerTitle = (topLeak?.revenueTitle?.trim() || topLeak?.title || "").trim();
    const rawSub = String(
      (topLeak as { exitTrigger?: string } | undefined)?.exitTrigger ??
        topLeak?.whyItMatters ??
        topLeak?.whatWeFound ??
        ""
    ).trim();
    const killerSentence = (() => {
      if (!rawSub) return "";
      const m = rawSub.match(/^[^.!?]+(?:[.!?]|$)/);
      return (m ? m[0] : rawSub.slice(0, 200)).trim();
    })();

    const weakestName = String(weakestDim?.dimension ?? weakestDim?.label ?? "").trim();
    const weakestScore = Number(weakestDim?.score ?? 0);

    const lines: string[] = [
      `${resolvedDomain} — ${formatWebDocScoreWithBand(conversionScore)}. This is what is suppressing conversions on this diagnostic.`,
    ];
    if (killerTitle) {
      const leakLine =
        killerSentence.length > 0
          ? `Your highest-priority revenue suppression finding: ${killerTitle}. ${killerSentence}`
          : `Your highest-priority revenue suppression finding: ${killerTitle}.`;
      lines.push("", leakLine);
    }
    if (weakestName) {
      lines.push("", `Weakest area: ${weakestName} at ${weakestScore}/100.`);
    }
    lines.push(
      "",
      `Ask me what to resolve first, how to rewrite your copy, or anything else about ${resolvedDomain}.`
    );

    const opening = lines.join("\n");

    setMessages([{ role: "assistant", content: opening }]);
  }, [resetSignal, reports, activeDomain, resolvedDomain]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, streaming]);

  async function send(messageText: string) {
    if (planLocked) return;
    if (!userId) return;
    const text = messageText.trim();
    if (!text || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    const conversationHistory = messages
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userId,
          activeDomain: resolvedDomain,
          conversationHistory,
        }),
      });
      if (!res.ok) throw new Error("Advisor request failed.");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream reader.");
      const decoder = new TextDecoder();

      let done = false;
      let pendingText = "";
      let rafScheduled = false;

      const flush = () => {
        if (!pendingText) {
          rafScheduled = false;
          return;
        }
        const toFlush = pendingText;
        pendingText = "";
        rafScheduled = false;
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          if (next[lastIdx]?.role === "assistant") {
            next[lastIdx] = {
              ...next[lastIdx],
              content: next[lastIdx]!.content + toFlush,
            };
          }
          return next;
        });
      };

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          pendingText += chunk;
          if (!rafScheduled) {
            rafScheduled = true;
            requestAnimationFrame(flush);
          }
        }
      }

      if (pendingText) {
        flush();
      }
    } catch {
      // eslint-disable-next-line no-console
      console.warn("Advisor error");
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (planLocked) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  const lastIdx = messages.length - 1;

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        background: "rgba(5,8,16,0.98)",
        border: "1px solid rgba(0,200,255,0.2)",
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "var(--cyan-glow-active)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(0,200,255,0.6), transparent)",
          pointerEvents: "none",
          zIndex: 1,
        }}
        aria-hidden
      />
      <style>{`
        .advisor-messages::-webkit-scrollbar {
          width: 4px;
        }
        .advisor-messages::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
        }
        .advisor-messages::-webkit-scrollbar-thumb {
          background: rgba(0,200,255,0.25);
          border-radius: 2px;
        }
        .advisor-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(0,200,255,0.4);
        }
        @keyframes advisorDot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid rgba(0,200,255,0.1)",
          background: "rgba(7,12,20,0.98)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--cyan)",
              animation: "livePulse 2s infinite",
              boxShadow: "0 0 8px rgba(0,200,255,0.6)",
              flexShrink: 0,
            }}
            aria-hidden
          />
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "3px",
              color: "var(--cyan)",
            }}
          >
            AI ADVISOR
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
              fontSize: 9,
              color: "var(--text-muted)",
            }}
          >
            · on this issue
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMessages([])}
          disabled={planLocked}
          style={{
            fontFamily: spaceMono,
            fontSize: 9,
            color: "var(--text-muted)",
            border: "1px solid rgba(0,200,255,0.12)",
            padding: "3px 10px",
            borderRadius: 3,
            cursor: planLocked ? "not-allowed" : "pointer",
            background: "transparent",
            flexShrink: 0,
            opacity: planLocked ? 0.45 : 1,
            pointerEvents: planLocked ? "none" : "auto",
          }}
        >
          CLEAR
        </button>
      </div>

      <div
        ref={messagesRef}
        className="advisor-messages"
        style={{
          height: 320,
          overflowY: "auto",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,200,255,0.15) transparent",
        }}
      >
        {planLocked ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <div
              style={{
                maxWidth: "70%",
                background: "rgba(0,200,255,0.08)",
                border: "1px solid rgba(0,200,255,0.15)",
                borderRadius: "12px 12px 2px 12px",
                padding: "10px 14px",
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                fontSize: 13,
                color: "#00C8FF",
                lineHeight: 1.55,
                opacity: 0.5,
                pointerEvents: "none",
              }}
            >
              What should I fix first?
            </div>
          </div>
        ) : null}
        {messages.map((m, i) => {
          const isLastAssistantStreamingEmpty =
            streaming && i === lastIdx && m.role === "assistant" && !m.content.trim();
          if (isLastAssistantStreamingEmpty) return null;
          return (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: m.role === "user" ? "75%" : "100%",
              }}
            >
              {m.role === "assistant" ? (
                <div
                  style={{
                    background: "rgba(0,200,255,0.04)",
                    border: "1px solid rgba(0,200,255,0.1)",
                    borderRadius: 4,
                    padding: "14px 18px",
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: "rgba(240,244,255,0.9)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {stripMarkdown(m.content).split("\n").map((line, j, arr) => (
                    <span key={j}>
                      {line}
                      {j < arr.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    padding: "14px 18px",
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontSize: 14,
                    lineHeight: 1.75,
                    color: "rgba(240,244,255,0.75)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.content.split("\n").map((line, j) => (
                    <span key={j}>
                      {line}
                      {j < m.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {streaming ? (
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "14px 18px",
              alignItems: "center",
              alignSelf: "flex-start",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(0,200,255,0.6)",
                  animation: `advisorDot 1.2s ease infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {planLocked ? (
        <div
          style={{
            background: "rgba(7,12,20,0.85)",
            borderTop: "1px solid rgba(0,200,255,0.1)",
            padding: "10px 24px",
            flexShrink: 0,
            textAlign: "left" as const,
          }}
        >
          <span
            style={{
              fontFamily: spaceMono,
              fontSize: 11,
              color: "#8899AA",
              lineHeight: 1.6,
            }}
          >
            AI Advisor requires Pro access.{` `}
            <button
              type="button"
              onClick={() => onUpgrade?.()}
              style={{
                fontFamily: spaceMono,
                fontSize: 11,
                color: "#00C8FF",
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                textDecoration: "none",
                verticalAlign: "baseline",
              }}
            >
              Upgrade →
            </button>
          </span>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "16px 24px 24px",
          borderTop: "1px solid rgba(0,200,255,0.08)",
          background: "rgba(5,8,16,0.6)",
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={input}
          readOnly={planLocked}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the diagnostic advisor..."
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 3,
            padding: "10px 16px",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: 14,
            color: "rgba(240,244,255,0.9)",
            outline: "none",
            boxSizing: "border-box",
            opacity: planLocked ? 0.5 : 1,
            cursor: planLocked ? "not-allowed" : "text",
            pointerEvents: planLocked ? "none" : "auto",
          }}
          onFocus={(e) => {
            if (planLocked) return;
            e.target.style.borderColor = "rgba(0,200,255,0.35)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        />
        <button
          type="button"
          onClick={() => void send(input)}
          disabled={planLocked || streaming || !input.trim()}
          style={{
            fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#00C8FF",
            background: "rgba(0,200,255,0.08)",
            border: "1px solid rgba(0,200,255,0.25)",
            borderRadius: 3,
            padding: "10px 20px",
            cursor: planLocked || streaming || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
            opacity: planLocked ? 0.4 : streaming || !input.trim() ? 0.5 : 1,
          }}
        >
          SEND →
        </button>
      </div>
    </section>
  );
}
