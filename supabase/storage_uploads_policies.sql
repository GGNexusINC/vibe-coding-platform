-- ============================================================
-- Storage policies for the "uploads" bucket
-- Run this in your Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Allow anyone to READ files (public bucket)
CREATE POLICY "Public read uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

-- 2. Allow anyone to INSERT files (service role + admin uploads)
CREATE POLICY "Allow insert uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads');

-- 3. Allow anyone to UPDATE files (upsert support)
CREATE POLICY "Allow update uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'uploads');

-- 4. Allow anyone to DELETE files (cleanup)
CREATE POLICY "Allow delete uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'uploads');
