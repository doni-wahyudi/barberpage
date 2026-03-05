-- === SETUP FOR PUBLIC 'images' BUCKET ===

-- 1. Ensure you have created a bucket named 'images' in your Supabase Storage dashboard.
-- 2. Make sure the "Public bucket" toggle is TURNED ON for this bucket.
-- 3. Run the following SQL queries in the Supabase SQL Editor to apply security policies.

-- Note: The "storage.objects" table manages files across all buckets.

-- A) Allow anyone to view images (SELECT access for public)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- B) Allow authenticated admins to upload new images (INSERT access)
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- C) Allow authenticated admins to update/replace images (UPDATE access)
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- D) Allow authenticated admins to delete images (DELETE access)
CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');
