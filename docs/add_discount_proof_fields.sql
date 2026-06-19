-- ============================================================
-- MIGRATION: ADD DISCOUNT PROOF OF ELIGIBILITY & APPROVAL FLOW
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add requires_proof column to public.discounts if it doesn't exist
ALTER TABLE public.discounts 
    ADD COLUMN IF NOT EXISTS requires_proof BOOLEAN DEFAULT false;

-- 2. Add proof_url column to public.bookings if it doesn't exist
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 3. Add discount_status column to public.bookings if it doesn't exist
ALTER TABLE public.bookings 
    ADD COLUMN IF NOT EXISTS discount_status TEXT DEFAULT 'none';

-- 4. Add check constraint to public.bookings to enforce valid discount statuses
-- If you run this multiple times, it might fail if the constraint exists, 
-- so we check and drop it first if possible, or just catch it.
-- Standard PostgreSQL doesn't have "ADD CONSTRAINT IF NOT EXISTS", so we drop it first:
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS check_discount_status;
ALTER TABLE public.bookings 
    ADD CONSTRAINT check_discount_status 
    CHECK (discount_status IN ('none', 'pending', 'approved', 'rejected'));

-- Update any existing bookings to have 'none' discount status if they are null
UPDATE public.bookings SET discount_status = 'none' WHERE discount_status IS NULL;

-- 5. Configure Storage Policies for 'discount-proofs' bucket
-- NOTE: Please ensure you create the bucket 'discount-proofs' in the Supabase Storage dashboard first!
-- Ensure the bucket is set to PUBLIC.

-- A) Allow public read access to discount proofs (needed for cashier/admin/public dashboard)
DROP POLICY IF EXISTS "Public Access to discount proofs" ON storage.objects;
CREATE POLICY "Public Access to discount proofs"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'discount-proofs');

-- B) Allow anonymous/public users to upload files to the bucket
DROP POLICY IF EXISTS "Anonymous users can upload discount proofs" ON storage.objects;
CREATE POLICY "Anonymous users can upload discount proofs"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'discount-proofs');

-- C) Allow authenticated staff members to manage/delete files in this bucket
DROP POLICY IF EXISTS "Authenticated users can manage discount proofs" ON storage.objects;
CREATE POLICY "Authenticated users can manage discount proofs"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'discount-proofs')
    WITH CHECK (bucket_id = 'discount-proofs');
