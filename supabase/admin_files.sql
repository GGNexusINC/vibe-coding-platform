-- ============================================================
-- Admin Files — shared file storage for admins
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by   text NOT NULL,
  uploader_id   text NOT NULL,
  file_name     text NOT NULL,
  file_type     text NOT NULL,
  file_size     bigint NOT NULL DEFAULT 0,
  storage_path  text NOT NULL,
  public_url    text NOT NULL,
  folder        text NOT NULL DEFAULT 'general',
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_files_folder_idx ON admin_files(folder);
CREATE INDEX IF NOT EXISTS admin_files_created_at_idx ON admin_files(created_at DESC);

ALTER TABLE admin_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access admin_files"
ON admin_files FOR ALL
USING (true)
WITH CHECK (true);
