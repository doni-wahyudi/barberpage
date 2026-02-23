-- Add total_price column to bookings table to support loyalty point calculations
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_price integer DEFAULT 0;
