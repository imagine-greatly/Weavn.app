"use client";

import Link from "next/link";

const SM = "'Space Mono', 'Courier New', monospace";
const CYAN = "#00C8FF";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(240,244,255,0.4)";

const NAV = [
  { section: "GETTING STARTED", items: [
    { label: "Quick start", id: "getting-started", href: "/docs/api" },
    { label: "Authentication", id: "authentication", href: "/docs/authentication" },
  ]},
  { section: "API REFERENCE", items: [
    { label: "POST /v1/scan", id: "scan", href: "/docs/scan" },
    { label: "GET /v1/scans", id: "scans", href: "/docs/scans" },
    { label: "GET /v1/scans/:id", id: "scans-id", href: "/docs/scans" },
    { label: "Webhooks", id: "webhooks", href: "/docs/webhooks" },
  ]},
  { section: "CODE EXAMPLES", items: [
    { label: "curl", id: "curl", href: "/docs/examples" },
    { label: "JavaScript", id: "javascript", href: "/docs/examples" },
    { label: "Python", id: "python", href: "/docs/examples" },
    { label: "n8n workflow", id: "n8n", href: "/docs/examples" },
  ]},
];

export default function DocsLayout({ children, activeId }: { children: React.ReactNode; activeId: string }) {
  return (
    <div style={{ background: "#050810", minHeight: "100vh", paddingTop: 64 }}>
      <div style={{ display: "flex" }}>
        <aside style={{
          position: "sticky",
          top: 64,
          height: "calc(100vh - 64px)",
          width: 240,
          flexShrink: 0,
          overflowY: "auto",
          borderRight: `1px solid ${BORDER}`,
          padding: "32px 16px 32px 24px",
        }}>
          <nav>
            {NAV.map(group => (
              <div key={group.section} style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: SM, fontSize: 10, color: MUTED, letterSpacing: "0.2em", marginBottom: 10 }}>
                  {group.section}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {group.items.map(item => {
                    const isActive = activeId === item.id;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          style={{
                            display: "block",
                            padding: "8px 12px",
                            borderLeft: `2px solid ${isActive ? CYAN : "transparent"}`,
                            fontFamily: SM,
                            fontSize: 13,
                            color: isActive ? CYAN : MUTED,
                            textDecoration: "none",
                            transition: "color 0.15s",
                          }}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main style={{ flex: 1, padding: "48px 40px 80px 48px", maxWidth: "min(880px, calc(100vw - 280px))" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
