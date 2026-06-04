-- 022_add_facility_contact_phone.sql
-- Adds the facility contact person's phone number to facility_profiles
-- (Feature-specs/05-facility-profile.md). Nullable so existing rows are not
-- broken; the app collects it during onboarding and profile edit. The owner sets
-- it via the existing facility_profiles_update_own policy (contact_phone is not a
-- guard-protected column, unlike is_verified / avg_rating).
alter table public.facility_profiles
  add column contact_phone text;
