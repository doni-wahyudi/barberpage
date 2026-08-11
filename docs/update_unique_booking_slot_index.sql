-- ============================================================
-- UPDATE UNIQUE BOOKING CONSTRAINT
-- Auro Barbershop | barberpage project
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop old unique index that blocked rebooking on completed slots
DROP INDEX IF EXISTS public.unique_booking_slot;

-- 2. Recreate unique index to ONLY enforce uniqueness for active bookings ('pending', 'confirmed')
-- This ensures that when a capster finishes a haircut and marks the status as 'completed',
-- the slot is automatically vacated and available for new bookings.
CREATE UNIQUE INDEX unique_booking_slot
ON public.bookings (booking_date, booking_time, barber_name)
WHERE status IN ('pending', 'confirmed');
