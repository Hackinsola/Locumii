-- 007_create_bids.sql
-- Bids placed by professionals on shifts. At most one bid per professional per
-- shift. Enforces two invariants at the database layer:
--   INV-02: only a verified professional may insert a bid.
--   INV-03: a professional cannot hold two accepted bids on overlapping shifts.

create table public.bids (
  id              uuid primary key default gen_random_uuid(),
  shift_id        uuid not null references public.shifts (id) on delete cascade,
  professional_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  status          bid_status not null default 'pending',
  submitted_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint bids_one_per_professional_per_shift unique (shift_id, professional_id)
);

create index bids_shift_id_idx on public.bids (shift_id);
create index bids_professional_id_idx on public.bids (professional_id);

-- INV-02: reject any bid insert for a professional whose is_verified is not true.
-- Enforced here as a trigger so it holds regardless of insert path (RLS policy
-- below is the second layer for client inserts).
create or replace function public.enforce_bid_verified_professional()
returns trigger
language plpgsql
as $$
declare
  v_is_verified boolean;
begin
  select is_verified into v_is_verified
  from public.professional_profiles
  where user_id = new.professional_id;

  if coalesce(v_is_verified, false) = false then
    raise exception 'An unverified professional cannot bid on a shift (INV-02)';
  end if;

  return new;
end;
$$;

create trigger bids_enforce_verified
  before insert on public.bids
  for each row execute function public.enforce_bid_verified_professional();

-- INV-03: before a bid becomes 'accepted', reject it if the same professional
-- already holds an 'accepted' bid on a shift whose time window overlaps this one.
create or replace function public.enforce_no_overlapping_accepted_bid()
returns trigger
language plpgsql
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_conflicts integer;
begin
  if new.status <> 'accepted' then
    return new;
  end if;

  select start_time, end_time into v_start, v_end
  from public.shifts
  where id = new.shift_id;

  select count(*) into v_conflicts
  from public.bids b
  join public.shifts s on s.id = b.shift_id
  where b.professional_id = new.professional_id
    and b.status = 'accepted'
    and b.id <> new.id
    and s.start_time < v_end
    and s.end_time   > v_start;

  if v_conflicts > 0 then
    raise exception 'Professional already holds an accepted bid on an overlapping shift (INV-03)';
  end if;

  return new;
end;
$$;

create trigger bids_enforce_no_overlap
  before update on public.bids
  for each row execute function public.enforce_no_overlapping_accepted_bid();

alter table public.bids enable row level security;

-- Read: a professional sees their own bids; a facility sees bids on its own
-- shifts; admins see all.
create policy bids_select_scoped
  on public.bids for select
  to authenticated
  using (
    professional_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.shifts s
      where s.id = bids.shift_id and s.facility_id = auth.uid()
    )
  );

-- Insert: a professional inserts their own bid, always as 'pending'. The verified
-- check is the trigger above (INV-02, second layer).
create policy bids_insert_own
  on public.bids for insert
  to authenticated
  with check (professional_id = auth.uid() and status = 'pending');

-- No client UPDATE policy: bid status changes (accept/reject/cancel) are made by
-- Edge Functions running with service_role. The INV-03 trigger fires regardless.

-- ---------------------------------------------------------------------------
-- Shared "is party to a shift" helpers, used by RLS on shift_confirmations,
-- transactions, and ratings. SECURITY DEFINER so they read bids/shifts without
-- being re-gated by those tables' own RLS policies.
-- ---------------------------------------------------------------------------

create or replace function public.is_shift_facility(p_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shifts s
    where s.id = p_shift_id and s.facility_id = auth.uid()
  );
$$;

create or replace function public.is_accepted_shift_professional(p_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bids b
    where b.shift_id = p_shift_id
      and b.professional_id = auth.uid()
      and b.status = 'accepted'
  );
$$;

-- Now that bids exist, let a professional read any shift they have bid on
-- (so an accepted professional can still see their shift once it leaves 'open').
create policy shifts_select_own_bids
  on public.shifts for select
  to authenticated
  using (
    exists (
      select 1 from public.bids b
      where b.shift_id = shifts.id and b.professional_id = auth.uid()
    )
  );
