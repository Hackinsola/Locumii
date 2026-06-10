-- 032_optimize_rls_initplan.sql
-- Performance-only remediation of the Supabase advisor `auth_rls_initplan` (0003)
-- and `multiple_permissive_policies` (0006) findings. No access semantics change —
-- every policy keeps the exact same logic; we only change HOW it is evaluated.
--
-- 1. auth_rls_initplan: a bare auth.uid() / public.is_admin() in a policy is
--    re-evaluated for every candidate row. Wrapping it in a scalar subquery
--    `(select auth.uid())` lets the planner hoist it to a one-time InitPlan, so it
--    runs once per query instead of once per row. Row-dependent helpers that take a
--    column argument (private.is_shift_facility(shift_id), has_bid_on_shift(id),
--    is_accepted_shift_professional(shift_id)) are left as-is — they genuinely vary
--    per row and were not flagged.
--
-- 2. multiple_permissive_policies: `shifts` had two SELECT policies for the
--    authenticated role (shifts_select_open + shifts_select_own_bids), so both ran on
--    every shift query. They are merged into one OR'd policy. The cross-table check
--    still goes through the SECURITY DEFINER helper private.has_bid_on_shift (which
--    bypasses RLS), so the recursion fix from migration 020 is preserved.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users for select
  to authenticated
  using ((select auth.uid()) = id or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- professional_profiles
-- ---------------------------------------------------------------------------
drop policy if exists professional_profiles_insert_own on public.professional_profiles;
create policy professional_profiles_insert_own
  on public.professional_profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists professional_profiles_update_own on public.professional_profiles;
create policy professional_profiles_update_own
  on public.professional_profiles for update
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- facility_profiles
-- ---------------------------------------------------------------------------
drop policy if exists facility_profiles_insert_own on public.facility_profiles;
create policy facility_profiles_insert_own
  on public.facility_profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists facility_profiles_update_own on public.facility_profiles;
create policy facility_profiles_update_own
  on public.facility_profiles for update
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- credentials
-- ---------------------------------------------------------------------------
drop policy if exists credentials_select_own on public.credentials;
create policy credentials_select_own
  on public.credentials for select
  to authenticated
  using (professional_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists credentials_insert_own on public.credentials;
create policy credentials_insert_own
  on public.credentials for insert
  to authenticated
  with check (professional_id = (select auth.uid()) and status = 'pending');

-- ---------------------------------------------------------------------------
-- shifts — merge the two SELECT policies into one (also fixes multiple_permissive).
-- ---------------------------------------------------------------------------
drop policy if exists shifts_select_open on public.shifts;
drop policy if exists shifts_select_own_bids on public.shifts;
create policy shifts_select_visible
  on public.shifts for select
  to authenticated
  using (
    status = 'open'
    or facility_id = (select auth.uid())
    or (select public.is_admin())
    or private.has_bid_on_shift(id)
  );

drop policy if exists shifts_update_own on public.shifts;
create policy shifts_update_own
  on public.shifts for update
  to authenticated
  using (facility_id = (select auth.uid()) or (select public.is_admin()))
  with check (facility_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- bids
-- ---------------------------------------------------------------------------
drop policy if exists bids_insert_own on public.bids;
create policy bids_insert_own
  on public.bids for insert
  to authenticated
  with check (professional_id = (select auth.uid()) and status = 'pending');

drop policy if exists bids_select_scoped on public.bids;
create policy bids_select_scoped
  on public.bids for select
  to authenticated
  using (
    professional_id = (select auth.uid())
    or (select public.is_admin())
    or private.is_shift_facility(shift_id)
  );

-- ---------------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------------
drop policy if exists ratings_insert_party on public.ratings;
create policy ratings_insert_party
  on public.ratings for insert
  to authenticated
  with check (
    rater_user_id = (select auth.uid())
    and (private.is_shift_facility(shift_id) or private.is_accepted_shift_professional(shift_id))
    and exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.status = 'completed'
    )
  );

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
