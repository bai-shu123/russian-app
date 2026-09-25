-- Run this file once in Supabase SQL Editor after the accounts are registered.
-- It adds account email information for the administrator dashboard and grants
-- administrator privileges to the existing usernames "admin" and "baishu".

alter table public.profiles add column if not exists email text;

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
