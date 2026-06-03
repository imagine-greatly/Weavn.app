import Link from "next/link";

const SM = "'Space Mono', 'Courier New', monospace";
const SG = "'Space Grotesk', sans-serif";

export default function NotFound() {
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
            color: "#00C8FF",
            margin: "0 0 8px 0",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          404
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
          Page not found
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
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
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
          </Link>
          <Link
            href="/docs/api"
            style={{
              fontFamily: SM,
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "#00C8FF",
              background: "transparent",
              border: "1px solid rgba(0,200,255,0.4)",
              borderRadius: 4,
              padding: "10px 22px",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            View docs
          </Link>
        </div>
      </div>
    </div>
  );
}
