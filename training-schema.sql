-- Active recall training migration. Safe to rerun in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.training_exercises (
  id text primary key,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  owner_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('translation', 'dictation')),
  prompt_zh text not null default '',
  answer_ru text not null default '',
  accepted_answers jsonb not null default '[]'::jsonb,
  explanation text not null default '',
  book_id text not null default '',
  book_title text not null default '',
  lesson_id text not null default '',
  lesson_title text not null default '',
  difficulty text not null default 'A2 巩固',
  knowledge_tags jsonb not null default '[]'::jsonb,
  source text not null default 'course',
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_exercises_queue_idx
  on public.training_exercises (status, book_id, lesson_id, type)
  where deleted_at is null;

create table if not exists public.training_exercise_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_id text not null references public.training_exercises(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  change_kind text not null default 'major',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (exercise_id, version)
);

create table if not exists public.training_attempts (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  exercise_version integer not null default 1,
  answer_text text not null default '',
  result text not null check (result in ('correct', 'wrong', 'skipped', 'pending_review')),
  hint_level integer not null default 0,
  response_ms integer not null default 0,
  review_status text,
  created_at timestamptz not null default now()
);

create index if not exists training_attempts_user_created_idx
  on public.training_attempts (user_id, created_at desc);

create table if not exists public.training_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  state text not null default '尚未评估',
  interval_days numeric not null default 0,
  ease numeric not null default 2.3,
  due_at timestamptz,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  hint_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index if not exists training_mastery_due_idx
  on public.training_mastery (user_id, due_at);

create table if not exists public.training_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.training_collection_items (
  collection_id uuid not null references public.training_collections(id) on delete cascade,
  exercise_id text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (collection_id, exercise_id)
);

create table if not exists public.training_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,
  normalized_answer text not null,
  verdict text not null check (verdict in ('correct', 'partial', 'wrong', 'unknown', 'pending')),
  explanation text not null default '',
  provider text,
  model text,
  estimated_cost numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id, normalized_answer)
);

alter table public.training_ai_reviews drop constraint if exists training_ai_reviews_exercise_id_normalized_answer_key;
create unique index if not exists training_ai_reviews_user_answer_idx
  on public.training_ai_reviews (user_id, exercise_id, normalized_answer);

create table if not exists public.training_ai_limits (
  id boolean primary key default true check (id),
  daily_calls integer not null default 50,
  monthly_cost numeric not null default 5,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.training_ai_limits (id) values (true) on conflict (id) do nothing;

create table if not exists public.training_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.training_exercises enable row level security;
alter table public.training_exercise_versions enable row level security;
alter table public.training_attempts enable row level security;
alter table public.training_mastery enable row level security;
alter table public.training_collections enable row level security;
alter table public.training_collection_items enable row level security;
alter table public.training_ai_reviews enable row level security;
alter table public.training_ai_limits enable row level security;
alter table public.training_audit_log enable row level security;

drop policy if exists "training exercises read" on public.training_exercises;
create policy "training exercises read" on public.training_exercises for select to authenticated
using ((status = 'published' and visibility = 'public') or owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists "training exercises admin write" on public.training_exercises;
create policy "training exercises admin write" on public.training_exercises for all to authenticated
using (public.is_admin() or owner_id = (select auth.uid()))
with check (public.is_admin() or (owner_id = (select auth.uid()) and visibility = 'private'));

drop policy if exists "training versions admin" on public.training_exercise_versions;
create policy "training versions admin" on public.training_exercise_versions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "training attempts own" on public.training_attempts;
create policy "training attempts own" on public.training_attempts for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()));

drop policy if exists "training mastery own" on public.training_mastery;
create policy "training mastery own" on public.training_mastery for all to authenticated
using (user_id = (select auth.uid()) or public.is_admin())
with check (user_id = (select auth.uid()));

drop policy if exists "training collections own" on public.training_collections;
create policy "training collections own" on public.training_collections for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "training collection items own" on public.training_collection_items;
create policy "training collection items own" on public.training_collection_items for all to authenticated
using (exists (select 1 from public.training_collections c where c.id = collection_id and c.user_id = (select auth.uid())))
with check (exists (select 1 from public.training_collections c where c.id = collection_id and c.user_id = (select auth.uid())));

drop policy if exists "training ai reviews own" on public.training_ai_reviews;
create policy "training ai reviews own" on public.training_ai_reviews for select to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "training ai limits admin" on public.training_ai_limits;
create policy "training ai limits admin" on public.training_ai_limits for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "training audit admin" on public.training_audit_log;
create policy "training audit admin" on public.training_audit_log for select to authenticated
using (public.is_admin());

create or replace function public.audit_training_exercise()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.training_audit_log(actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), tg_op, 'training_exercise', coalesce(new.id, old.id), to_jsonb(old), to_jsonb(new));
  if tg_op = 'UPDATE' and new.version > old.version then
    insert into public.training_exercise_versions(exercise_id, version, snapshot, created_by)
    values (old.id, old.version, to_jsonb(old), auth.uid()) on conflict do nothing;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists training_exercise_audit on public.training_exercises;
create trigger training_exercise_audit after insert or update or delete on public.training_exercises
for each row execute procedure public.audit_training_exercise();

