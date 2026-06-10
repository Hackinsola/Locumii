-- 033_rate_limit.sql
-- A minimal, dependency-free rate limiter for Edge Functions. Edge Functions are
-- stateless across isolates, so an in-memory counter can't actually bound abuse —
-- this keeps the counter in Postgres so the limit holds no matter which isolate (or
-- cold start) serves the request.
--
-- First consumer: paystack-proxy's `resolve` action, which turns an account number +
-- bank code into the account holder's name. Without a limit, a signed-in user could
-- enumerate account-holder names by brute-forcing account numbers (and burn Paystack
-- quota). The function below records one row per allowed call and refuses once the
-- per-identifier window is full.

create table public.rate_limit_events (
  id         uuid primary key default gen_random_uuid(),
  identifier text not null,        -- usually the caller's auth uid (JWT sub)
  action     text not null,        -- logical bucket, e.g. 'paystack_resolve'
  created_at timestamptz not null default now()
);

-- Window lookups are always (action, identifier, recent time).
create index rate_limit_events_lookup_idx
  on public.rate_limit_events (action, identifier, created_at desc);

-- RLS on with no policies: only service_role (bypasses RLS) and the SECURITY DEFINER
-- function below ever touch this table; every other role is denied. Same hardening
-- pattern as sms_log (026).
alter table public.rate_limit_events enable row level security;

-- check_rate_limit: atomically prune the caller's expired hits, count what's left in
-- the window, and either record a new hit and allow (true) or refuse (false). Atomic
-- because it runs as one statement-set inside the function's own transaction, so two
-- concurrent calls can't both read an under-limit count and both insert.
create or replace function public.check_rate_limit(
  p_identifier      text,
  p_action          text,
  p_max             integer,
  p_window_seconds  integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Drop this caller's hits that have aged out of the window (keeps the table small).
  delete from public.rate_limit_events
   where action = p_action
     and identifier = p_identifier
     and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
  from public.rate_limit_events
  where action = p_action
    and identifier = p_identifier
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;  -- over the limit; caller should respond 429
  end if;

  insert into public.rate_limit_events (identifier, action)
  values (p_identifier, p_action);
  return true;
end;
$$;

-- Only the Edge Functions (service_role) may call this; it is not a user-facing RPC.
revoke all on function public.check_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer)
  to service_role;
