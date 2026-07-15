# Weavn

Weavn scans a business's website and shows exactly where it's losing customers —
a weak headline, a missing trust signal, a confusing signup — with plain-language
reasoning for each. Think Lighthouse, but for lost revenue instead of page speed.

## Why it exists

Owners can tell a page underperforms but not why, and generic "best practice"
advice never says which fix matters for their page. Weavn grades a page against a
fixed rubric of conversion checks and returns a ranked, evidence-backed diagnosis.

## How it works

1. Scrape the page with headless Chrome (via Browserless), gated so a half-
   rendered page is never scored.
2. Detect the site type and build a structured summary of the page.
3. Grade it against 311 checks across 7 conversion dimensions using Claude,
   reconciled across passes into one coverage score.
4. Persist a report: ranked findings, severity, and drop-in copy rewrites.

## Surfaces

- Marketing site, dashboard, and a shareable public report view.
- Public REST API (/api/v1/scan) with API-key auth, quotas, and metered billing.
- A cookie-authed dashboard scan path and a rate-limited public playground.
- A Chrome extension (/extension) offering free scans as a lead funnel.

## Tech stack

Next.js 15 (App Router) + TypeScript on Vercel. Supabase (Postgres, RLS, SQL
migrations). Anthropic Claude for analysis. Stripe for billing (subscriptions +
metered API usage). Resend for email. Tailwind CSS.

## Status

In active development. Not yet publicly launched; scoring, APIs, and pricing are
still changing, with no stability guarantees.
