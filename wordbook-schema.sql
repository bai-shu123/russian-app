-- Run this once in Supabase SQL Editor to enable cross-browser vocabulary sync.
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

alter table public.wordbook_entries enable row level security;

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
