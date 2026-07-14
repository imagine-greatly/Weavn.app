/**
 * Weavn extension — background service worker (MV3).
 *
 * The ONLY place network calls happen. The popup never fetches; it sends a message
 * here and renders the view-model this worker writes to chrome.storage.session.
 *
 * Two scan paths, auth-routed on every scan (per the approved architecture):
 *   1. Cookie-ride first: POST /api/scan with credentials + X-Weavn-Client: extension.
 *      The chrome-extension:// Origin + that header satisfy the server's CSRF guard.
 *      401  → the user isn't signed in → fall through to (2).
 *      200/4xx/5xx (not 401/403) → signed in; this IS their scan (counts against plan).
 *   2. Anonymous: POST /api/extension/scan with X-Weavn-Install-Id (a per-install UUID).
 *      3 free scans / 24h; the server returns the FULL result and we gate depth client-side.
 *
 * No API keys or secrets live here — the server holds PLAYGROUND_API_KEY. We only ever
 * send our install UUID (anonymous) or ride the first-party session cookie (signed in).
 */

// Prod. For local testing, point this at your dev server AND add it to host_permissions
// (e.g. "http://localhost:3000/*") in manifest.json, then reload the unpacked extension.
const API_BASE = "https://weavn.app";
const DASH_ENDPOINT = `${API_BASE}/api/scan`;
const ANON_ENDPOINT = `${API_BASE}/api/extension/scan`;

const TOP_FREE_FINDINGS = 3; // shown ungated on anonymous results; the rest are gated.
const MENU_ID = "weavn-scan-site";

// 7 canonical dimensions → display labels (order is the product's canonical order).
const DIMENSION_LABELS = {
  conversion_architecture: "Conversion Architecture",
  trust_signals: "Trust Signals",
  message_clarity: "Message Clarity",
  traffic_readiness: "Traffic Readiness",
  technical_foundation: "Technical Foundation",
  objection_handling: "Objection Handling",
  offer_clarity: "Offer Clarity",
};

// ── install token ─────────────────────────────────────────────────────────────
async function getInstallId() {
  const { weavnInstallId } = await chrome.storage.local.get("weavnInstallId");
  if (weavnInstallId) return weavnInstallId;
  const id = crypto.randomUUID(); // v4 UUID — matches the server's X-Weavn-Install-Id format
  await chrome.storage.local.set({ weavnInstallId: id });
  return id;
}

// ── transient scan state (session storage, cleared when the browser closes) ─────
async function setState(state) {
  await chrome.storage.session.set({ scanState: state });
}
async function getState() {
  const { scanState } = await chrome.storage.session.get("scanState");
  return scanState || null;
}

// Cached signed-in flag (this browser session) so the popup can label the auth pill on open
// WITHOUT a network probe. Updated whenever a scan routes, and by the explicit checkAuth().
async function setAuthCache(isIn) {
  await chrome.storage.session.set({ lastAuthSignedIn: !!isIn });
}
async function getAuthCache() {
  const { lastAuthSignedIn } = await chrome.storage.session.get("lastAuthSignedIn");
  return { signedIn: !!lastAuthSignedIn };
}

// ── helpers ────────────────────────────────────────────────────────────────────
function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}
function scannable(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}
function normSeverity(s) {
  const v = String(s || "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high" || v === "warning") return "high";
  if (v === "medium") return "medium";
  return "low";
}
async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// ── normalize the two response shapes into ONE view-model ───────────────────────
// Anonymous = v1 shape: { score, verdict, dimensions:{...}, findings:[...], copy_rewrites, report_url }
// Signed-in = /api/scan: { domain, reportId, shareToken, payload:{ healthScore, leaks/moneyLeaks, dimensionScores } }
function normFinding(raw) {
  return {
    title: String(raw?.revenueTitle || raw?.title || "").trim() || "Finding",
    dimension: String(raw?.dimension || raw?.category || "").trim(),
    severity: normSeverity(raw?.severity),
    detail: String(raw?.explanation || raw?.whatWeFound || "").trim(),
    rewrite: String(raw?.rewritten_copy || "").trim(),
  };
}

function normalizeAnon(body, url, domain, headers) {
  const score = Math.max(0, Math.min(100, Math.round(Number(body?.score) || 0)));
  const findings = Array.isArray(body?.findings) ? body.findings.map(normFinding) : [];
  const dims = body?.dimensions && typeof body.dimensions === "object" ? body.dimensions : {};
  const dimensions = Object.keys(DIMENSION_LABELS).map((k) => ({
    key: k,
    label: DIMENSION_LABELS[k],
    score: Math.max(0, Math.min(100, Math.round(Number(dims[k]) || 0))),
  }));
  const remainHeader = headers?.get("X-Weavn-Scans-Remaining");
  const perDayHeader = headers?.get("X-Weavn-Scans-Per-Day");
  return {
    status: "done",
    mode: "anonymous",
    url,
    domain,
    score,
    verdict: String(body?.verdict || ""),
    dimensions,
    findings,
    totalFindings: findings.length,
    reportUrl: typeof body?.report_url === "string" ? body.report_url : null,
    scansRemaining: remainHeader != null ? Number(remainHeader) : null,
    scansPerDay: perDayHeader != null ? Number(perDayHeader) : null,
    resetAt: headers?.get("X-Weavn-Reset-At") || null,
  };
}

function normalizeSignedIn(body, url, domain) {
  const payload = body?.payload || {};
  const score = Math.max(0, Math.min(100, Math.round(Number(payload.healthScore ?? payload.growthScore) || 0)));
  const rawFindings =
    (Array.isArray(payload.moneyLeaks) && payload.moneyLeaks.length && payload.moneyLeaks) ||
    (Array.isArray(payload.api_findings) && payload.api_findings.length && payload.api_findings) ||
    (Array.isArray(payload.leaks) && payload.leaks) ||
    [];
  const findings = rawFindings.map(normFinding);
  // dimensionScores: [{ id/label, score }] → map onto the canonical 7 where possible.
  const dimRows = Array.isArray(payload.dimensionScores) ? payload.dimensionScores : [];
  const byKey = {};
  for (const r of dimRows) {
    const label = String(r?.label || r?.id || "").trim();
    const key = Object.keys(DIMENSION_LABELS).find(
      (k) => k === label.toLowerCase() || DIMENSION_LABELS[k].toLowerCase() === label.toLowerCase()
    );
    if (key && typeof r?.score === "number") byKey[key] = Math.max(0, Math.min(100, Math.round(r.score)));
  }
  const dimensions = Object.keys(DIMENSION_LABELS).map((k) => ({
    key: k,
    label: DIMENSION_LABELS[k],
    score: byKey[k] ?? null,
  }));
  return {
    status: "done",
    mode: "signed_in",
    url,
    domain,
    score,
    verdict: "",
    dimensions,
    findings,
    totalFindings: findings.length,
    reportUrl: body?.shareToken ? `${API_BASE}/reports/${body.shareToken}` : null,
  };
}

// ── per-path response handling ──────────────────────────────────────────────────
async function handleAnon(res, url, domain) {
  const body = await readJson(res);
  if (res.status === 200) return normalizeAnon(body, url, domain, res.headers);

  if (res.status === 429) {
    // Honest rate-limit body from /api/extension/scan.
    return {
      status: "rate_limited",
      mode: "anonymous",
      url,
      domain,
      scope: body?.scope || "install",
      message: body?.message || "You've used your free scans for today.",
      scansPerDay: body?.scans_per_day ?? null,
      resetAt: body?.reset_at || res.headers.get("X-Weavn-Reset-At") || null,
      retryAfterSeconds: body?.retry_after_seconds ?? null,
    };
  }

  if (res.status === 422) {
    // v1 passthrough: bot-blocked / extraction / insufficient / degraded.
    const code = body?.error?.code || (body?.blocked ? "BOT_BLOCKED" : "SCAN_FAILED");
    const botBlocked = code === "BOT_BLOCKED" || body?.blocked === true;
    return {
      status: "error",
      mode: "anonymous",
      url,
      domain,
      errorCode: botBlocked ? "bot_blocked" : "scan_failed",
      errorMessage:
        body?.error?.message ||
        (botBlocked
          ? "This site blocks automated visitors, so it can't be scanned. Try a different page."
          : "We couldn't read enough of this page to score it. Try another URL."),
    };
  }

  if (res.status === 503) {
    return {
      status: "error",
      mode: "anonymous",
      url,
      domain,
      errorCode: "unavailable",
      errorMessage: body?.message || "Scanning is temporarily unavailable. Please try again shortly.",
    };
  }

  return {
    status: "error",
    mode: "anonymous",
    url,
    domain,
    errorCode: "scan_failed",
    errorMessage: body?.message || body?.error?.message || "The scan couldn't be completed. Please try again.",
  };
}

async function handleDash(res, url, domain) {
  const body = await readJson(res);
  if (res.status === 200) return normalizeSignedIn(body, url, domain);

  if (res.status === 429) {
    // Plan cap or per-account burst limit — still "signed in".
    return {
      status: "rate_limited",
      mode: "signed_in",
      url,
      domain,
      message:
        body?.error ||
        (body?.reason === "monthly_cap_reached"
          ? "You've hit your plan's monthly scan limit."
          : "Too many scans just now — give it a moment."),
      reason: body?.reason || null,
      plan: body?.plan || null,
      limit: body?.limit ?? null,
      used: body?.used ?? null,
      resetAt: body?.resets_at || null,
    };
  }

  if (res.status === 422) {
    return {
      status: "error",
      mode: "signed_in",
      url,
      domain,
      errorCode: "low_confidence",
      errorMessage: body?.error || "We couldn't evaluate enough of this page to score it confidently. Please retry.",
    };
  }

  const msg = String(body?.error || "");
  const botBlocked = /bot|block|forbidden|403/i.test(msg);
  return {
    status: "error",
    mode: "signed_in",
    url,
    domain,
    errorCode: botBlocked ? "bot_blocked" : "scan_failed",
    errorMessage:
      msg ||
      (botBlocked
        ? "This site blocks automated visitors, so it can't be scanned."
        : "The scan couldn't be completed. Please try again."),
  };
}

// ── the scan itself (single network entry point) ────────────────────────────────
async function performScan(url, domain) {
  // 1) Try the signed-in cookie-ride path first.
  let dashRes = null;
  try {
    dashRes = await fetch(DASH_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Weavn-Client": "extension" },
      body: JSON.stringify({ url, source: "extension" }),
    });
  } catch {
    dashRes = null; // network error probing signed-in path → fall back to anonymous.
  }

  // 401 (not signed in) or 403 (guard rejected us) → anonymous. Any other status means
  // we're authenticated and this response IS the user's scan.
  if (dashRes && dashRes.status !== 401 && dashRes.status !== 403) {
    await setAuthCache(true);
    return handleDash(dashRes, url, domain);
  }

  // 2) Anonymous path.
  await setAuthCache(false);
  const installId = await getInstallId();
  const anonRes = await fetch(ANON_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Weavn-Install-Id": installId },
    body: JSON.stringify({ url }),
  });
  return handleAnon(anonRes, url, domain);
}

async function runScan(url) {
  const domain = domainOf(url);
  if (!scannable(url)) {
    const vm = {
      status: "error",
      mode: "anonymous",
      url,
      domain,
      errorCode: "unsupported_page",
      errorMessage: "This isn't a scannable web page. Open a normal http(s) site and try again.",
    };
    await setState(vm);
    return vm;
  }
  await setState({ status: "scanning", url, domain, startedAt: Date.now() });
  let vm;
  try {
    vm = await performScan(url, domain);
  } catch (err) {
    vm = {
      status: "error",
      mode: "anonymous",
      url,
      domain,
      errorCode: "network",
      errorMessage: "Couldn't reach Weavn. Check your connection and try again.",
    };
  }
  await setState(vm);
  return vm;
}

// Cheap auth probe: empty-body POST to /api/scan. Signed-in → 400/429 (never runs a scan);
// signed-out → 401. Used by the "I've signed in — refresh" button.
async function checkAuth() {
  try {
    const res = await fetch(DASH_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Weavn-Client": "extension" },
      body: JSON.stringify({}),
    });
    const signedIn = res.status !== 401 && res.status !== 403;
    await setAuthCache(signedIn);
    return { signedIn };
  } catch {
    return { signedIn: false };
  }
}

// ── context menu ────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Scan this site with Weavn",
    contexts: ["page", "action"],
  });
  // Warm the install token so the first scan doesn't pay for it.
  getInstallId();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = tab?.url || info.pageUrl;
  // Kick off the scan (state → "scanning" immediately), then try to surface the popup.
  runScan(url);
  try {
    await chrome.action.openPopup(); // Chrome 127+; best-effort. Otherwise the user clicks the icon.
  } catch {
    /* openPopup unavailable — result still lands in storage.session for when they open it. */
  }
});

// ── messages from the popup ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "SCAN") {
      const vm = await runScan(msg.url);
      sendResponse(vm);
    } else if (msg?.type === "GET_STATE") {
      sendResponse(await getState());
    } else if (msg?.type === "GET_AUTH") {
      sendResponse(await getAuthCache());
    } else if (msg?.type === "CHECK_AUTH") {
      sendResponse(await checkAuth());
    } else if (msg?.type === "CLEAR") {
      await setState(null);
      sendResponse({ ok: true });
    } else {
      sendResponse(null);
    }
  })();
  return true; // keep the channel open for the async response.
});
