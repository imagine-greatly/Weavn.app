"use client";

export default function BackgroundField() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    >
      {/* Layer 1 — Base */}
      <div
        className="absolute inset-0"
        style={{ background: "#050810" }}
      />

      {/* Layer 3 — Atmospheric bloom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(111,155,198,0.025) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
