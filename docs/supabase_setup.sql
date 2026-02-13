-- DCUKUR Barbershop - Supabase Database Setup Script

-- 1. Create the bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    service_type TEXT NOT NULL,
    barber_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME WITHOUT TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Allow anyone to insert (Book a seat)
CREATE POLICY "Enable insert for all users" 
ON public.bookings 
FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users (Admin) to view all bookings
-- Replace 'authenticated' with specific roles if needed
CREATE POLICY "Enable select for authenticated users" 
ON public.bookings 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to update status
CREATE POLICY "Enable update for authenticated users" 
ON public.bookings 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Enable Realtime (Optional)
-- This allows the admin app to listen for new bookings instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
