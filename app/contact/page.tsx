export default function ContactPage() {
  return (
    <div style={{ minHeight: "100svh", background: "var(--bg-base)", padding: "96px 24px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
          Support
        </h1>
        <p
          className="font-sans"
          style={{ fontSize: 18, color: "#8899AA", margin: "20px 0 0 0", lineHeight: 1.6 }}
        >
          For support or questions, email us at{" "}
          <a
            href="mailto:devon@webdocai.com"
            className="font-mono"
            style={{ color: "#00C8FF", textDecoration: "none", fontSize: 16 }}
          >
            devon@webdocai.com
          </a>
        </p>
      </div>
    </div>
  );
}
