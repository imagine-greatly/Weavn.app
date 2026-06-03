"use client";

const SM = "'Space Mono', 'Courier New', monospace";
const SG = "'Space Grotesk', sans-serif";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        background: "#050810",
        minHeight: "100svh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <p
          style={{
            fontFamily: SM,
            fontSize: 96,
            fontWeight: 700,
            color: "#ef4444",
            margin: "0 0 8px 0",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          500
        </p>
        <h1
          style={{
            fontFamily: SG,
            fontSize: 24,
            fontWeight: 600,
            color: "#F0F4FF",
            margin: "0 0 12px 0",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontFamily: SM,
            fontSize: 13,
            color: "rgba(240,244,255,0.45)",
            margin: "0 0 36px 0",
            letterSpacing: "0.04em",
          }}
        >
          An unexpected error occurred.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/"
            style={{
              fontFamily: SM,
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "#050810",
              background: "#00C8FF",
              border: "none",
              borderRadius: 4,
              padding: "10px 22px",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            Go home
          </a>
          <button
            type="button"
            onClick={reset}
            style={{
              fontFamily: SM,
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "#00C8FF",
              background: "transparent",
              border: "1px solid rgba(0,200,255,0.4)",
              borderRadius: 4,
              padding: "10px 22px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
