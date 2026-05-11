-- ============================================================
-- VOUCHER & PROMOTION SYSTEM — FULL SCHEMA
-- Auro Barbershop | barberpage project
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- -------------------------------------------------------
-- TABLE 1: promotion_programs
-- The master table for all discount/voucher programs.
-- Add new programs here without touching any code.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotion_programs (
    id                  TEXT PRIMARY KEY,           -- slug, e.g. 'sg_unila_2026'
    name                TEXT NOT NULL,              -- Display name: 'SG Unila 2026'
    description         TEXT,                       -- Short description shown to customer
    terms               TEXT,                       -- Full terms & conditions

    -- Discount Configuration
    discount_type       TEXT NOT NULL DEFAULT 'fixed'
                            CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value      INTEGER NOT NULL,           -- IDR amount OR percentage (1-100)
    max_discount        INTEGER,                    -- Rp cap for percentage discounts (NULL = no cap)

    -- Eligibility & Verification
    verification_method TEXT NOT NULL DEFAULT 'otp_email'
                            CHECK (verification_method IN ('otp_email', 'code', 'none')),
    is_one_time_per_user BOOLEAN NOT NULL DEFAULT true, -- One claim per identifier (NPM)

    -- Validity Window
    start_date          DATE,                       -- NULL = immediately active
    end_date            DATE,                       -- NULL = no expiry
    otp_expiry_minutes  INTEGER NOT NULL DEFAULT 10, -- OTP validity window

    -- Quota
    max_total_claims    INTEGER,                    -- NULL = unlimited

    -- UI Appearance (used in frontend badge)
    icon                TEXT DEFAULT '🎓',
    badge_color         TEXT DEFAULT '#d4af37',     -- Gold default

    -- Status
    is_active           BOOLEAN NOT NULL DEFAULT true,

    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Seed: Insert the SG Unila program
INSERT INTO promotion_programs (
    id, name, description, terms,
    discount_type, discount_value,
    verification_method, is_one_time_per_user,
    start_date, end_date, otp_expiry_minutes,
    max_total_claims, icon, badge_color
) VALUES (
    'sg_unila_2026',
    'SG Unila',
    'Program diskon khusus mahasiswa Universitas Lampung yang terdaftar.',
    'Berlaku satu kali per NPM. Tidak dapat digabungkan dengan diskon lain. Hanya berlaku untuk layanan cukur.',
    'fixed', 5000,
    'otp_email', true,
    '2026-01-01', '2026-12-31', 10,
    1524,   -- roughly the number of unique eligible students
    '🎓', '#d4af37'
) ON CONFLICT (id) DO NOTHING;


-- -------------------------------------------------------
-- TABLE 2: program_eligible_users
-- List of students/users eligible for a specific program.
-- Populated by importing the Excel file.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_eligible_users (
    id              BIGSERIAL PRIMARY KEY,
    program_id      TEXT NOT NULL REFERENCES promotion_programs(id) ON DELETE CASCADE,
    identifier      TEXT NOT NULL,              -- NPM (stored as text to be safe)
    email           TEXT NOT NULL,
    name            TEXT,
    phone_number    TEXT,
    metadata        JSONB,                      -- For future: extra fields from Excel
    created_at      TIMESTAMPTZ DEFAULT now(),

    UNIQUE (program_id, identifier)             -- Prevents duplicate NPMs per program
);

CREATE INDEX IF NOT EXISTS idx_eligible_identifier ON program_eligible_users (program_id, identifier);
CREATE INDEX IF NOT EXISTS idx_eligible_phone ON program_eligible_users (program_id, phone_number);


-- -------------------------------------------------------
-- TABLE 3: program_otps
-- Stores generated OTP codes (expire after N minutes).
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_otps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id      TEXT NOT NULL REFERENCES promotion_programs(id),
    identifier      TEXT NOT NULL,              -- NPM of the student
    otp_code        TEXT NOT NULL,              -- 6-digit code
    email_sent_to   TEXT NOT NULL,              -- Masked for display, full for sending
    is_used         BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL        -- Calculated: now() + otp_expiry_minutes
);

CREATE INDEX IF NOT EXISTS idx_otp_lookup ON program_otps (program_id, identifier, is_used);


-- -------------------------------------------------------
-- TABLE 4: program_claims
-- Records all successfully redeemed vouchers.
-- The UNIQUE constraint is the core one-time-use guard.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS program_claims (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id          TEXT NOT NULL REFERENCES promotion_programs(id),
    identifier          TEXT NOT NULL,          -- NPM
    user_name           TEXT,                   -- Denormalized for easy reporting
    booking_id          UUID,                   -- Linked after booking is confirmed
    discount_applied    INTEGER NOT NULL,       -- Actual discount amount (in IDR)
    claimed_at          TIMESTAMPTZ DEFAULT now(),

    UNIQUE (program_id, identifier)             -- *** THE ONE-TIME-USE ENFORCEMENT ***
);

CREATE INDEX IF NOT EXISTS idx_claims_booking ON program_claims (booking_id);


-- -------------------------------------------------------
-- STEP 5: Update bookings table to store voucher info
-- -------------------------------------------------------
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS voucher_discount  INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS voucher_program   TEXT;


-- -------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------
ALTER TABLE promotion_programs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_eligible_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_otps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_claims          ENABLE ROW LEVEL SECURITY;

-- Public can READ active programs (for the frontend to display options)
CREATE POLICY "Public can read active programs"
    ON promotion_programs FOR SELECT
    USING (is_active = true);

-- Public CANNOT directly read the eligible list (prevents data harvesting)
-- Access is only via the Edge Function (service role)
CREATE POLICY "No public access to eligible list"
    ON program_eligible_users FOR SELECT
    USING (false);

-- Public CANNOT directly read OTPs
CREATE POLICY "No public access to OTPs"
    ON program_otps FOR SELECT
    USING (false);

-- Public CAN read their own claim (to check if already claimed)
-- But cannot insert directly — Edge Function handles that
CREATE POLICY "No public insert to claims"
    ON program_claims FOR SELECT
    USING (false);

-- ============================================================
-- DONE. Run the import script next to populate eligible users.
-- ============================================================
