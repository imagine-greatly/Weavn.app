"use client";

import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import PageLoadSkeleton from "@/components/PageLoadSkeleton";

type SettingsSection = "profile" | "security" | "subscription" | "notifications" | "account";
type PlanType = "free" | "pro" | "agency";
type SubscriptionData = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: number | null;
  amount: number | null;
  currency: string;
};
type PaymentMethodData = { brand: string; last4: string; exp: string };
type LastScan = { domain: string | null; created_at: string | null };

/** Normalize plan from a profiles row (handles alternate column names / casing). */
function normalizePlanFromProfile(row: Record<string, unknown> | null | undefined): "free" | "pro" | "agency" {
  if (!row || typeof row !== "object") return "free";
  if (row.is_pro === true) return "pro";
  const raw = row.plan ?? row.subscription_tier ?? row.subscription ?? row.tier;
  if (raw == null || raw === "") return "free";
  const s = String(raw).trim().toLowerCase();
  if (s === "agency") return "agency";
  if (s === "pro" || s === "professional" || s === "paid" || s === "business" || s === "premium") return "pro";
  return "free";
}

const MONO = "var(--font-space-mono), ui-monospace, monospace";
const INTER = "Inter, ui-sans-serif, system-ui, sans-serif";
const GROTESK = "var(--font-space-grotesk), sans-serif";
const C = {
  base: "#050810",
  surface: "#0A0F1E",
  inner: "#080D18",
  border: "#1A2035",
  cyan: "#00C8FF",
  green: "#00E676",
  red: "#FF2D2D",
  amber: "#FFB300",
  white: "#FFFFFF",
  muted: "#8899AA",
} as const;

const SIDEBAR_ITEMS: Array<{ id: SettingsSection; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "subscription", label: "Subscription" },
  { id: "notifications", label: "Notifications" },
  { id: "account", label: "Account" },
];

const panelStyle: CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: 32,
  marginBottom: 24,
};

const sectionLabelStyle: CSSProperties = {
  fontFamily: MONO,
  color: C.muted,
  fontSize: 11,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 12,
};

function fieldLabel(text: string): CSSProperties {
  return { fontFamily: MONO, color: C.muted, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 };
}
function inputStyle(hasError = false): CSSProperties {
  return {
    width: "100%",
    height: 48,
    borderRadius: 4,
    border: `1px solid ${hasError ? C.red : C.border}`,
    background: C.inner,
    color: C.white,
    fontFamily: INTER,
    fontSize: 14,
    padding: "0 14px",
    boxSizing: "border-box",
  };
}
/** Tier 1 — primary actions (Save, Update, Terminate Other Sessions) */
function tier1(): CSSProperties {
  return {
    height: 44,
    minWidth: 140,
    width: "auto",
    borderRadius: 4,
    border: `1px solid ${C.cyan}`,
    background: "transparent",
    color: C.cyan,
    fontFamily: MONO,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: 13,
    padding: "0 20px",
    cursor: "pointer",
    boxSizing: "border-box",
  };
}
/** Tier 2 — secondary (Update Payment, Billing History, modal keep actions) */
function tier2(): CSSProperties {
  return {
    height: 44,
    minWidth: 140,
    width: "auto",
    borderRadius: 4,
    border: "1px solid #1A2035",
    background: "transparent",
    color: "#8899AA",
    fontFamily: MONO,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: 13,
    padding: "0 20px",
    cursor: "pointer",
    boxSizing: "border-box",
  };
}
/** Tier 3 — destructive (Cancel, Delete) */
function tier3(minWidth = 140): CSSProperties {
  return {
    height: 44,
    minWidth,
    width: "auto",
    borderRadius: 4,
    border: "1px solid #FF2D2D40",
    background: "transparent",
    color: C.red,
    fontFamily: MONO,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: 13,
    padding: "0 20px",
    cursor: "pointer",
    boxSizing: "border-box",
  };
}
function upgradeButtonStyle(): CSSProperties {
  return {
    height: 44,
    minWidth: 220,
    borderRadius: 4,
    border: "1px solid #FFFFFF",
    background: "#FFFFFF",
    color: C.base,
    fontFamily: MONO,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontSize: 13,
    padding: "0 20px",
    cursor: "pointer",
  };
}

function onTier1Enter(e: MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = "#00C8FF10";
}
function onTier1Leave(e: MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.background = "transparent";
}
function onTier2Enter(e: MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "#8899AA40";
  e.currentTarget.style.color = "#FFFFFF";
}
function onTier2Leave(e: MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "#1A2035";
  e.currentTarget.style.color = "#8899AA";
}
function onTier3Enter(e: MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "#FF2D2D";
  e.currentTarget.style.background = "#FF2D2D08";
}
function onTier3Leave(e: MouseEvent<HTMLButtonElement>) {
  e.currentTarget.style.borderColor = "#FF2D2D40";
  e.currentTarget.style.background = "transparent";
}
const EM_DASH = "\u2014";

function fmtDate(tsSeconds: number | null | undefined): string {
  if (!tsSeconds) return EM_DASH;
  return new Date(tsSeconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtCurrency(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return EM_DASH;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: (currency || "USD").toUpperCase() }).format(amount / 100);
}
function timeAgo(value: string | null): string {
  if (!value) return "No diagnostic scans yet.";
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "less than 1 hour ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
function initialsFrom(fullName: string, email: string): string {
  const normalized = fullName.trim();
  if (!normalized) return email ? email[0].toUpperCase() : "?";
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "none",
        background: checked ? "#00C8FF20" : "#1A2035",
        padding: 2,
        cursor: "pointer",
        display: "flex",
        justifyContent: checked ? "flex-end" : "flex-start",
        transition: "all 200ms ease",
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: checked ? C.cyan : C.muted, transition: "all 200ms ease" }} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [booting, setBooting] = useState(true);
  const [active, setActive] = useState<SettingsSection>("profile");
  const [accessToken, setAccessToken] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<PlanType>("free");
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [scanUsage, setScanUsage] = useState(0);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [emailIdentity, setEmailIdentity] = useState(false);
  const [googleIdentity, setGoogleIdentity] = useState(false);
  const [notificationScanComplete, setNotificationScanComplete] = useState(true);
  const [notificationProductUpdates, setNotificationProductUpdates] = useState(true);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [forgotPwNotice, setForgotPwNotice] = useState<null | { ok: boolean; text: string }>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string>("");
  const [sessionAgent, setSessionAgent] = useState<string>("");
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("");
  const [sessionError, setSessionError] = useState("");
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [subscriptionError, setSubscriptionError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<"" | "scan" | "product">("");
  const [notificationError, setNotificationError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");

  const pwReqLen = newPassword.length >= 8;
  const pwReqUpper = /[A-Z]/.test(newPassword);
  const pwReqNum = /\d/.test(newPassword);
  const pwAllGood = pwReqLen && pwReqUpper && pwReqNum;
  const canDelete = deleteConfirmEmail.trim().toLowerCase() === email.trim().toLowerCase();
  const scanLimit = plan === "agency" ? 10 : plan === "pro" ? 5 : 1;
  const scanPct = Math.min(100, Math.round((scanUsage / Math.max(1, scanLimit)) * 100));

  async function loadSubscription(token: string): Promise<PlanType> {
    const res = await fetch("/api/settings/subscription", { method: "GET", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new Error(String(json.error ?? "Failed to load subscription."));
    const rawPlan = (json.plan as string) ?? "free";
    const apiPlan: PlanType = rawPlan === "agency" ? "agency" : rawPlan === "pro" ? "pro" : "free";
    setSubscription((json.subscription as SubscriptionData | null) ?? null);
    setPaymentMethod((json.payment_method as PaymentMethodData | null) ?? null);
    setNotificationScanComplete(Boolean(json.notification_scan_complete ?? true));
    setNotificationProductUpdates(Boolean(json.notification_product_updates ?? true));
    return apiPlan;
  }

  /** Prefer normalized plan from profiles row; fall back to API when no row. */
  async function applyPlanFromProfile(uid: string, apiFallback: PlanType, logRow: boolean) {
    let prof = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (!prof.data) {
      prof = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    }
    const profileRow = (prof.data as Record<string, unknown> | null) ?? null;
    if (logRow) console.log("[settings] profiles full row:", profileRow, prof.error ?? null);
    setPlan(profileRow ? normalizePlanFromProfile(profileRow) : apiFallback);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBooting(true);
      const { data: userResult } = await supabase.auth.getUser();
      const user = userResult.user;
      if (!user) {
        router.push("/auth?tab=signin");
        return;
      }
      const { data: sessionResult } = await supabase.auth.getSession();
      const token = sessionResult.session?.access_token ?? "";
      if (!token) {
        router.push("/auth?tab=signin");
        return;
      }
      if (cancelled) return;
      setAccessToken(token);
      setUserId(user.id);
      setEmail(user.email ?? "");
      setFullName(String(user.user_metadata?.full_name ?? ""));
      setEmailIdentity((user.identities ?? []).some((i) => i.provider === "email"));
      setGoogleIdentity((user.identities ?? []).some((i) => i.provider === "google"));
      const startedAt = (sessionResult.session as unknown as { created_at?: string } | null)?.created_at ?? new Date().toISOString();
      setSessionStartedAt(startedAt);
      setSessionAgent(navigator.userAgent);
      let apiPlan: PlanType = "free";
      try {
        apiPlan = await loadSubscription(token);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const [usageRes, scanRes] = await Promise.all([
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", monthStart.toISOString()),
          supabase.from("reports").select("domain, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        setScanUsage(usageRes.count ?? 0);
        setLastScan((scanRes.data as LastScan | null) ?? null);
      } catch (err) {
        if (!cancelled) setSubscriptionError(err instanceof Error ? err.message : "Failed to load subscription.");
      }
      if (!cancelled) await applyPlanFromProfile(user.id, apiPlan, true);
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function saveProfile() {
    setProfileError("");
    setProfileStatus("");
    if (!email.trim()) {
      setProfileError("Email address is required.");
      return;
    }
    setProfileBusy(true);
    try {
      const [metaRes, emailRes] = await Promise.all([
        supabase.auth.updateUser({ data: { full_name: fullName.trim() } }),
        supabase.auth.updateUser({ email: email.trim() }),
      ]);
      if (metaRes.error) throw new Error(metaRes.error.message ?? "Profile update failed.");
      if (emailRes.error) throw new Error(emailRes.error.message ?? "Email update failed.");
      setProfileStatus("Saved");
      window.dispatchEvent(new CustomEvent("webdoc:profile-updated", { detail: { fullName: fullName.trim(), email: email.trim() } }));
      setTimeout(() => setProfileStatus(""), 2000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "An error occurred. Try again.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword() {
    setPasswordError("");
    setPasswordStatus("");
    if (!currentPassword || !newPassword || !confirmPassword) return setPasswordError("All password fields are required.");
    if (!pwAllGood) return setPasswordError("New password does not meet requirements.");
    if (newPassword !== confirmPassword) return setPasswordError("New passwords do not match.");
    setPasswordBusy(true);
    try {
      const verify = await supabase.auth.signInWithPassword({ email: email.trim(), password: currentPassword });
      if (verify.error) return setPasswordError("Current password is incorrect.");
      const update = await supabase.auth.updateUser({ password: newPassword });
      if (update.error) throw new Error(update.error.message);
      setPasswordStatus("Updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordStatus(""), 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "An error occurred. Try again.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function sendForgotCurrentPasswordEmail() {
    setForgotPwNotice(null);
    const em = email.trim();
    if (!em) {
      setForgotPwNotice({ ok: false, text: "Could not send reset email. Try again." });
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.resetPasswordForEmail(em, {
      redirectTo: origin ? `${origin}/auth/reset-password` : undefined,
    });
    if (error) setForgotPwNotice({ ok: false, text: "Could not send reset email. Try again." });
    else setForgotPwNotice({ ok: true, text: `Password reset email sent to ${em}.` });
  }

  async function signOutOtherSessions() {
    setSessionStatus("");
    setSessionError("");
    setSessionBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw new Error(error.message);
      setSessionStatus("Other sessions terminated.");
      setTimeout(() => setSessionStatus(""), 2000);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "An error occurred. Try again.");
    } finally {
      setSessionBusy(false);
    }
  }

  async function startCheckout() {
    try {
      setSubscriptionBusy(true);
      setSubscriptionError("");
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Authentication required.");
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout session failed.");
      window.location.href = json.url;
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : "An error occurred. Try again.");
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function openPortal() {
    try {
      setSubscriptionBusy(true);
      setSubscriptionError("");
      const res = await fetch("/api/settings/portal", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Portal request failed.");
      window.location.href = json.url;
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : "An error occurred. Try again.");
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function cancelAtPeriodEnd() {
    try {
      setSubscriptionBusy(true);
      setSubscriptionError("");
      const res = await fetch("/api/settings/cancel-subscription", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
      const json = (await res.json().catch(() => ({}))) as { error?: string; current_period_end?: number };
      if (!res.ok) throw new Error(json.error ?? "Cancellation failed.");
      setShowCancelModal(false);
      setSubscriptionStatus(`Subscription cancelled. Pro access remains active until ${fmtDate(json.current_period_end ?? null)}.`);
      const apiPlan = await loadSubscription(accessToken);
      await applyPlanFromProfile(userId, apiPlan, false);
    } catch (err) {
      setSubscriptionError(err instanceof Error ? err.message : "An error occurred. Try again.");
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function updateNotification(next: boolean, key: "scan" | "product") {
    setNotificationError("");
    setNotificationStatus("");
    const patch: Record<string, boolean> = {};
    if (key === "scan") patch.notification_scan_complete = next;
    if (key === "product") patch.notification_product_updates = next;
    if (key === "scan") setNotificationScanComplete(next);
    if (key === "product") setNotificationProductUpdates(next);
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) {
      setNotificationError(error.message);
      if (key === "scan") setNotificationScanComplete(!next);
      if (key === "product") setNotificationProductUpdates(!next);
      return;
    }
    setNotificationStatus(key);
    setTimeout(() => setNotificationStatus(""), 2000);
  }

  async function deleteAccount() {
    setDeleteError("");
    if (!canDelete) return;
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: deleteConfirmEmail }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Account deletion failed.");
      await supabase.auth.signOut();
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "An error occurred. Try again.");
      setDeleteBusy(false);
    }
  }

  if (booting) return <PageLoadSkeleton bars={5} maxWidth={400} />;

  return (
    <div style={{ minHeight: "100svh", paddingTop: 76, background: C.base }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ ...sectionLabelStyle, marginBottom: 20 }}>Account Settings</div>
        <div className="settings-grid" style={{ display: "flex", alignItems: "flex-start" }}>
          <aside
            className="settings-sidebar"
            style={{
              width: 220,
              minHeight: "calc(100svh - 140px)",
              position: "sticky",
              top: 80,
              borderRight: `1px solid ${C.border}`,
              background: C.surface,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(item.id)}
                  style={{
                    width: "100%",
                    height: 44,
                    textAlign: "left",
                    padding: "0 24px",
                    border: "none",
                    borderLeft: isActive ? `2px solid ${C.cyan}` : "2px solid transparent",
                    background: isActive ? "#00C8FF08" : "transparent",
                    color: isActive ? C.white : C.muted,
                    fontFamily: MONO,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = C.white;
                      e.currentTarget.style.background = "#FFFFFF05";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = C.muted;
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {item.label}
                </button>
              );
            })}
            <div style={{ flex: 1, minHeight: 16 }} aria-hidden />
            <div style={{ padding: "0 24px 24px", color: C.muted, fontFamily: MONO, fontSize: 10 }}>{"G \u2192 S  Settings"}</div>
          </aside>

          <main className="settings-main" style={{ flex: 1, maxWidth: 680, paddingLeft: 48 }}>
            {active === "profile" ? (
              <section>
                <div style={sectionLabelStyle}>Profile</div>
                <div style={panelStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, display: "grid", placeItems: "center", fontFamily: MONO, color: fullName.trim() ? C.cyan : C.muted, fontSize: 16 }}>
                      {fullName.trim() ? initialsFrom(fullName, email) : "?"}
                    </div>
                    <div>
                      <div style={{ color: C.white, fontFamily: INTER, fontSize: 15 }}>{fullName.trim() || "No name set"}</div>
                      <div style={{ color: C.muted, fontFamily: MONO, fontSize: 13 }}>{email}</div>
                      <div style={{ color: C.muted, fontFamily: MONO, fontSize: 11 }}>
                        {lastScan?.domain
                          ? `Last diagnostic scan: ${lastScan.domain} ${EM_DASH} ${timeAgo(lastScan.created_at)}`
                          : "No diagnostic scans yet."}
                      </div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, margin: "24px 0" }} />
                  <div style={{ marginBottom: 18 }}>
                    <div style={fieldLabel("Display Name")}>DISPLAY NAME</div>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" style={inputStyle(false)} />
                    <div style={{ marginTop: 8, fontFamily: MONO, color: C.muted, fontSize: 11 }}>Displayed in your account and diagnostic reports.</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={fieldLabel("Email Address")}>EMAIL ADDRESS</div>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle(false)} />
                  </div>
                  <div style={{ marginBottom: 20, fontFamily: MONO, color: C.muted, fontSize: 11 }}>
                    Email change requires verification from both current and new address.
                  </div>
                  <button
                    type="button"
                    disabled={profileBusy}
                    onClick={() => void saveProfile()}
                    style={tier1()}
                    onMouseEnter={onTier1Enter}
                    onMouseLeave={onTier1Leave}
                  >
                    {profileBusy ? "Saving" : "Save"}
                  </button>
                  {profileError ? <div style={{ marginTop: 10, color: C.red, fontFamily: MONO, fontSize: 12 }}>{profileError}</div> : null}
                </div>
              </section>
            ) : null}

            {active === "security" ? (
              <section>
                <div style={sectionLabelStyle}>Security</div>
                <div style={panelStyle}>
                  <div style={{ ...fieldLabel("Password"), marginBottom: 14 }}>PASSWORD</div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={fieldLabel("CURRENT PASSWORD")}>CURRENT PASSWORD</div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={{ ...inputStyle(false), paddingRight: 76 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 0,
                          bottom: 0,
                          border: "none",
                          background: "transparent",
                          color: C.muted,
                          fontFamily: MONO,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {showCurrentPw ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void sendForgotCurrentPasswordEmail()}
                      style={{
                        marginTop: 8,
                        padding: 0,
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontFamily: MONO,
                        fontSize: 11,
                        color: "#8899AA",
                        textDecoration: "none",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = C.cyan;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#8899AA";
                      }}
                    >
                      Forgot your current password?
                    </button>
                    {forgotPwNotice ? (
                      <div
                        style={{
                          marginTop: 8,
                          fontFamily: MONO,
                          fontSize: 11,
                          color: forgotPwNotice.ok ? C.green : C.red,
                        }}
                      >
                        {forgotPwNotice.text}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={fieldLabel("NEW PASSWORD")}>NEW PASSWORD</div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{ ...inputStyle(false), paddingRight: 76 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 0,
                          bottom: 0,
                          border: "none",
                          background: "transparent",
                          color: C.muted,
                          fontFamily: MONO,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {showNewPw ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={fieldLabel("CONFIRM NEW PASSWORD")}>CONFIRM NEW PASSWORD</div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{ ...inputStyle(false), paddingRight: 76 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 0,
                          bottom: 0,
                          border: "none",
                          background: "transparent",
                          color: C.muted,
                          fontFamily: MONO,
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        {showConfirmPw ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 14, fontFamily: MONO, fontSize: 11, lineHeight: 1.8 }}>
                    <div style={{ color: pwReqLen ? C.green : C.muted, transition: "color 200ms ease" }}>
                      {pwReqLen ? "\u2713 " : "\u2014 "}Minimum 8 characters
                    </div>
                    <div style={{ color: pwReqUpper ? C.green : C.muted, transition: "color 200ms ease" }}>
                      {pwReqUpper ? "\u2713 " : "\u2014 "}At least one uppercase letter
                    </div>
                    <div style={{ color: pwReqNum ? C.green : C.muted, transition: "color 200ms ease" }}>
                      {pwReqNum ? "\u2713 " : "\u2014 "}At least one number
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={passwordBusy}
                    onClick={() => void savePassword()}
                    style={tier1()}
                    onMouseEnter={onTier1Enter}
                    onMouseLeave={onTier1Leave}
                  >
                    {passwordBusy ? "Updating" : "Update"}
                  </button>
                  {passwordError ? <div style={{ marginTop: 10, color: C.red, fontFamily: MONO, fontSize: 12 }}>{passwordError}</div> : null}
                  <div style={{ ...fieldLabel("Sessions"), marginTop: 28, marginBottom: 10 }}>SESSIONS</div>
                  <div style={{ background: C.inner, border: `1px solid ${C.border}`, borderRadius: 4, padding: 16, marginBottom: 14 }}>
                    <div style={{ color: C.white, fontSize: 13, fontFamily: INTER, marginBottom: 4 }}>Current Session</div>
                    <div style={{ color: C.muted, fontSize: 11, fontFamily: MONO }}>{sessionAgent || "Current browser session"}</div>
                    <div style={{ color: C.muted, fontSize: 11, fontFamily: MONO }}>
                      Started {sessionStartedAt ? new Date(sessionStartedAt).toLocaleString() : EM_DASH}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={sessionBusy}
                    onClick={() => void signOutOtherSessions()}
                    style={tier1()}
                    onMouseEnter={onTier1Enter}
                    onMouseLeave={onTier1Leave}
                  >
                    {sessionBusy ? "Terminating" : "Terminate Other Sessions"}
                  </button>
                  {sessionStatus ? <div style={{ marginTop: 10, color: C.green, fontFamily: MONO, fontSize: 12 }}>{sessionStatus}</div> : null}
                  {sessionError ? <div style={{ marginTop: 10, color: C.red, fontFamily: MONO, fontSize: 12 }}>{sessionError}</div> : null}
                </div>
              </section>
            ) : null}

            {active === "subscription" ? (
              <section>
                <div style={sectionLabelStyle}>Subscription</div>
                <div style={panelStyle}>
                  <div style={{ background: C.inner, border: `1px solid ${C.border}`, borderRadius: 4, padding: 20, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ color: C.white, fontFamily: GROTESK, fontSize: 18 }}>{plan === "agency" ? "Agency Plan" : plan === "pro" ? "Pro Plan" : "Free Plan"}</div>
                      <div style={{ color: plan === "agency" || plan === "pro" ? C.green : C.muted, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em" }}>{plan === "agency" ? "ACTIVE" : plan === "pro" ? "ACTIVE" : "FREE"}</div>
                    </div>
                    {plan === "pro" || plan === "agency" ? (
                      <>
                        <div style={{ marginTop: 12, color: C.muted, fontFamily: MONO, fontSize: 13 }}>
                          {`${fmtCurrency(subscription?.amount ?? null, subscription?.currency ?? "USD")}/month \u00b7 Renews ${fmtDate(subscription?.current_period_end ?? null)}`}
                        </div>
                        <div style={{ marginTop: 8, color: C.muted, fontFamily: MONO, fontSize: 13 }}>
                          {paymentMethod
                            ? `${paymentMethod.brand.toUpperCase()} ending ${paymentMethod.last4} \u00b7 Expires ${paymentMethod.exp}`
                            : "Payment method unavailable"}
                        </div>
                      </>
                    ) : null}
                    <div style={{ marginTop: 14, color: C.muted, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em" }}>DIAGNOSTIC SCANS THIS MONTH</div>
                    <div style={{ marginTop: 8, width: "100%", height: 2, background: C.border }}>
                      <div style={{ width: `${scanPct}%`, height: "100%", background: plan === "pro" || plan === "agency" ? C.cyan : scanUsage >= scanLimit ? C.red : C.amber }} />
                    </div>
                    <div style={{ marginTop: 8, color: scanUsage >= scanLimit ? C.red : C.muted, fontFamily: MONO, fontSize: 11 }}>
                      {scanUsage >= scanLimit && plan === "free" ? "Scan limit reached. Upgrade to continue." : `${scanUsage} of ${scanLimit} sites used`}
                    </div>
                  </div>
                  {plan === "free" ? (
                    <div style={{ background: C.surface, border: "1px solid #00C8FF20", borderLeft: `3px solid ${C.cyan}`, borderRadius: 4, padding: 20 }}>
                      <div style={{ color: C.cyan, fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", marginBottom: 10 }}>UPGRADE TO PRO</div>
                      <div style={{ color: C.muted, fontFamily: MONO, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>Full diagnostic access. Up to 5 active site scans. Complete finding set with revenue impact ranking and exact resolutions.</div>
                      <button type="button" disabled={subscriptionBusy} onClick={() => void startCheckout()} style={upgradeButtonStyle()} onMouseEnter={(e) => { e.currentTarget.style.background = "#E8E8E8"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}>
                        Upgrade to Pro Diagnostic
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={subscriptionBusy}
                        onClick={() => void openPortal()}
                        style={tier2()}
                        onMouseEnter={onTier2Enter}
                        onMouseLeave={onTier2Leave}
                      >
                        Update Payment
                      </button>
                      <button
                        type="button"
                        disabled={subscriptionBusy}
                        onClick={() => void openPortal()}
                        style={tier2()}
                        onMouseEnter={onTier2Enter}
                        onMouseLeave={onTier2Leave}
                      >
                        Billing History
                      </button>
                      <button
                        type="button"
                        disabled={subscriptionBusy}
                        onClick={() => setShowCancelModal(true)}
                        style={tier3()}
                        onMouseEnter={onTier3Enter}
                        onMouseLeave={onTier3Leave}
                      >
                        Cancel Subscription
                      </button>
                    </div>
                  )}
                  <div style={{ ...fieldLabel("Connected Accounts"), marginTop: 24, marginBottom: 10 }}>CONNECTED ACCOUNTS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ background: C.inner, border: `1px solid ${C.border}`, borderRadius: 4, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: C.white, fontFamily: MONO, fontSize: 13 }}>Email / Password</div>
                      <div style={{ color: emailIdentity ? C.green : C.muted, fontFamily: MONO, fontSize: 11 }}>{emailIdentity ? "Connected" : "Not set"}</div>
                    </div>
                    <div style={{ background: C.inner, border: `1px solid ${C.border}`, borderRadius: 4, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: C.white, fontFamily: MONO, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3v2.5h3.2c1.9-1.7 3.1-4.2 3.1-7.2Z" fill="#4285F4"/><path d="M12 22c2.7 0 4.9-.9 6.5-2.5l-3.2-2.5c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" fill="#34A853"/><path d="M6.5 13.9a6 6 0 0 1 0-3.8V7.5H3.2a10 10 0 0 0 0 9l3.3-2.6Z" fill="#FBBC05"/><path d="M12 6.1c1.4 0 2.7.5 3.7 1.4l2.8-2.8A10 10 0 0 0 3.2 7.5l3.3 2.6c.8-2.3 3-4 5.5-4Z" fill="#EA4335"/></svg>
                        Google
                      </div>
                      <div style={{ color: googleIdentity ? C.green : C.muted, fontFamily: MONO, fontSize: 11 }}>{googleIdentity ? "Connected" : "Not connected"}</div>
                    </div>
                  </div>
                  {subscriptionStatus ? <div style={{ marginTop: 10, color: C.muted, fontFamily: MONO, fontSize: 12 }}>{subscriptionStatus}</div> : null}
                  {subscriptionError ? <div style={{ marginTop: 10, color: C.red, fontFamily: MONO, fontSize: 12 }}>{subscriptionError}</div> : null}
                </div>
              </section>
            ) : null}

            {active === "notifications" ? (
              <section>
                <div style={sectionLabelStyle}>Notifications</div>
                <div style={panelStyle}>
                  {[
                    ["scan", "Diagnostic scan completion", "Receive an email when your diagnostic scan is complete.", notificationScanComplete],
                    ["product", "Platform updates", "Receive emails when new diagnostic capabilities are released.", notificationProductUpdates],
                  ].map(([id, title, desc, value]) => (
                    <div key={String(id)} style={{ background: C.inner, border: `1px solid ${C.border}`, borderRadius: 4, padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ color: C.white, fontFamily: INTER, fontSize: 14 }}>{String(title)}</div>
                        <div style={{ marginTop: 4, color: C.muted, fontFamily: MONO, fontSize: 11 }}>{String(desc)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Toggle checked={Boolean(value)} onChange={(next) => void updateNotification(next, id as "scan" | "product")} />
                        {notificationStatus === id ? <span style={{ color: C.green, fontFamily: MONO, fontSize: 11 }}>Saved</span> : null}
                      </div>
                    </div>
                  ))}
                  {notificationError ? <div style={{ marginTop: 10, color: C.red, fontFamily: MONO, fontSize: 12 }}>{notificationError}</div> : null}
                </div>
              </section>
            ) : null}

            {active === "account" ? (
              <section>
                <div style={{ ...sectionLabelStyle, color: C.red }}>Destructive Actions</div>
                <div style={{ ...panelStyle, border: "1px solid #FF2D2D15", borderLeft: "3px solid #FF2D2D30" }}>
                  <div style={{ color: C.muted, fontFamily: MONO, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                    Permanently deletes your account and all associated diagnostic data. This action cannot be reversed.
                  </div>
                  <button type="button" onClick={() => setShowDeleteModal(true)} style={tier3()} onMouseEnter={onTier3Enter} onMouseLeave={onTier3Leave}>
                    Permanently Delete Account
                  </button>
                  {deleteError ? <div style={{ marginTop: 10, color: C.red, fontFamily: MONO, fontSize: 12 }}>{deleteError}</div> : null}
                </div>
              </section>
            ) : null}
          </main>
        </div>
      </div>

      {showCancelModal ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(5,8,16,0.8)", display: "grid", placeItems: "center", padding: 20, zIndex: 120 }}>
          <div style={{ width: "100%", maxWidth: 480, background: C.surface, border: "1px solid rgba(255,45,45,0.25)", borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: 32, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 24, borderTop: `1px solid ${C.red}`, borderLeft: `1px solid ${C.red}` }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, borderTop: `1px solid ${C.red}`, borderRight: `1px solid ${C.red}` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 24, height: 24, borderBottom: `1px solid ${C.red}`, borderLeft: `1px solid ${C.red}` }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderBottom: `1px solid ${C.red}`, borderRight: `1px solid ${C.red}` }} />
            <div style={{ fontFamily: GROTESK, color: C.white, fontSize: 20, marginBottom: 12 }}>Cancel Subscription</div>
            <div style={{ color: C.muted, fontFamily: MONO, fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>Your Pro access remains active until {fmtDate(subscription?.current_period_end ?? null)}. After this date your account reverts to the Free plan. All existing diagnostic reports remain accessible.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" onClick={() => setShowCancelModal(false)} style={tier2()} onMouseEnter={onTier2Enter} onMouseLeave={onTier2Leave}>
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={() => void cancelAtPeriodEnd()}
                style={tier3()}
                disabled={subscriptionBusy}
                onMouseEnter={onTier3Enter}
                onMouseLeave={onTier3Leave}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteModal ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(5,8,16,0.8)", display: "grid", placeItems: "center", padding: 20, zIndex: 120 }}>
          <div style={{ width: "100%", maxWidth: 520, background: C.surface, border: "1px solid rgba(255,45,45,0.25)", borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: 28, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 24, borderTop: `1px solid ${C.red}`, borderLeft: `1px solid ${C.red}` }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 24, height: 24, borderTop: `1px solid ${C.red}`, borderRight: `1px solid ${C.red}` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 24, height: 24, borderBottom: `1px solid ${C.red}`, borderLeft: `1px solid ${C.red}` }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderBottom: `1px solid ${C.red}`, borderRight: `1px solid ${C.red}` }} />
            <div style={{ fontFamily: GROTESK, color: C.white, fontSize: 20, marginBottom: 12 }}>Permanently Delete Account</div>
            <div style={{ color: C.muted, fontFamily: MONO, fontSize: 13, lineHeight: 1.7, marginBottom: 14 }}>This action permanently deletes all diagnostic reports, findings, scan history, and account data. This action cannot be reversed.</div>
            <div style={fieldLabel("Type your email to confirm")}>TYPE YOUR EMAIL TO CONFIRM</div>
            <input value={deleteConfirmEmail} onChange={(e) => setDeleteConfirmEmail(e.target.value)} placeholder="your@email.com" style={{ ...inputStyle(false), marginBottom: 14 }} />
            {deleteError ? <div style={{ marginBottom: 10, color: C.red, fontFamily: MONO, fontSize: 12 }}>{deleteError}</div> : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                disabled={!canDelete || deleteBusy}
                onClick={() => void deleteAccount()}
                style={tier3()}
                onMouseEnter={onTier3Enter}
                onMouseLeave={onTier3Leave}
              >
                {deleteBusy ? "Deleting" : "Permanently Delete Account"}
              </button>
              <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteConfirmEmail(""); setDeleteError(""); }} style={{ height: 40, border: "none", background: "transparent", color: C.muted, fontFamily: MONO, fontSize: 12, cursor: "pointer" }}>Keep Account</button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @media (max-width: 767px) {
          .settings-grid {
            display: block;
          }
          .settings-sidebar {
            width: 100%;
            min-height: 0;
            position: static;
            border-right: none;
            border-bottom: 1px solid ${C.border};
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
          }
          .settings-main {
            max-width: 100% !important;
            padding-left: 0 !important;
            padding-top: 24px;
          }
        }
      `}</style>
    </div>
  );
}
