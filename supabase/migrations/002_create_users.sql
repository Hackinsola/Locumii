-- 002_create_users.sql
-- The `users` table mirrors auth.users. `role` and `status` are application-managed.
-- Also defines two shared helper functions used by RLS policies across the schema
-- (defined here because `users` is their first consumer).

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- True when the current JWT carries app_metadata.role = 'admin'.
-- architecture.md: "The JWT's app_metadata.role claim is set at registration
-- and used by Row-Level Security policies."
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Generic updated_at maintenance trigger, reused by every table carrying updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create table public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       user_role not null,
  phone      text,
  status     user_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is
  'Application user record mirroring auth.users. Inserted at registration by a security-definer trigger (defined in the auth-flow unit), not by client INSERT, so that role cannot be self-assigned.';

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

-- Read: a user can read their own row; admins read all.
create policy users_select_own
  on public.users for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Update: admins only (e.g. flipping status to active/suspended).
-- Self-service profile data lives in the *_profiles tables, not here.
create policy users_update_admin
  on public.users for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No client INSERT/DELETE policy: registration inserts run through a
-- security-definer trigger (auth-flow unit); deletes cascade from auth.users.
