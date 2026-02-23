-- Update bookings table for queue monitor functionality
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS queue_status TEXT DEFAULT 'waiting' 
CHECK (queue_status IN ('waiting', 'in_progress', 'late', 'skipped', 'completed')),
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE;
