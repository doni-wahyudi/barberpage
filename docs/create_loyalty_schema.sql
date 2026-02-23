-- 1. App Settings Table
-- Used for storing globally adjustable configuration values like points ratios.
create table public.app_settings (
  id integer primary key default 1,
  points_per_1000_spent integer not null default 1,
  points_per_app_review integer not null default 10,
  points_per_google_review integer not null default 10,
  discount_per_point integer not null default 25,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure only one row exists since these are global settings
  constraint single_row check (id = 1)
);

-- Insert default settings row
insert into public.app_settings (id) values (1) on conflict do nothing;

-- 2. Customers Table
-- Tracks loyalty points for each unique phone number
create table public.customers (
  phone_number text primary key,
  name text not null,
  points integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Point Transactions Table
-- Audit log for every time points are added or deducted
create table public.point_transactions (
  id uuid default gen_random_uuid() primary key,
  phone_number text references public.customers(phone_number) on delete cascade not null,
  amount integer not null, -- positive for earning, negative for redeeming
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Reviews Table
-- For dual review system
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  phone_number text references public.customers(phone_number) on delete cascade not null,
  customer_name text not null,
  rating integer, -- 1 to 5 (can be null if they only did google review)
  comment text,
  is_google_clicked boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- Row Level Security (RLS)

alter table public.app_settings enable row level security;
alter table public.customers enable row level security;
alter table public.point_transactions enable row level security;
alter table public.reviews enable row level security;

-- App Settings access
create policy "Public can read app settings" on public.app_settings for select using (true);
create policy "Admins can update app settings" on public.app_settings for update using (auth.role() = 'authenticated');

-- Customers access
create policy "Public can view customer points" on public.customers for select using (true);
create policy "Public can insert new customers" on public.customers for insert with check (true);
create policy "Public can update customer points" on public.customers for update using (true);

-- Point transactions access
create policy "Public can read own transactions" on public.point_transactions for select using (true);
create policy "Public can insert transactions" on public.point_transactions for insert with check (true);

-- Reviews access
create policy "Public can read reviews" on public.reviews for select using (true);
create policy "Public can insert reviews" on public.reviews for insert with check (true);
create policy "Public can update own reviews" on public.reviews for update using (true);
create policy "Admins can delete reviews" on public.reviews for delete using (auth.role() = 'authenticated');
