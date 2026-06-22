-- 038_facility_description.sql
-- Adds an optional free-text description to facility_profiles, collected in the
-- "Set Up Your Clinic" onboarding and shown on the clinic profile. Additive and
-- nullable; the existing facility_profiles_update_own policy already covers it and
-- the protected-columns guard (is_verified, avg_rating) is unaffected.

alter table public.facility_profiles
  add column if not exists description text;

comment on column public.facility_profiles.description is
  'Optional clinic description (specialties, patient volume, etc.) shown to professionals.';
