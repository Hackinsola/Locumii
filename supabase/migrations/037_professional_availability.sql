-- 037_professional_availability.sql
-- Adds locum availability + contact fields to professional_profiles, powering the
-- Availability screen (master toggle + weekly schedule) and the availability calendar
-- on the profile, plus the phone collected during onboarding. All additive with safe
-- defaults so existing rows keep working. No new RLS: the existing
-- professional_profiles_update_own policy already lets a professional edit these on
-- their own row, and the protected-columns guard (is_verified, avg_rating) is unaffected.

alter table public.professional_profiles
  add column if not exists available_for_locum boolean not null default true,
  add column if not exists availability jsonb not null default '{}'::jsonb,
  add column if not exists phone text;

comment on column public.professional_profiles.available_for_locum is
  'Master toggle — when false the professional marks themselves unavailable for locum work.';
comment on column public.professional_profiles.availability is
  'Weekly schedule as { mon: { on: bool, start: "HH:MM", end: "HH:MM" }, ... }. Empty object = not set yet.';
comment on column public.professional_profiles.phone is
  'Contact phone (Nigerian format), collected during onboarding.';
