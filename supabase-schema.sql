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

create table if not exists public.wordbook_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null,
  ru text not null,
  display_ru text not null,
  zh text not null default '',
  pos text not null default '',
  book_title text not null default '',
  lesson_id text not null default '',
  source text not null default '词汇查询',
  created_at timestamptz not null default now(),
  primary key (user_id, word_key)
);

alter table public.profiles enable row level security;
alter table public.feedback enable row level security;
alter table public.learning_progress enable row level security;
alter table public.wordbook_entries enable row level security;

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

drop policy if exists "wordbook own read" on public.wordbook_entries;
create policy "wordbook own read" on public.wordbook_entries
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "wordbook own insert" on public.wordbook_entries;
create policy "wordbook own insert" on public.wordbook_entries
for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "wordbook own update" on public.wordbook_entries;
create policy "wordbook own update" on public.wordbook_entries
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "wordbook own delete" on public.wordbook_entries;
create policy "wordbook own delete" on public.wordbook_entries
for delete to authenticated
using (user_id = (select auth.uid()));

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
