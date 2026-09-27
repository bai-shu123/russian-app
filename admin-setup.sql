-- Run this file once in Supabase SQL Editor after the accounts are registered.
-- It adds account email information for the administrator dashboard and grants
-- administrator privileges to the existing usernames "admin" and "baishu".

alter table public.profiles add column if not exists email text;

create table if not exists public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  streak integer not null default 0,
  quizzes_completed integer not null default 0,
  best_score integer not null default 0,
  words_learned_count integer not null default 0,
  lessons_viewed_count integer not null default 0,
  last_visit text,
  last_seen_at timestamptz,
  is_online boolean not null default false,
  current_book_id text,
  updated_at timestamptz not null default now()
);

alter table public.learning_progress enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "learning progress own or admin read" on public.learning_progress;
create policy "learning progress own or admin read" on public.learning_progress
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "learning progress own insert" on public.learning_progress;
create policy "learning progress own insert" on public.learning_progress
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "learning progress own update" on public.learning_progress;
create policy "learning progress own update" on public.learning_progress
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

update public.profiles as profile
set email = users.email
from auth.users as users
where profile.id = users.id
  and profile.email is distinct from users.email;

update public.profiles
set role = 'admin'
where lower(username) in ('admin', 'baishu');

select username, email, role, created_at
from public.profiles
where lower(username) in ('admin', 'baishu')
order by username;
