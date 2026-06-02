-- 013_security_and_index_hardening.sql
-- Remediates Supabase database-linter (advisor) findings raised after the initial
-- schema was applied. This is a follow-up migration; the original files 002-012
-- are left untouched (they are already applied).
--
-- 1. function_search_path_mutable (SECURITY): pin search_path on every function.
-- 2. anon/authenticated_security_definer_function_executable (SECURITY): move the
--    two SECURITY DEFINER RLS helpers into a non-API `private` schema so they are
--    no longer exposed as PostgREST RPC endpoints. RLS policies reference them by
--    OID and keep working after the move.
-- 3. unindexed_foreign_keys (PERFORMANCE): add covering indexes for two FKs.

-- ---------------------------------------------------------------------------
-- 2. Move SECURITY DEFINER helpers out of the exposed `public` schema.
-- ---------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

alter function public.is_shift_facility(uuid) set schema private;
alter function public.is_accepted_shift_professional(uuid) set schema private;

-- guard_shift_confirmation_columns resolves the helper names at runtime (plpgsql
-- late binding), so it must be repointed to the new `private` schema.
create or replace function public.guard_shift_confirmation_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.professional_confirmed_at is not null
       and not private.is_accepted_shift_professional(new.shift_id) then
      raise exception 'Only the accepted professional may set professional_confirmed_at';
    end if;
    if new.facility_confirmed_at is not null
       and not private.is_shift_facility(new.shift_id) then
      raise exception 'Only the facility may set facility_confirmed_at';
    end if;
    return new;
  end if;

  if new.professional_confirmed_at is distinct from old.professional_confirmed_at then
    if old.professional_confirmed_at is not null then
      raise exception 'professional_confirmed_at cannot be changed once set';
    end if;
    if not private.is_accepted_shift_professional(new.shift_id) then
      raise exception 'Only the accepted professional may set professional_confirmed_at';
    end if;
  end if;

  if new.facility_confirmed_at is distinct from old.facility_confirmed_at then
    if old.facility_confirmed_at is not null then
      raise exception 'facility_confirmed_at cannot be changed once set';
    end if;
    if not private.is_shift_facility(new.shift_id) then
      raise exception 'Only the facility may set facility_confirmed_at';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Pin search_path on the remaining (SECURITY INVOKER) functions.
-- ---------------------------------------------------------------------------
alter function public.is_admin() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.guard_professional_protected_columns() set search_path = public;
alter function public.guard_facility_protected_columns() set search_path = public;
alter function public.enforce_shift_status_transition() set search_path = public;
alter function public.enforce_bid_verified_professional() set search_path = public;
alter function public.enforce_no_overlapping_accepted_bid() set search_path = public;
alter function public.enforce_released_transaction_immutable() set search_path = public;
alter function public.guard_notification_update() set search_path = public;

-- ---------------------------------------------------------------------------
-- 3. Covering indexes for previously unindexed foreign keys.
-- ---------------------------------------------------------------------------
create index credentials_reviewed_by_idx on public.credentials (reviewed_by);
create index ratings_rater_user_id_idx on public.ratings (rater_user_id);
