-- ============================================================
-- MIGRATION: ADD CUSTOMER SPECIAL MARK & PUBLIC DISCOUNTS VISIBILITY
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add special_mark column to public.customers if it doesn't exist
ALTER TABLE public.customers 
    ADD COLUMN IF NOT EXISTS special_mark TEXT;

-- 2. Add show_public column to public.discounts if it doesn't exist
ALTER TABLE public.discounts 
    ADD COLUMN IF NOT EXISTS show_public BOOLEAN DEFAULT false;

-- 3. Configure Row Level Security (RLS) policies for discounts table
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to read active public discounts
DROP POLICY IF EXISTS "Allow public read access to active public discounts" ON public.discounts;
CREATE POLICY "Allow public read access to active public discounts" ON public.discounts
    FOR SELECT USING (is_active = true AND show_public = true);

-- Allow authenticated users (staff/admin) to manage all discounts
DROP POLICY IF EXISTS "Allow authenticated users to manage discounts" ON public.discounts;
CREATE POLICY "Allow authenticated users to manage discounts" ON public.discounts
    FOR ALL USING (auth.role() = 'authenticated');
