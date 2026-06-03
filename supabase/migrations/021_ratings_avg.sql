-- 021_ratings_avg.sql
-- Maintains professional_profiles.avg_rating / facility_profiles.avg_rating from
-- the ratings table. The profile guard triggers block non-admins from changing
-- avg_rating, and a SECURITY DEFINER trigger still runs as the rater (auth.uid()
-- is the caller), so it would be blocked too. Solution: the avg trigger sets a
-- transaction-local flag (app.is_system_update) that the guards accept for the
-- avg_rating column only — is_verified stays admin-only.

-- Replace the guards to honour the system-update flag for avg_rating.
create or replace function public.guard_professional_protected_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.is_verified is distinct from old.is_verified then
      raise exception 'is_verified can only be changed by an admin';
    end if;
    if new.avg_rating is distinct from old.avg_rating
       and coalesce(current_setting('app.is_system_update', true), '') <> 'on' then
      raise exception 'avg_rating is system-maintained and cannot be set directly';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_facility_protected_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.is_verified is distinct from old.is_verified then
      raise exception 'is_verified can only be changed by an admin';
    end if;
    if new.avg_rating is distinct from old.avg_rating
       and coalesce(current_setting('app.is_system_update', true), '') <> 'on' then
      raise exception 'avg_rating is system-maintained and cannot be set directly';
    end if;
  end if;
  return new;
end;
$$;

-- Recompute the ratee's average (rounded to 1 dp) and write it to whichever
-- profile table holds that user_id. The flag lets the guard allow the write.
create or replace function public.update_ratee_avg_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(2, 1);
begin
  select round(avg(score)::numeric, 1) into v_avg
  from public.ratings where ratee_user_id = new.ratee_user_id;

  perform set_config('app.is_system_update', 'on', true);
  update public.professional_profiles set avg_rating = v_avg where user_id = new.ratee_user_id;
  update public.facility_profiles set avg_rating = v_avg where user_id = new.ratee_user_id;
  perform set_config('app.is_system_update', 'off', true);

  return new;
end;
$$;

create trigger ratings_update_avg
  after insert on public.ratings
  for each row execute function public.update_ratee_avg_rating();

revoke all on function public.update_ratee_avg_rating() from public, anon, authenticated;
