-- 031_tighten_waitlist_insert_check.sql
-- Harden the public waitlist INSERT policy. 030 created it with WITH CHECK (true),
-- which the security linter flags as overly permissive. Replace it with a bounded
-- email-shape check so the public, anon-writable endpoint can't be used to write
-- arbitrary junk (defense in depth beyond the client-side form validation).

drop policy waitlist_insert_anyone on public.waitlist;

create policy waitlist_insert_anyone
  on public.waitlist for insert
  to anon, authenticated
  with check (
    email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and char_length(email) <= 254
    and char_length(coalesce(full_name, '')) <= 120
  );
