export default function DocsLoading() {
  return (
    <div style={{ background: "#050810", minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <style>{`@keyframes docsPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.85)}}`}</style>
      <div style={{ width: 10, height: 10, background: "#9D8CFF", animation: "docsPulse 1.4s ease-in-out infinite" }} />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#6E7587", letterSpacing: "0.2em" }}>LOADING...</span>
    </div>
  );
}
