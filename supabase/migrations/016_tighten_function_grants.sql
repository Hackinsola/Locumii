-- 016_tighten_function_grants.sql
-- Advisor remediation. Supabase's default privileges grant EXECUTE on new public
-- functions to anon + authenticated, which made two SECURITY DEFINER functions
-- callable by anon over RPC. Tighten that:
--   - handle_new_user is only ever invoked as an auth.users trigger (triggers run
--     regardless of the caller's EXECUTE grant), so no role needs EXECUTE on it.
--   - accept_bid must stay callable by authenticated (it authorizes internally via
--     auth.uid()), but anon has no business calling it.
-- The remaining "authenticated can execute accept_bid" advisor warning is expected
-- and intentional: accept_bid is a deliberate action RPC.

revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.accept_bid(uuid) from anon;
