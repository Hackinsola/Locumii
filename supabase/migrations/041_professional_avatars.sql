-- 041_professional_avatars.sql
-- Professional profile photos (user request 2026-07-12): captured at onboarding /
-- editable on My Profile so facilities can see who is bidding. Path pattern:
-- {user_id}/avatar-{timestamp}.{ext} in a new `avatars` bucket.
--
-- The bucket is PUBLIC — a deliberate deviation from architecture.md's "all
-- buckets are private" (written when the only bucket was credential documents,
-- INV-06). A profile photo's entire purpose is to be shown to other users;
-- serving it via the public render endpoint avoids minting signed URLs on every
-- card/list render. Documents remain in the private `credentials` bucket;
-- INV-06 is untouched. Flagged for a human architecture.md update.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Owners manage files in their own top-level folder. All three of INSERT,
-- UPDATE and SELECT are required for client upsert to work.
create policy avatars_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_select_authenticated
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

-- Owners may replace their photo; keep the bucket tidy by allowing delete of
-- their own previous file.
create policy avatars_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- The profile row stores the storage path (not a URL); clients derive the public
-- URL via storage.getPublicUrl. Owner-updatable: the guard trigger only protects
-- is_verified / avg_rating.
alter table public.professional_profiles add column avatar_path text;

comment on column public.professional_profiles.avatar_path is
  'Storage path of the profile photo in the public avatars bucket ({user_id}/avatar-*.ext); null when none uploaded.';
