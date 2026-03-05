-- ==========================================
-- Add sort_order column to tables for manual sorting
-- ==========================================

ALTER TABLE public.gallery_images ADD COLUMN IF NOT EXISTS sort_order integer default 0;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS sort_order integer default 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order integer default 0;
