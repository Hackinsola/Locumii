-- 030_create_waitlist.sql
-- Pre-launch waitlist captured from the public marketing site. Anonymous visitors
-- may add their email; only admins may read the list. No passwords are collected
-- (the real account/password flow is the post-launch auth signup).

create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  full_name   text,
  role        text check (role in ('professional', 'facility')),
  created_at  timestamptz not null default now()
);

-- One row per email (case-insensitive) so repeat submissions don't pile up; the
-- client treats the resulting unique-violation as "already on the list".
create unique index waitlist_email_unique_idx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Public signup: anonymous (signed-out) and authenticated visitors may add a row.
-- Insert-only — no select/update/delete is granted to these roles.
-- (031 tightens this WITH CHECK to validate the email shape at the DB layer.)
create policy waitlist_insert_anyone
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Only admins may read the captured list (service_role bypasses RLS for exports).
create policy waitlist_select_admin
  on public.waitlist for select
  to authenticated
  using (public.is_admin());
