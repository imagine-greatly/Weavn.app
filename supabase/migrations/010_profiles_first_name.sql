-- Optional display name for dashboard / personalization (API selects plan, first_name).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
