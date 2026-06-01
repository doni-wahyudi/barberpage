-- Create public feedback table for the Barberpage floating "Saran dan Masukan" form.
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone_number text,
  category text not null default 'Saran',
  message text not null,
  source text not null default 'barberpage_home',
  status text not null default 'new',
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint feedback_submissions_category_check check (category in ('Saran', 'Keluhan', 'Pujian', 'Lainnya')),
  constraint feedback_submissions_status_check check (status in ('new', 'reviewed', 'done', 'archived')),
  constraint feedback_submissions_message_length_check check (char_length(trim(message)) between 5 and 1000)
);

alter table public.feedback_submissions enable row level security;

create policy "Anyone can submit feedback"
  on public.feedback_submissions
  for insert
  to anon, authenticated
  with check (
    category in ('Saran', 'Keluhan', 'Pujian', 'Lainnya')
    and char_length(trim(message)) between 5 and 1000
    and status = 'new'
  );

create policy "Authenticated users can view feedback"
  on public.feedback_submissions
  for select
  to authenticated
  using ((select auth.role()) = 'authenticated');

create policy "Authenticated users can update feedback status"
  on public.feedback_submissions
  for update
  to authenticated
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');
