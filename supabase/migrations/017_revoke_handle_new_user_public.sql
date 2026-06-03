-- 017_revoke_handle_new_user_public.sql
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, and anon/authenticated
-- inherit through PUBLIC — so revoking from those roles individually (016) wasn't
-- enough. Revoke from PUBLIC. handle_new_user runs only as an auth.users trigger,
-- which fires regardless of any caller's EXECUTE grant, so nothing breaks.

revoke all on function public.handle_new_user() from public;
