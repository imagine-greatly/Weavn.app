-- 029: FIX production PII leak — two SELECT policies were USING (true), i.e. readable
-- by the anon/publishable (browser) key with NO user session.
--
-- Audit (applied state per backups/weavn_full_20260618.sql + live anon probe 2026-07-11):
--   • public.profiles : "Users can read own profile"  FOR SELECT USING (true)
--       -> anon could read email + stripe_customer_id for every profile. CRITICAL.
--   • public.reports  : "Temp allow all reads"         FOR SELECT USING (true)
--       -> anon could read every user's scan reports (url, analysis, money-leaks). CRITICAL.
-- Every OTHER user-data table (api_keys, api_usage, webhooks, resolved_findings,
-- user_hidden_reports) is already correctly scoped to auth.uid() and returns 0 rows
-- to anon — left untouched here.
--
-- Safe to apply: all server-side reads (API routes, the public /reports/[token] share
-- page, admin pages) use the SERVICE ROLE client and bypass RLS. No client-side/anon
-- code reads profiles or reports directly. The public share page reads by share_token
-- via the service role, NOT via these anon policies. This does NOT touch service-role
-- access. Owner column on profiles is `id` (not user_id).
-- Re-run safe (idempotent).

BEGIN;

-- ── profiles ────────────────────────────────────────────────────────────────
-- Remove the world-readable SELECT policy (the leak) and any stale/competing names.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"        ON public.profiles;

-- Correct owner-scoped SELECT: a logged-in user may read ONLY their own row.
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ── reports ─────────────────────────────────────────────────────────────────
-- (1) Drop the catch-all read.
DROP POLICY IF EXISTS "Temp allow all reads" ON public.reports;

-- (2) Drop the anon "public reports" policy AND neutralize the DEFAULT true.
-- reports.is_public DEFAULT true + this policy = every app-created report (the app
-- never sets is_public) is world-readable by anon. Public sharing does NOT use this:
-- app/reports/[token]/page.tsx reads by share_token via the SERVICE ROLE (bypasses
-- RLS). So the anon path is pure exposure — remove it and make the default safe.
-- The owner policy ("Users can view own reports" USING auth.uid() = user_id) remains.
DROP POLICY IF EXISTS "Public reports are viewable by anyone" ON public.reports;
ALTER TABLE public.reports ALTER COLUMN is_public SET DEFAULT false;
UPDATE public.reports SET is_public = false WHERE is_public IS DISTINCT FROM false;

-- ── ensure RLS is enabled on every user-data table (no-op if already on) ─────
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolved_findings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_hidden_reports ENABLE ROW LEVEL SECURITY;

COMMIT;
