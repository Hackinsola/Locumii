-- 008_create_shift_confirmations.sql
-- Dual-confirmation record for a shift. One row per shift. When both
-- professional_confirmed_at and facility_confirmed_at are non-null, the
-- release-payment Edge Function (built in a later unit) disburses funds.

create table public.shift_confirmations (
  shift_id                 uuid primary key references public.shifts (id) on delete cascade,
  professional_confirmed_at timestamptz,
  facility_confirmed_at     timestamptz,
  created_at                timestamptz not null default now()
);

-- Each party may only set their own confirmation timestamp, and a populated
-- timestamp may not be cleared. Admins (and service_role, which bypasses RLS) are
-- exempt so disputes can be corrected.
create or replace function public.guard_shift_confirmation_columns()
returns trigger
language plpgsql
as $$
begin
  -- Admins (and service_role, which bypasses RLS entirely) may correct disputes.
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.professional_confirmed_at is not null
       and not public.is_accepted_shift_professional(new.shift_id) then
      raise exception 'Only the accepted professional may set professional_confirmed_at';
    end if;
    if new.facility_confirmed_at is not null
       and not public.is_shift_facility(new.shift_id) then
      raise exception 'Only the facility may set facility_confirmed_at';
    end if;
    return new;
  end if;

  -- UPDATE: a party may populate only its own column, and only if not already set.
  if new.professional_confirmed_at is distinct from old.professional_confirmed_at then
    if old.professional_confirmed_at is not null then
      raise exception 'professional_confirmed_at cannot be changed once set';
    end if;
    if not public.is_accepted_shift_professional(new.shift_id) then
      raise exception 'Only the accepted professional may set professional_confirmed_at';
    end if;
  end if;

  if new.facility_confirmed_at is distinct from old.facility_confirmed_at then
    if old.facility_confirmed_at is not null then
      raise exception 'facility_confirmed_at cannot be changed once set';
    end if;
    if not public.is_shift_facility(new.shift_id) then
      raise exception 'Only the facility may set facility_confirmed_at';
    end if;
  end if;

  return new;
end;
$$;

create trigger shift_confirmations_guard_columns
  before insert or update on public.shift_confirmations
  for each row execute function public.guard_shift_confirmation_columns();

alter table public.shift_confirmations enable row level security;

-- Read: the facility owner, the accepted professional, and admins.
create policy shift_confirmations_select_parties
  on public.shift_confirmations for select
  to authenticated
  using (
    public.is_shift_facility(shift_id)
    or public.is_accepted_shift_professional(shift_id)
    or public.is_admin()
  );

-- Insert/Update: either party to the shift (or admin). The guard trigger above
-- restricts which column each party may actually write.
create policy shift_confirmations_insert_parties
  on public.shift_confirmations for insert
  to authenticated
  with check (
    public.is_shift_facility(shift_id)
    or public.is_accepted_shift_professional(shift_id)
    or public.is_admin()
  );

create policy shift_confirmations_update_parties
  on public.shift_confirmations for update
  to authenticated
  using (
    public.is_shift_facility(shift_id)
    or public.is_accepted_shift_professional(shift_id)
    or public.is_admin()
  )
  with check (
    public.is_shift_facility(shift_id)
    or public.is_accepted_shift_professional(shift_id)
    or public.is_admin()
  );
