-- 020_fix_shifts_bids_rls_recursion.sql
-- Fixes "infinite recursion detected in policy for relation shifts".
--
-- shifts.shifts_select_own_bids had an inline `exists (select ... from bids ...)`
-- and bids.bids_select_scoped had an inline `exists (select ... from shifts ...)`.
-- Each subquery re-triggers the other table's RLS, so evaluating either policy
-- recurses. (It didn't show up in SQL tests because those run as a superuser that
-- bypasses RLS — only a real authenticated request hits it.)
--
-- Fix: do the cross-table checks through SECURITY DEFINER helpers in the `private`
-- schema, which bypass RLS and break the cycle. is_shift_facility already exists;
-- add has_bid_on_shift for the shifts side.

create or replace function private.has_bid_on_shift(p_shift_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bids b
    where b.shift_id = p_shift_id and b.professional_id = auth.uid()
  );
$$;

-- shifts: a professional can read a shift they have bid on (no inline bids subquery)
drop policy if exists shifts_select_own_bids on public.shifts;
create policy shifts_select_own_bids
  on public.shifts for select
  to authenticated
  using (private.has_bid_on_shift(id));

-- bids: facility reads bids on its own shifts via the SECURITY DEFINER helper
drop policy if exists bids_select_scoped on public.bids;
create policy bids_select_scoped
  on public.bids for select
  to authenticated
  using (
    professional_id = auth.uid()
    or public.is_admin()
    or private.is_shift_facility(shift_id)
  );
