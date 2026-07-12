-- 042_avatars_restrict_listing.sql
-- Advisor remediation (public_bucket_allows_listing): 041's broad SELECT policy
-- let any authenticated client LIST every file in the public avatars bucket.
-- Public buckets serve object URLs without any SELECT policy, and the only API
-- read the app needs is the owner's own file (client upsert requires
-- INSERT + UPDATE + SELECT on the row being replaced). Scope SELECT to the
-- owner's folder.

drop policy if exists avatars_select_authenticated on storage.objects;

create policy avatars_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
