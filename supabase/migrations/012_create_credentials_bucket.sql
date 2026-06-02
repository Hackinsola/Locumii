-- 012_create_credentials_bucket.sql
-- Private Storage bucket for credential documents. INV-06: the bucket is private;
-- no public URL is ever generated. Access is via short-lived signed URLs created
-- on demand by an admin. Path pattern: {professional_id}/{doc_type}/{filename}.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'credentials',
  'credentials',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Professionals may upload into their own top-level folder only
-- (first path segment must equal their user id).
create policy credentials_upload_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Professionals may read their own files; admins may read any file in the bucket.
create policy credentials_read_own_or_admin
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'credentials'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Professionals may update/replace their own files (re-upload of a rejected doc).
create policy credentials_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'credentials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No DELETE policy and no public access: documents are retained for audit and
-- are never publicly reachable (INV-06).
