-- 004_create_facility_profiles.sql
-- One row per facility. `is_verified` flips to true only by admin action;
-- `avg_rating` is system-maintained. Both are protected from self-service edits.

create table public.facility_profiles (
  user_id       uuid primary key references public.users (id) on delete cascade,
  facility_name text not null,
  facility_type facility_type not null,
  cac_number    text not null,
  address       text not null,
  city          text not null,
  state         text not null,
  contact_name  text not null,
  is_verified   boolean not null default false,
  avg_rating    numeric(2, 1) check (avg_rating is null or (avg_rating >= 1 and avg_rating <= 5)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger facility_profiles_set_updated_at
  before update on public.facility_profiles
  for each row execute function public.set_updated_at();

-- Block non-admins from changing protected columns (is_verified, avg_rating).
create or replace function public.guard_facility_protected_columns()
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

create trigger facility_profiles_guard_protected
  before update on public.facility_profiles
  for each row execute function public.guard_facility_protected_columns();

alter table public.facility_profiles enable row level security;

-- Read: any authenticated user can read facility profiles (name/rating shown on
-- shift detail pages); admins read all.
create policy facility_profiles_select_all
  on public.facility_profiles for select
  to authenticated
  using (true);

-- Insert: a facility creates their own profile row only.
create policy facility_profiles_insert_own
  on public.facility_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

-- Update: a facility updates their own row; admins update any row.
create policy facility_profiles_update_own
  on public.facility_profiles for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
