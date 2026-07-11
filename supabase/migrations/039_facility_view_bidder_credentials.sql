-- 039_facility_view_bidder_credentials.sql
-- Lets a facility view the approved credentials of professionals who currently
-- bid on its shifts. Implements project-overview.md ("Facility receives bids from
-- verified professionals and views each bidder's profile, credentials, and
-- ratings"), which the RLS from 005/012 never allowed.
--
-- Access rule, enforced at both layers:
--   - credentials table : a facility reads a row iff the row is 'approved' AND its
--     owner holds a 'pending' or 'accepted' bid on one of the facility's shifts.
--   - credentials bucket: same rule, resolved from the object path via its
--     credentials row, so the facility can mint a signed URL for the document.
-- The bucket stays private and documents are still reached only through signed
-- URLs (<= 15 min), so INV-06's "never publicly accessible" guarantee holds; this
-- migration widens who may request a signed URL from "admin only" to "admin or a
-- facility the professional has actively bid with".
--
-- ASSUMPTION: only 'approved' documents are facility-visible; pending/rejected
-- stay owner+admin-only — confirm with spec.
-- ASSUMPTION: visibility lasts while the bid is 'pending' or 'accepted'; cancelled
-- and not-selected bidders drop back out of view — confirm with spec.
--
-- Cross-table checks live in SECURITY DEFINER helpers in the non-exposed `private`
-- schema (same pattern as 020) so these policies do not re-enter bids/shifts RLS.

-- True iff p_professional_id currently has a live bid on a shift owned by the
-- calling facility.
create or replace function private.is_bidder_on_facility_shift(p_professional_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bids b
    join public.shifts s on s.id = b.shift_id
    where b.professional_id = p_professional_id
      and b.status in ('pending', 'accepted')
      and s.facility_id = auth.uid()
  );
$$;

-- Storage-side twin: maps an object path back to its credentials row and applies
-- the same rule (approved document, live bid on one of the caller's shifts).
create or replace function private.facility_can_view_credential_object(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.credentials c
    join public.bids b on b.professional_id = c.professional_id
    join public.shifts s on s.id = b.shift_id
    where c.storage_path = p_object_name
      and c.status = 'approved'
      and b.status in ('pending', 'accepted')
      and s.facility_id = auth.uid()
  );
$$;

-- The storage helper looks credentials up by path; give it an index.
create index credentials_storage_path_idx on public.credentials (storage_path);

-- credentials table: extend the single SELECT policy in place (kept merged, per
-- 032, to avoid multiple permissive policies).
drop policy if exists credentials_select_own on public.credentials;
create policy credentials_select_own
  on public.credentials for select
  to authenticated
  using (
    professional_id = (select auth.uid())
    or (select public.is_admin())
    or (status = 'approved' and private.is_bidder_on_facility_shift(professional_id))
  );

-- credentials bucket: extend the read policy with the facility arm.
drop policy if exists credentials_read_own_or_admin on storage.objects;
create policy credentials_read_own_or_admin
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'credentials'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
      or private.facility_can_view_credential_object(name)
    )
  );
