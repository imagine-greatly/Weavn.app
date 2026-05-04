-- Optional denormalized column for SQL queries / analytics (also stored in analysis JSON).
ALTER TABLE reports ADD COLUMN IF NOT EXISTS dimension_scores jsonb;
