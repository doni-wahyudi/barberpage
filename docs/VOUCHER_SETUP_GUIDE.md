# 📖 Voucher System — Import & Setup Guide

This guide walks you through setting up the voucher database from scratch.
Do these steps **in order** before any frontend code is deployed.

---

## Step 1: Run the Schema SQL

1. Open **Supabase Dashboard** → your project → **SQL Editor**
2. Click **"New Query"**
3. Open the file [`docs/create_voucher_schema.sql`](./create_voucher_schema.sql) and paste its entire contents
4. Click **"Run"**

**What this creates:**
| Table | Purpose |
|---|---|
| `promotion_programs` | Master list of all discount programs (editable from Admin) |
| `program_eligible_users` | Eligible student list (populated by import) |
| `program_otps` | OTP codes sent by email (auto-expires in 10 min) |
| `program_claims` | Audit trail of redeemed vouchers |

It also adds two columns to the existing `bookings` table: `voucher_discount` and `voucher_program`.

---

## Step 2: Generate the SQL from Excel

> Run this **once** from the `barberpage` project root folder.

**Requirements:** Python 3 + openpyxl (`pip install openpyxl`)

```powershell
# From project root: c:\Users\whydo\D9043DB2025\code\explore\build\barberpage\
python docs/import_voucher_eligible.py
```

**Expected output:**
```
Total rows in Excel: 1578
Skipped (bad/missing NPM): 1
Unique NPMs after deduplication: 1524
Duplicates removed: 53
Generating SQL -> docs/insert_eligible_users.sql

[OK] Done! SQL file generated: docs/insert_eligible_users.sql
```

This generates `docs/insert_eligible_users.sql` — a file with **1,524 INSERT rows**.

---

## Step 3: Import the Data into Supabase

**Option A — SQL Editor (Recommended for first time):**
1. In Supabase → **SQL Editor** → **"New Query"**
2. Open `docs/insert_eligible_users.sql`
3. **The file is large (~1,524 rows).** Copy-paste it in full and click **"Run"**
4. You should see: `1524 rows affected`

**Option B — Supabase CLI (for re-imports/CI):**
```bash
supabase db execute --file docs/insert_eligible_users.sql
```

> [!NOTE]
> The SQL uses `ON CONFLICT (program_id, identifier) DO UPDATE`, so re-running it is safe — it will just update existing rows instead of failing.

---

## Step 4: Set Up Gmail App Password

> This is required for the Edge Function to send OTP emails.

1. Sign in to **Google Account** as `aurobarbershop@gmail.com`
2. Go to: https://myaccount.google.com/security
3. Enable **2-Step Verification** (if not already enabled)
4. Go back to Security → search **"App Passwords"**
5. Click **"App Passwords"** → select **"Mail"** and **"Windows Computer"** (or just "Other")
6. Name it: `Barberpage OTP`
7. Click **Generate** → Copy the **16-character code** (e.g., `abcd efgh ijkl mnop`)

> [!CAUTION]
> You will only see this code **once**. Store it safely — treat it like a password.

---

## Step 5: Set Edge Function Secrets in Supabase

1. Open Supabase Dashboard → **Edge Functions** → **Manage Secrets**
2. Add these two secrets:

| Secret Name | Value |
|---|---|
| `GMAIL_USER` | `aurobarbershop@gmail.com` |
| `GMAIL_APP_PASSWORD` | `(the 16-char App Password from Step 4)` |

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **automatically injected** by Supabase — you don't need to set these.

---

## Step 6: Deploy the Edge Function

Once the Edge Function code is written (next phase), deploy it:

```bash
# Install Supabase CLI if you don't have it
npm install -g supabase

# Login
supabase login

# Link to your project (run once)
supabase link --project-ref ifawbnmbmedwwsmaqzxm

# Deploy the function
supabase functions deploy send-voucher-otp
```

---

## Verification Checklist

After completing all steps, run these checks in Supabase:

```sql
-- Check: programs table has SG Unila entry
SELECT * FROM promotion_programs;

-- Check: eligible users are loaded (should be 1524)
SELECT COUNT(*) FROM program_eligible_users;

-- Check: bookings table has new columns
SELECT voucher_discount, voucher_program FROM bookings LIMIT 1;

-- Test: look up a specific student (replace with real NPM from Excel)
SELECT * FROM program_eligible_users WHERE identifier = '2414181045';
```

---

## Adding a New Discount Program in the Future

When you want to create a new program (e.g., "Promo Lebaran 2027"):

1. **Insert a row** in `promotion_programs`:
```sql
INSERT INTO promotion_programs (
    id, name, description,
    discount_type, discount_value,
    start_date, end_date,
    icon, badge_color, is_active
) VALUES (
    'lebaran_2027',
    'Promo Lebaran 2027',
    'Diskon spesial menyambut Lebaran!',
    'fixed', 10000,
    '2027-03-01', '2027-04-30',
    '🌙', '#c0a050', true
);
```

2. If this program has an **eligible list**, prepare a new Excel/CSV and re-run a modified version of the import script with the new `PROGRAM_ID`.

3. If the program has **no eligibility restriction** (open to all), set `verification_method = 'code'` or `'none'` in the row and the frontend will handle it differently.

**No code changes needed for new programs!** The frontend reads `promotion_programs` dynamically.
