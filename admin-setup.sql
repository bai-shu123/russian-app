-- Run this file once in Supabase SQL Editor after the "admin" account is registered.
-- It adds account email information for the administrator dashboard and grants
-- the existing username "admin" administrator privileges.

alter table public.profiles add column if not exists email text;

update public.profiles as profile
set email = users.email
from auth.users as users
where profile.id = users.id
  and profile.email is distinct from users.email;

update public.profiles
set role = 'admin'
where lower(username) = 'admin';

select username, email, role, created_at
from public.profiles
where lower(username) = 'admin';
