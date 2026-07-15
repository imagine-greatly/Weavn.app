-- Optional follow-up to 009: single FOR ALL policy (run in SQL Editor if 009 policies are missing or broken)
CREATE TABLE IF NOT EXISTS public.resolved_findings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  resolution_key text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.resolved_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own resolved findings" ON public.resolved_findings;

CREATE POLICY "Users can manage own resolved findings"
  ON public.resolved_findings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
