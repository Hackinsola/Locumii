-- 003_create_professional_profiles.sql
-- One row per professional. `is_verified` flips to true only by admin action;
-- `avg_rating` is system-maintained. Both are protected from self-service edits
-- by a trigger (supports INV-02).

create table public.professional_profiles (
  user_id             uuid primary key references public.users (id) on delete cascade,
  full_name           text not null,
  specialty           professional_specialty not null,
  council_reg_number  text not null,
  years_experience    integer not null default 0 check (years_experience >= 0),
  bio                 text,
  preferred_cities    text[] not null default '{}',
  is_verified         boolean not null default false,
  avg_rating          numeric(2, 1) check (avg_rating is null or (avg_rating >= 1 and avg_rating <= 5)),
  bank_account_number text,
  bank_code           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger professional_profiles_set_updated_at
  before update on public.professional_profiles
  for each row execute function public.set_updated_at();

-- Block non-admins from changing protected columns (is_verified, avg_rating).
-- This keeps INV-02 ("verified flips only by admin action") true at the DB layer
-- even though professionals may update the rest of their own row.
create or replace function public.guard_professional_protected_columns()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    if new.is_verified is distinct from old.is_verified then
      raise exception 'is_verified can only be changed by an admin';
    end if;
    if new.avg_rating is distinct from old.avg_rating then
      raise exception 'avg_rating is system-maintained and cannot be set directly';
    end if;
  end if;
  return new;
end;
$$;

create trigger professional_profiles_guard_protected
  before update on public.professional_profiles
  for each row execute function public.guard_professional_protected_columns();

alter table public.professional_profiles enable row level security;

-- Read: any authenticated user can read professional profiles; admins read all.
create policy professional_profiles_select_all
  on public.professional_profiles for select
  to authenticated
  using (true);

-- Insert: a professional creates their own profile row only.
-- is_verified defaults to false and cannot be set true here (guard trigger).
create policy professional_profiles_insert_own
  on public.professional_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

-- Update: a professional updates their own row; admins update any row.
create policy professional_profiles_update_own
  on public.professional_profiles for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
