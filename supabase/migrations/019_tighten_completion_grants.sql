-- 019_tighten_completion_grants.sql
-- Same default-privilege cleanup as 016/017, for the 018 functions:
--   - check_in_shift: anon has no business calling it (authenticated keeps it; the
--     function authorizes internally via auth.uid()).
--   - complete_shift_on_dual_confirm runs only as a shift_confirmations trigger, so
--     no role needs EXECUTE on it.
-- The remaining "authenticated can execute" advisor warnings on accept_bid and
-- check_in_shift are expected — they are deliberate action RPCs.

revoke all on function public.check_in_shift(uuid) from anon;
revoke all on function public.complete_shift_on_dual_confirm() from public, anon, authenticated;
