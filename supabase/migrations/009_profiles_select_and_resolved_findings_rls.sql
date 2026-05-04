-- FIX 1: Profiles SELECT for dashboard (.eq("id", user.id)) — re-run safe
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- FIX 2: resolved_findings — table + indexes + RLS (IF NOT EXISTS where safe)
CREATE TABLE IF NOT EXISTS public.resolved_findings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  resolution_key text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resolved_findings_user_id_idx
  ON public.resolved_findings (user_id);

CREATE INDEX IF NOT EXISTS resolved_findings_resolution_key_idx
  ON public.resolved_findings (resolution_key);

ALTER TABLE public.resolved_findings ENABLE ROW LEVEL SECURITY;

-- Replace legacy policies from 002 with explicit CRUD policies
DROP POLICY IF EXISTS "resolved_select_own" ON public.resolved_findings;
DROP POLICY IF EXISTS "resolved_upsert_own" ON public.resolved_findings;
DROP POLICY IF EXISTS "Users can read own resolved findings" ON public.resolved_findings;
DROP POLICY IF EXISTS "Users can insert own resolved findings" ON public.resolved_findings;
DROP POLICY IF EXISTS "Users can delete own resolved findings" ON public.resolved_findings;

CREATE POLICY "Users can read own resolved findings"
  ON public.resolved_findings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resolved findings"
  ON public.resolved_findings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resolved findings"
  ON public.resolved_findings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
