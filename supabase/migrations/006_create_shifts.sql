-- 006_create_shifts.sql
-- Shifts posted by facilities. INV-07: shift status moves forward only through
-- open -> filled -> in_progress -> completed, with -> cancelled allowed only from
-- open or filled. Enforced by a trigger that rejects every other transition.
--
-- Money note: pay_rate_naira holds an INTEGER amount in KOBO (1 Naira = 100 kobo),
-- per code-standards.md. The column name keeps the architecture.md spelling; the
-- stored unit is kobo. The money.js utility converts to display Naira.

create table public.shifts (
  id                 uuid primary key default gen_random_uuid(),
  facility_id        uuid not null references public.facility_profiles (user_id) on delete cascade,
  role_required      text not null,
  start_time         timestamptz not null,
  end_time           timestamptz not null,
  pay_rate_naira     integer not null check (pay_rate_naira > 0),
  requirements       text,
  city               text not null,
  status             shift_status not null default 'open',
  paystack_reference text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint shifts_time_order check (end_time > start_time)
);

comment on column public.shifts.pay_rate_naira is
  'Pay rate stored as an integer in kobo (1 Naira = 100 kobo), despite the _naira name.';

create index shifts_status_idx on public.shifts (status);
create index shifts_facility_id_idx on public.shifts (facility_id);
create index shifts_start_time_idx on public.shifts (start_time);

create trigger shifts_set_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

-- INV-07: enforce the one-directional shift status state machine.
create or replace function public.enforce_shift_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
       (old.status = 'open'        and new.status in ('filled', 'cancelled'))
    or (old.status = 'filled'      and new.status in ('in_progress', 'cancelled'))
    or (old.status = 'in_progress' and new.status = 'completed')
  ) then
    raise exception 'Illegal shift status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger shifts_enforce_status_transition
  before update on public.shifts
  for each row execute function public.enforce_shift_status_transition();

alter table public.shifts enable row level security;

-- Read: open shifts are readable by any authenticated user; a facility reads its
-- own shifts in any status; admins read all. (Professionals also read shifts they
-- have bid on -- that policy is added in 007, once the bids table exists.)
create policy shifts_select_open
  on public.shifts for select
  to authenticated
  using (status = 'open' or facility_id = auth.uid() or public.is_admin());

-- Insert: facilities post their own shifts only.
create policy shifts_insert_own
  on public.shifts for insert
  to authenticated
  with check (facility_id = auth.uid());

-- Update: a facility updates its own shifts; admins update any.
-- (Edge Functions run with service_role and bypass RLS.)
create policy shifts_update_own
  on public.shifts for update
  to authenticated
  using (facility_id = auth.uid() or public.is_admin())
  with check (facility_id = auth.uid() or public.is_admin());
