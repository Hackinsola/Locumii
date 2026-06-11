-- 034_waitlist_count.sql
-- Public, privacy-preserving waitlist size for the landing page's social proof.
-- The waitlist table's RLS lets only admins read rows (waitlist_select_admin), so a
-- public count needs a SECURITY DEFINER function. It returns ONLY the aggregate
-- count — never a row, email or name — so no PII is ever exposed. Callable by anon
-- (the signed-out landing) and authenticated.
--
-- The remaining "authenticated/anon can execute SECURITY DEFINER" advisor note on
-- this function is expected and intentional, like accept_bid / check_in_shift: it is
-- a deliberately public, read-only aggregate with no row access.
create or replace function public.waitlist_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from public.waitlist;
$$;

revoke all on function public.waitlist_count() from public;
grant execute on function public.waitlist_count() to anon, authenticated;
