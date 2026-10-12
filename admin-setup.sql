-- Run this file in Supabase SQL Editor after the accounts are registered.
-- It is safe to rerun when deploying updates. It prepares feedback management,
-- account learning data, and administrator access for "admin" and "baishu".
-- Active-recall training tables live in training-schema.sql and should be run after this file.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists email text;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  feedback_type text not null,
  title text not null,
  content text not null,
  reply text,
  replied_at timestamptz,
  status text not null default 'pending',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.feedback add column if not exists status text;
alter table public.feedback add column if not exists resolved_at timestamptz;
alter table public.feedback alter column status set default 'pending';
update public.feedback
set status = case when reply is not null then 'resolved' else 'pending' end
where status is null or status not in ('pending', 'processing', 'resolved');
update public.feedback
set resolved_at = coalesce(resolved_at, replied_at)
where status = 'resolved' and resolved_at is null;
alter table public.feedback alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.feedback'::regclass
      and conname = 'feedback_status_check'
  ) then
    alter table public.feedback
      add constraint feedback_status_check check (status in ('pending', 'processing', 'resolved'));
  end if;
end $$;

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
alter table public.feedback enable row level security;

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

drop policy if exists "feedback own or admin read" on public.feedback;
create policy "feedback own or admin read" on public.feedback
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "feedback own insert" on public.feedback;
create policy "feedback own insert" on public.feedback
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and reply is null
  and replied_at is null
  and resolved_at is null
);

drop policy if exists "feedback admin update" on public.feedback;
create policy "feedback admin update" on public.feedback
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "feedback admin delete" on public.feedback;
create policy "feedback admin delete" on public.feedback
for delete to authenticated
using (public.is_admin());

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
