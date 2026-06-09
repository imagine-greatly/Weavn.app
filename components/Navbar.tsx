"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

/**
 * Global navbar for webdoc.ai.
 * Refer to DESIGN_SYSTEM.md for glow tiers, animations, typography.
 * Fixed, z-100, 64px height. Precision instrument panel — clinical, with pulsing dot as the only "alive" element at rest.
 */

const CENTER_LINKS = [
  { label: "PRODUCT", href: "/product" },
  { label: "PLANS", href: "/pricing" },
  { label: "DEVELOPERS", href: "/developers" },
  { label: "DOCS", href: "/docs/api" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameModalSkipped, setNameModalSkipped] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserEmail(data.user?.email ?? null);
      const nextName = String(data.user?.user_metadata?.full_name ?? "").trim();
      setDisplayName(nextName);
      if (!nextName && data.user?.email) {
        const skipped = window.localStorage.getItem("webdoc_name_prompt_dismissed") === "1";
        setNameModalSkipped(skipped);
        if (!skipped) setShowNameModal(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ fullName?: string; email?: string }>;
      if (typeof customEvent.detail?.fullName === "string") {
        setDisplayName(customEvent.detail.fullName.trim());
      }
      if (typeof customEvent.detail?.email === "string") {
        setUserEmail(customEvent.detail.email);
      }
    };
    window.addEventListener("webdoc:profile-updated", onProfileUpdated as EventListener);
    return () => window.removeEventListener("webdoc:profile-updated", onProfileUpdated as EventListener);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const root = document.getElementById("nav-user-dropdown");
      if (root && !root.contains(target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [dropdownOpen]);

  const isLoggedIn = Boolean(userEmail);

  const navLinkTypography =
    "font-mono text-[10px] font-normal uppercase tracking-[2.5px] whitespace-nowrap";
  const navCtaTypography =
    "font-mono text-[10px] font-medium uppercase tracking-[1.5px] whitespace-nowrap";
  const ctaButtonClass =
    `group/cta flex items-center ${navCtaTypography} transition-[background-color,border-color,box-shadow,opacity] duration-150 ease-out hover:duration-150 md:duration-300`;

  const ctaOutlineStyle = {
    color: "#6F9BC6" as const,
    background: "transparent" as const,
    border: "1px solid rgba(111,155,198,0.35)",
    padding: "10px 20px",
    borderRadius: 0,
    boxShadow: "none" as const,
  };

  const initials = (() => {
    if (displayName) {
      const parts = displayName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
    }
    if (userEmail) return userEmail.charAt(0).toUpperCase();
    return "?";
  })();
  const hasDisplayName = Boolean(displayName);
  const fallbackEmail =
    userEmail && userEmail.length > 20 ? `${userEmail.slice(0, 20)}…` : (userEmail ?? "");

  async function saveDisplayName() {
    if (!displayNameInput.trim()) return;
    setNameSaving(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayNameInput.trim() } });
    setNameSaving(false);
    if (error) return;
    setDisplayName(displayNameInput.trim());
    setShowNameModal(false);
  }

  if (pathname === "/scan" || pathname.startsWith("/reports/")) return null;

  return (
    <>
    <header
      className="fixed top-0 left-0 right-0 z-[100] flex h-16 items-center justify-between overflow-visible border-b px-5 md:px-12"
      style={{
        background: "rgba(5,8,16,0.75)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderColor: "rgba(111,155,198,0.12)",
      }}
    >
      {/* Left — Logo: always landing (/) for every user */}
      <Link
        href="/"
        className="group flex min-w-0 flex-1 items-center"
        aria-label="WebDoc home"
        style={{ textDecoration: "none", color: "inherit", gap: "10px", cursor: "pointer" }}
      >
        <img
          src="/webdocai_logo_definitive.svg"
          alt=""
          width={56}
          height={56}
          style={{ display: 'block', flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "var(--font-orbitron), sans-serif",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1,
            display: "flex",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>webdoc</span>
          <span style={{ color: "#6F9BC6" }}>ai</span>
        </span>
      </Link>

      {/* Center — Navigation (desktop) or hamburger (mobile) */}
      <div className="flex flex-1 items-center justify-center">
        <nav className="hidden items-center gap-0 md:flex" aria-label="Main">
          {CENTER_LINKS.map((item, i) => (
            <span key={item.label} className="flex items-center gap-0">
              {i > 0 && (
                <span
                  className={`${navLinkTypography} mx-2`}
                  style={{ color: "var(--border-default)" }}
                  aria-hidden
                >
                  ·
                </span>
              )}
              <Link
                href={item.href}
                className={`${navLinkTypography} transition-colors duration-150`}
                style={{
                  color: pathname === item.href ? "#6F9BC6" : "#8899AA",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (pathname === item.href) return;
                  e.currentTarget.style.color = "#6F9BC6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = pathname === item.href ? "#6F9BC6" : "#8899AA";
                }}
              >
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
        <button
          type="button"
          className="nav-hamburger-btn flex h-10 w-10 items-center justify-center md:hidden"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu
            className="h-5 w-5"
            style={{ color: "var(--text-muted)" }}
          />
        </button>
      </div>

      {/* Right — Actions */}
      <div className="flex flex-1 flex-shrink-0 items-center justify-end gap-4">
        {!isLoggedIn ? (
          <Link
            href="/auth?tab=signin"
            className="hidden md:flex items-center"
            style={{
              border: "1px solid rgba(111,155,198,0.35)",
              background: "transparent",
              color: "#6F9BC6",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              padding: "8px 16px",
              borderRadius: 0,
              textDecoration: "none",
              transition: "border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(111,155,198,0.08)";
              e.currentTarget.style.borderColor = "rgba(111,155,198,0.6)";
              e.currentTarget.style.boxShadow = "var(--interactive-glow-active)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(111,155,198,0.35)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Sign in
          </Link>
        ) : (
          <div className="hidden items-center gap-4 md:flex">
            <a
              href="/dashboard"
              className={`${ctaButtonClass} shrink-0`}
              style={{ ...ctaOutlineStyle, textDecoration: "none" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(111,155,198,0.08)";
                e.currentTarget.style.borderColor = "rgba(111,155,198,0.6)";
                e.currentTarget.style.boxShadow = "var(--interactive-glow-active)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(111,155,198,0.35)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transitionDuration = "300ms";
              }}
            >
              DASHBOARD
              <span className="ml-1 inline-block transition-transform duration-150 group-hover/cta:translate-x-[3px]">
                →
              </span>
            </a>

            <div id="nav-user-dropdown" style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2"
                style={{
                  color: "var(--text-muted)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "1px solid #1A2035",
                    background: "#0A0F1E",
                    color: "#6F9BC6",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-space-mono), ui-monospace, monospace",
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  {initials}
                </span>
                <span
                  className="max-w-[180px] truncate"
                  style={{
                    color: hasDisplayName ? "#FFFFFF" : "#8899AA",
                    fontFamily: hasDisplayName
                      ? "Inter, ui-sans-serif, system-ui, sans-serif"
                      : "var(--font-space-mono), ui-monospace, monospace",
                    fontSize: hasDisplayName ? 13 : 12,
                  }}
                >
                  {hasDisplayName ? displayName : fallbackEmail}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 34,
                    background: "#0A0F1E",
                    border: "1px solid #1A2035",
                    borderRadius: 4,
                    padding: "8px 0",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    minWidth: 180,
                    zIndex: 50,
                  }}
                >
                  <a
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 16px",
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 12,
                      color: "#8899AA",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FFFFFF05";
                      e.currentTarget.style.color = "#FFFFFF";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#8899AA";
                    }}
                  >
                    Settings
                  </a>

                  <div style={{ borderTop: "1px solid #1A2035", margin: "6px 0" }} />
                  <button
                    type="button"
                    onClick={async () => {
                      setDropdownOpen(false);
                      const supabase = getSupabaseBrowserClient();
                      await supabase.auth.signOut();
                      setUserEmail(null);
                      setDisplayName("");
                      router.push("/");
                    }}
                    style={{
                      width: "100%",
                      display: "block",
                      padding: "10px 16px",
                      fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), monospace",
                      fontSize: 12,
                      color: "#FF2D2D",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#FF2D2D08";
                      e.currentTarget.style.color = "#FF2D2D";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#FF2D2D";
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>

    {mobileMenuOpen && (
      <div
        className="fixed inset-0 z-[95] md:hidden"
        style={{ top: 64 }}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          className="absolute inset-0 h-full w-full cursor-default border-none bg-black/55 p-0"
          style={{ margin: 0 }}
          aria-label="Close menu"
          onClick={() => setMobileMenuOpen(false)}
        />
        <nav
          className="relative z-[1] max-h-[min(72vh,520px)] overflow-y-auto border-b px-5 py-4"
          style={{
            background: "rgba(5,8,16,0.97)",
            borderColor: "rgba(28,28,46,0.9)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.45)",
          }}
          aria-label="Mobile main"
        >
          <ul className="flex list-none flex-col gap-0 p-0 m-0">
            {CENTER_LINKS.map((item) => (
              <li key={item.href} className="border-b border-[var(--border-default)] last:border-b-0">
                <Link
                  href={item.href}
                  className={`${navLinkTypography} flex min-h-[48px] items-center py-3 transition-colors duration-150 mobile-min-body-text`}
                  style={{
                    color: pathname === item.href ? "#6F9BC6" : "#8899AA",
                    textDecoration: "none",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div
            className="mt-4 flex flex-col gap-3 border-t pt-4"
            style={{ borderColor: "var(--border-default)" }}
          >
            {!isLoggedIn ? (
              <>
                <Link
                  href="/auth?tab=signin"
                  className="font-mono mobile-min-body-text py-2 transition-colors duration-150"
                  style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
              </>
            ) : (
              <a
                href="/dashboard"
                className={`${navCtaTypography} flex min-h-[48px] items-center justify-center px-4 py-3`}
                style={{ ...ctaOutlineStyle, textDecoration: "none", width: "100%" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                DASHBOARD →
              </a>
            )}
          </div>
        </nav>
      </div>
    )}
    {showNameModal && isLoggedIn && !nameModalSkipped ? (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5,8,16,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          zIndex: 130,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: "#0A0F1E",
            border: "1px solid #1A2035",
            borderRadius: 6,
            padding: 28,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 24, borderTop: "1px solid rgba(111,155,198,0.5)", borderLeft: "1px solid rgba(111,155,198,0.5)" }} />
          <div style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, borderTop: "1px solid rgba(111,155,198,0.5)", borderRight: "1px solid rgba(111,155,198,0.5)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 24, height: 24, borderBottom: "1px solid rgba(111,155,198,0.5)", borderLeft: "1px solid rgba(111,155,198,0.5)" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderBottom: "1px solid rgba(111,155,198,0.5)", borderRight: "1px solid rgba(111,155,198,0.5)" }} />
          <div style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", color: "#FFFFFF", fontSize: 20, marginBottom: 8 }}>
            Set Your Display Name
          </div>
          <div style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace", color: "#8899AA", fontSize: 13, marginBottom: 14 }}>
            Your name appears in your account and diagnostic reports.
          </div>
          <div style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace", fontSize: 11, letterSpacing: "0.08em", color: "#8899AA", marginBottom: 8 }}>
            DISPLAY NAME
          </div>
          <input
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            placeholder="Your name"
            style={{
              width: "100%",
              height: 48,
              borderRadius: 4,
              border: "1px solid #1A2035",
              background: "#080D18",
              color: "#FFFFFF",
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              fontSize: 14,
              padding: "0 14px",
              marginBottom: 14,
              boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={() => void saveDisplayName()}
            disabled={nameSaving || !displayNameInput.trim()}
            style={{
              height: 44,
              minWidth: 160,
              borderRadius: 4,
              border: "1px solid #FFFFFF30",
              background: "transparent",
              color: "#FFFFFF",
              fontFamily: "var(--font-space-mono), ui-monospace, monospace",
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0 18px",
              cursor: nameSaving || !displayNameInput.trim() ? "not-allowed" : "pointer",
            }}
          >
            {nameSaving ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.setItem("webdoc_name_prompt_dismissed", "1");
              setNameModalSkipped(true);
              setShowNameModal(false);
            }}
            style={{
              marginTop: 12,
              border: "none",
              background: "transparent",
              color: "#8899AA",
              fontFamily: "var(--font-space-mono), ui-monospace, monospace",
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
