-- Russian app shared accounts and feedback
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;

update public.profiles as profile
set email = users.email
from auth.users as users
where profile.id = users.id
  and profile.email is distinct from users.email;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  feedback_type text not null,
  title text not null,
  content text not null,
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
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
drop policy if exists "profiles own or admin read" on public.profiles;
create policy "profiles own or admin read" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists "feedback own or admin read" on public.feedback;
create policy "feedback own or admin read" on public.feedback
for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "feedback own insert" on public.feedback;
create policy "feedback own insert" on public.feedback
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "feedback admin update" on public.feedback;
create policy "feedback admin update" on public.feedback
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- The project owner chose the registered usernames "admin" and "baishu" as administrators.
update public.profiles
set role = 'admin'
where lower(username) in ('admin', 'baishu');
