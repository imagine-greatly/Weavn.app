/**
 * Weavn extension — popup renderer.
 * Pure view layer: it reads the current tab, asks the service worker to scan (message),
 * and renders the view-model the worker publishes to chrome.storage.session. No fetches here.
 */

const API_BASE = "https://weavn.app";
const SIGNIN_URL = `${API_BASE}/auth?surface=dashboard`;
const AGENCIES_URL = `${API_BASE}/agencies`;
const DASHBOARD_URL = `${API_BASE}/dashboard`;
const TOP_FREE_FINDINGS = 3;
const SIGNED_IN_MAX = 8; // findings rendered inline for signed-in users; rest live in the full report.

const view = document.getElementById("view");
const authPill = document.getElementById("authPill");
const authPillText = document.getElementById("authPillText");
document.getElementById("agenciesLink").href = AGENCIES_URL;

let currentUrl = "";
let currentDomain = "";
let signedIn = false;

// ── small helpers ────────────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}
function bandOf(score) {
  return score >= 70 ? "good" : score >= 50 ? "amber" : "red";
}
function bandHex(score) {
  const b = bandOf(score);
  return b === "good" ? "#00c48c" : b === "amber" ? "#efb23e" : "#e8635f";
}
function verdictLabel(score) {
  return score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : score >= 35 ? "Needs Work" : "Poor";
}
function framing(score) {
  const b = bandOf(score);
  return b === "good" ? "Highly optimized" : b === "amber" ? "Solid foundation" : "High upside";
}
function blurbFor(score) {
  const b = bandOf(score);
  if (b === "good") return "Most conversion best-practices are already captured — tighten the few remaining gaps below.";
  if (b === "amber") return "A solid base with clear gaps — the ranked findings below are your upside.";
  return "Most best-practices aren't captured yet — the ranked findings below are the path to close the gap.";
}
function resetText(state) {
  const secs =
    state.retryAfterSeconds != null
      ? Number(state.retryAfterSeconds)
      : state.resetAt
      ? Math.max(0, Math.floor((new Date(state.resetAt).getTime() - Date.now()) / 1000))
      : null;
  if (secs == null) return "";
  const h = Math.ceil(secs / 3600);
  return h <= 1 ? "Resets within the hour." : `Resets in about ${h}h.`;
}

// ── templates ────────────────────────────────────────────────────────────────
function tplIdle(domain, url) {
  return `
    <div class="idle">
      <p class="eyebrow">Current tab</p>
      <p class="domain">${esc(domain || "No page open")}</p>
      ${
        url
          ? `<button class="btn btn-primary btn-idle" data-action="scan" data-url="${esc(url)}">Scan this site</button>`
          : `<p class="note">Open a normal web page to scan it.</p>`
      }
      <p class="note"><span class="mono">3</span> free scans a day · 311 checks across 7 dimensions</p>
    </div>`;
}

function tplScanning(domain) {
  return `
    <div class="scanning">
      <p class="eyebrow">Scanning</p>
      <p class="scan-line">${esc(domain)}</p>
      <p class="scan-sub">Running 311 checks across 7 dimensions…</p>
      <div class="shimmer"></div>
    </div>`;
}

function findingRow(f) {
  return `
    <div class="finding">
      <div class="finding-top">
        <span class="sev sev-${esc(f.severity)}"></span>
        <span class="finding-title">${esc(f.title)}</span>
      </div>
      ${f.dimension ? `<div class="finding-dim">${esc(f.dimension)}</div>` : ""}
      ${f.detail ? `<div class="finding-detail">${esc(f.detail)}</div>` : ""}
    </div>`;
}

function dimsBlock(dimensions) {
  const rows = dimensions
    .map((d) => {
      const has = typeof d.score === "number";
      const cls = has ? bandOf(d.score) : "";
      return `
      <div class="dim">
        <span class="dim-label">${esc(d.label)}</span>
        <span class="dim-track"><span class="dim-fill" data-score="${has ? d.score : ""}" data-band="${cls}"></span></span>
        <span class="dim-val">${has ? d.score : "—"}</span>
      </div>`;
    })
    .join("");
  return `<div class="dims">${rows}</div>`;
}

function scoreBlock(score) {
  return `
    <div class="score-row" id="scoreBox">
      <span class="score-num">${score}</span>
      <span class="score-max">% captured<br>±3</span>
      <div class="score-meta">
        <div class="verdict">${esc(framing(score))}</div>
        <div class="band-label">${esc(verdictLabel(score))} · ${score}/100</div>
      </div>
    </div>
    <p class="blurb">${esc(blurbFor(score))}</p>`;
}

function tplResultAnon(state) {
  const free = state.findings.slice(0, TOP_FREE_FINDINGS);
  const gatedCount = Math.max(0, state.totalFindings - free.length);
  const remain =
    state.scansRemaining != null
      ? `<div class="strip"><span>Free scan used</span><span><b>${state.scansRemaining}</b> of ${
          state.scansPerDay ?? 3
        } left today</span></div>`
      : "";
  return `
    ${scoreBlock(state.score)}
    ${dimsBlock(state.dimensions)}
    <p class="section-head">Top findings</p>
    ${free.map(findingRow).join("") || `<p class="muted">No findings surfaced.</p>`}

    <div class="gate">
      <div class="gate-blur" aria-hidden="true">
        <div class="gate-ghost w-90"></div>
        <div class="gate-ghost w-70"></div>
        <div class="gate-ghost w-50"></div>
        <div class="gate-ghost w-90"></div>
        <div class="gate-ghost w-70"></div>
      </div>
      <div class="gate-over">
        <span class="gate-lock">🔒 Locked</span>
        <p class="gate-head">See all 311 checks + drop-in copy rewrites</p>
        <p class="gate-sub">${gatedCount > 0 ? `${gatedCount} more findings` : "Full breakdown"} + rewritten headlines, CTAs & fixes.</p>
        <a class="btn btn-primary" href="${SIGNIN_URL}" target="_blank" rel="noopener">Sign in — free — to see everything</a>
        <button class="btn btn-ghost" data-action="refresh-auth">I've signed in — refresh</button>
      </div>
    </div>
    ${remain}
    ${state.reportUrl ? `<a class="report-link" href="${esc(state.reportUrl)}" target="_blank" rel="noopener">Open this scan on weavn.app →</a>` : ""}`;
}

function tplResultSignedIn(state) {
  const shown = state.findings.slice(0, SIGNED_IN_MAX);
  const more = Math.max(0, state.totalFindings - shown.length);
  return `
    ${scoreBlock(state.score)}
    ${dimsBlock(state.dimensions)}
    <p class="section-head">Findings · ${state.totalFindings}</p>
    ${shown.map(findingRow).join("") || `<p class="muted">No findings surfaced.</p>`}
    <div class="strip good"><span>Signed in</span><span>counts against your <b>plan</b></span></div>
    ${
      state.reportUrl
        ? `<a class="report-link" href="${esc(state.reportUrl)}" target="_blank" rel="noopener">Open full report${
            more > 0 ? ` (+${more} more findings)` : ""
          } →</a>`
        : ""
    }`;
}

function tplRateLimited(state) {
  const isAnon = state.mode === "anonymous";
  return `
    <div class="ratelimit">
      <span class="icon-badge warn"></span>
      <p class="msg-head">${isAnon ? "You've used your 3 free scans today" : "Plan scan limit reached"}</p>
      <p class="msg-body">${esc(state.message || "")}${state.resetAt || state.retryAfterSeconds != null ? " " + esc(resetText(state)) : ""}</p>
      ${
        isAnon
          ? `<a class="btn btn-primary" href="${SIGNIN_URL}" target="_blank" rel="noopener">Sign in for more scans →</a>
             <button class="btn btn-ghost" data-action="refresh-auth">I've signed in — refresh</button>`
          : `<a class="btn btn-primary" href="${DASHBOARD_URL}" target="_blank" rel="noopener">Manage your plan →</a>`
      }
    </div>`;
}

function tplError(state) {
  const map = {
    bot_blocked: {
      head: "This site can't be scanned",
      body: state.errorMessage || "It blocks automated visitors. Try a different page.",
      retry: true,
    },
    low_confidence: {
      head: "Couldn't score this page",
      body: state.errorMessage || "The page didn't render enough to evaluate. Please retry.",
      retry: true,
    },
    scan_failed: { head: "Scan didn't complete", body: state.errorMessage || "Something went wrong. Please try again.", retry: true },
    unavailable: { head: "Scanning is unavailable", body: state.errorMessage || "Please try again shortly.", retry: true },
    network: { head: "Couldn't reach Weavn", body: state.errorMessage || "Check your connection and try again.", retry: true },
    unsupported_page: { head: "Not a scannable page", body: state.errorMessage || "Open a normal http(s) site and try again.", retry: false },
  };
  const e = map[state.errorCode] || map.scan_failed;
  return `
    <div class="errorst">
      <span class="icon-badge err"></span>
      <p class="msg-head">${esc(e.head)}</p>
      <p class="msg-body">${esc(e.body)}</p>
      ${e.retry && state.url ? `<button class="btn btn-primary" data-action="scan" data-url="${esc(state.url)}">Try again</button>` : ""}
      <button class="btn btn-ghost" data-action="idle">Scan a different site</button>
    </div>`;
}

// ── decorate: apply dynamic colors/widths via CSSOM (CSP-safe, no inline styles) ──
function decorate() {
  const box = document.getElementById("scoreBox");
  if (box) {
    const n = Number(box.querySelector(".score-num")?.textContent) || 0;
    box.style.setProperty("--band", bandHex(n));
  }
  document.querySelectorAll(".dim-fill").forEach((el) => {
    const s = el.getAttribute("data-score");
    if (s === "" || s == null) {
      el.style.width = "0%";
      return;
    }
    const n = Number(s);
    el.style.width = `${Math.max(0, Math.min(100, n))}%`;
    el.style.setProperty("--dimband", bandHex(n));
  });
}

// ── render ───────────────────────────────────────────────────────────────────
function render(state) {
  if (!state) {
    view.className = "view";
    view.innerHTML = tplIdle(currentDomain, currentUrl);
    return;
  }
  if (state.status === "scanning") {
    view.className = "view scanning-wrap";
    view.innerHTML = tplScanning(state.domain || currentDomain);
    return;
  }
  if (state.status === "rate_limited") {
    view.className = "view";
    view.innerHTML = tplRateLimited(state);
    return;
  }
  if (state.status === "error") {
    view.className = "view";
    view.innerHTML = tplError(state);
    return;
  }
  // done
  view.className = "view";
  view.innerHTML = state.mode === "signed_in" ? tplResultSignedIn(state) : tplResultAnon(state);
  decorate();
}

// ── auth pill ────────────────────────────────────────────────────────────────
function setAuthPill(isIn) {
  signedIn = isIn;
  authPill.classList.toggle("is-in", isIn);
  authPillText.textContent = isIn ? "Signed in" : "Anonymous";
}
authPill.addEventListener("click", () => {
  window.open(signedIn ? DASHBOARD_URL : SIGNIN_URL, "_blank");
});

// ── message helpers ──────────────────────────────────────────────────────────
function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

// ── interactions (delegated; survives re-renders) ────────────────────────────
view.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el) return;
  const action = el.getAttribute("data-action");

  if (action === "scan") {
    const url = el.getAttribute("data-url") || currentUrl;
    render({ status: "scanning", url, domain: domainOf(url) });
    send({ type: "SCAN", url }); // result arrives via storage.onChanged
  } else if (action === "idle") {
    await send({ type: "CLEAR" });
    render(null);
  } else if (action === "refresh-auth") {
    el.textContent = "Checking…";
    const { signedIn: isIn } = (await send({ type: "CHECK_AUTH" })) || {};
    setAuthPill(!!isIn);
    if (isIn && currentUrl) {
      // Now authenticated — re-run so this scan counts against their plan (no gate).
      render({ status: "scanning", url: currentUrl, domain: currentDomain });
      send({ type: "SCAN", url: currentUrl });
    } else {
      el.textContent = "Still signed out — try again";
    }
  }
});

// Re-render whenever the worker updates scan state.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.scanState) render(changes.scanState.newValue || null);
});

// ── init ─────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url || "";
    currentDomain = domainOf(currentUrl);
  } catch {
    currentUrl = "";
    currentDomain = "";
  }

  const state = await send({ type: "GET_STATE" });
  const recent = state && state.startedAt && Date.now() - state.startedAt < 90000;
  const forThisTab = state && state.url === currentUrl;
  if (state && (state.status === "scanning" || forThisTab || recent)) {
    render(state);
  } else {
    render(null);
  }

  // Auth pill from the worker's cached flag — no network probe on open. The flag is
  // refreshed whenever a scan routes, and by the explicit "I've signed in — refresh" button.
  send({ type: "GET_AUTH" }).then((r) => setAuthPill(!!(r && r.signedIn)));
}

init();
