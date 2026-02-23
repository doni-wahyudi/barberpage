-- Create the reviews table
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  customer_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.reviews enable row level security;

-- Policies
-- 1. Anyone can insert a review (to allow public submission)
create policy "Enable insert access for all users"
  on public.reviews
  for insert
  with check (true);

-- 2. Anyone can view reviews (public reading)
create policy "Enable read access for all users"
  on public.reviews
  for select
  using (true);

-- 3. Only authenticated admins can update or delete reviews
create policy "Enable update for authenticated users only"
  on public.reviews
  for update
  using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
  on public.reviews
  for delete
  using (auth.role() = 'authenticated');
