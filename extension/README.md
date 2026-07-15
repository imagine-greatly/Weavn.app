# Weavn — Conversion Score (Chrome extension, MV3)

A free-scan lead funnel. Right-click any page → **Scan this site with Weavn** (or click the
toolbar icon) → run the site against **311 checks across 7 dimensions** and see the score.
Anonymous users get 3 free scans a day with the top findings; signing in unlocks the full
depth and runs scans against their dashboard plan.

All network calls happen in the **background service worker** (`background.js`) — never from a
content script — so no CORS enforcement applies. No API keys or secrets live in the extension.

## File tree

```
extension/
├── manifest.json          MV3 manifest (host_permissions https://weavn.app/*, SW + action popup)
├── background.js          Service worker — the ONLY place fetches happen:
│                            · per-install UUID (X-Weavn-Install-Id), stored once in storage.local
│                            · context menu "Scan this site with Weavn"
│                            · auth-routed scan: cookie-ride /api/scan first, else anon /api/extension/scan
│                            · normalizes both response shapes → one view-model in storage.session
├── popup.html             Popup shell (loads brand fonts + popup.css + popup.js)
├── popup.css              Locked design system (#050810, zero-radius, Space Grotesk / IBM Plex
│                            Sans / IBM Plex Mono, purple #9D8CFF accent, 3-band score color)
├── popup.js               View layer — renders every state; sends messages to the worker; no fetch
├── icons/
│   ├── icon-16.png        Placeholder purple hexagon marks (generated — replace with real art any time)
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── tools/
│   └── generate-icons.mjs Regenerates the placeholder icons: `node extension/tools/generate-icons.mjs`
└── README.md              This file
```

## Server dependency (read first)

The extension talks to `https://weavn.app`. For scans to work end-to-end, the server side
(branch `chrome-extension`, commit `4529b52`) must be **deployed to weavn.app** AND
**migration 030 applied** — otherwise `/api/extension/scan` fails **closed** with a 503 and the
popup shows "Scanning is unavailable." Until it's deployed to prod, test against a preview or
local build of that branch (see "Local dev" below).

## Load unpacked (for testing)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select the `extension/` folder.
4. The "Weavn — Conversion Score" icon appears in the toolbar. Pin it for convenience.
5. After editing any file, return to `chrome://extensions` and click the **reload** ⟳ icon on the
   card (the service worker needs a reload to pick up `background.js` changes).

To inspect the worker: on the extension card click **service worker** → DevTools console.

### Local dev (against a dev/preview server)

To test before prod deploy, in `background.js` set:
```js
const API_BASE = "http://localhost:3000"; // or your preview URL
```
…and add the matching host to `manifest.json` `host_permissions` (e.g. `"http://localhost:3000/*"`),
then reload the unpacked extension. Run the `chrome-extension` branch's Next dev server and apply
migration 030 to that database.

## Manual test checklist

> Anon-path tests need `X-Weavn-Install-Id`; it's generated on first run and reused. To reset the
> anonymous budget for re-testing, open the worker console and run:
> `chrome.storage.local.remove('weavnInstallId')` then reload — a fresh UUID = a fresh 3/day budget.
> (The per-IP 15/day ceiling still applies from the same network.)

### 1. Anonymous scan (signed out, under limit)
- [ ] Sign out of weavn.app in this browser profile (or use a profile that was never signed in).
- [ ] Navigate to a normal landing page (e.g. `https://stripe.com`).
- [ ] Click the toolbar icon → popup shows the **domain** + "Scan this site" + "3 free scans a day".
- [ ] Click **Scan this site** → honest loading: "Scanning {domain}… Running 311 checks across 7 dimensions" with an indeterminate shimmer (no fake %).
- [ ] Result renders: big **score** (colored green only if ≥70, amber 50–69, red <50), framing word + verdict, the 7 dimension bars, and the **top 3 findings** (severity dot + title + dimension + detail).
- [ ] Auth pill top-right reads **Anonymous**. A "Free scan used · N of 3 left today" strip shows (from the `X-Weavn-Scans-Remaining` header).

### 2. Gated depth preview (the conversion nudge)
- [ ] Below the top 3 findings, a **blurred/locked** panel: "🔒 See all 311 checks + drop-in copy rewrites", with the remaining-findings count.
- [ ] **Sign in — free — to see everything** opens `https://weavn.app/auth?surface=dashboard` in a new tab.
- [ ] The score itself is **never** hidden — only depth is gated.
- [ ] Footer always shows the subtle **"White-label Weavn for your clients →"** link to `/agencies`.

### 3. Hitting the 3/day limit
- [ ] Run 3 anonymous scans (any sites). On the 4th, the popup shows the **rate-limited** state: "You've used your 3 free scans today" + "Resets in about Nh" (read from the 429 body / `reset_at`).
- [ ] **Sign in for more scans →** deep-link is present, plus an "I've signed in — refresh" button.

### 4. Context-menu scan
- [ ] Right-click anywhere on a page → **Scan this site with Weavn**.
- [ ] The popup opens (Chrome 127+) already in the scanning state for that tab; if it doesn't auto-open, click the toolbar icon — the result is waiting there.

### 5. Sign-in handoff
- [ ] From an anonymous result or the rate-limit screen, click **Sign in…**, complete sign-in on weavn.app in the new tab.
- [ ] Back in the popup, click **I've signed in — refresh**. The auth pill flips to **Signed in** and the current site re-scans automatically down the logged-in path.
- [ ] (Alternatively: just reopen the popup — it re-checks auth on open.)

### 6. Signed-in full scan
- [ ] While signed in, scan a site. The result shows the score, dimensions, and **all findings inline** (up to 8, with "Open full report (+N more) →"), **no gate**.
- [ ] A "Signed in · counts against your plan" strip confirms the scan hit the dashboard plan.
- [ ] Confirm on the weavn.app dashboard that a new report was recorded for your account.

### 7. Honest error states
- [ ] Scan a bot-protected site (e.g. one behind aggressive WAF) → "This site can't be scanned" (not a generic error).
- [ ] Kill network / stop the dev server and scan → "Couldn't reach Weavn."
- [ ] Open a `chrome://` page and try to scan → "Not a scannable page."

## Notes / known limits

- **`/agencies` doesn't exist on weavn.app yet** — the footer link is wired as requested but will 404 until that page ships.
- **Brand fonts** load from Google Fonts (allowlisted in the manifest CSP). To go fully self-hosted, drop woff2 files in a `fonts/` dir and swap the `<link>` in `popup.html` for local `@font-face`.
- **MV3 worker lifecycle**: an in-flight scan keeps the worker alive; results always land in `storage.session`, so closing the popup mid-scan is safe — reopen to see the result.
