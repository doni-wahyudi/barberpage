-- ============================================================
-- STORE SETTINGS & OPERATING HOURS (UPDATE SCRIPT)
-- Auro Barbershop | barberpage project
-- Run this in Supabase SQL Editor to update your existing settings row
-- ============================================================

-- 1. Enable Row Level Security (RLS) and grant read/write access
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow authenticated full access on settings" ON public.settings;

CREATE POLICY "Allow public read on settings"
    ON public.settings
    FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated full access on settings"
    ON public.settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Update existing settings row (id = 1)
UPDATE public.settings
SET
    opening_hour = '09:00',
    closing_hour = '21:00',
    daily_hours = '[
        {"dayName": "Senin", "dayOfWeek": 1, "isHoliday": false, "openingHour": "09:00", "closingHour": "21:00"},
        {"dayName": "Selasa", "dayOfWeek": 2, "isHoliday": false, "openingHour": "09:00", "closingHour": "21:00"},
        {"dayName": "Rabu", "dayOfWeek": 3, "isHoliday": false, "openingHour": "09:00", "closingHour": "21:00"},
        {"dayName": "Kamis", "dayOfWeek": 4, "isHoliday": false, "openingHour": "09:00", "closingHour": "21:00"},
        {"dayName": "Jumat", "dayOfWeek": 5, "isHoliday": false, "openingHour": "09:00", "closingHour": "21:00"},
        {"dayName": "Sabtu", "dayOfWeek": 6, "isHoliday": true, "openingHour": "09:00", "closingHour": "22:00"},
        {"dayName": "Minggu", "dayOfWeek": 0, "isHoliday": false, "openingHour": "09:00", "closingHour": "21:00"}
    ]'::jsonb,
    updated_at = timezone('utc'::text, now())
WHERE id = 1;
