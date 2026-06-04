-- Multi-page scan support: link child scans to a parent, store page path and aggregate metadata.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS parent_scan_id uuid REFERENCES reports(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS scan_type text DEFAULT 'single';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS child_scan_ids uuid[];
ALTER TABLE reports ADD COLUMN IF NOT EXISTS page_path text;

-- Index for efficient parent→children lookup
CREATE INDEX IF NOT EXISTS reports_parent_scan_id_idx ON reports(parent_scan_id) WHERE parent_scan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_scan_type_idx ON reports(scan_type);
