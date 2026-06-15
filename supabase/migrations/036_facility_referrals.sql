-- 036_facility_referrals.sql
-- Spec 13 (Waitlist Referrals): turn supply-side waitlist signups into warm
-- demand-side leads. After a professional joins the waitlist they nominate clinics
-- they know that use locums; each nomination is a lead with an insider contact and
-- the professional's relationship to the facility. Nominating also genuinely raises
-- the professional's priority — the waitlist position rewards nominators (an honest
-- "move up the line", not a hardcoded bump).
--
-- Builds on the existing public.waitlist table (migration 030); referee_email links a
-- nomination back to the nominator's waitlist signup.

-- ---------------------------------------------------------------------------
-- facility_referrals: the warm-lead store.
-- ---------------------------------------------------------------------------
create table public.facility_referrals (
  id            uuid primary key default gen_random_uuid(),
  referee_email text not null,                      -- the nominating professional
  facility_name text not null,
  city          text not null,
  facility_type text,
  contact_name  text,
  contact_info  text,
  relationship  text,
  status        text not null default 'pending'
                check (status in ('pending', 'contacted', 'signed_up', 'not_interested')),
  created_at    timestamptz not null default now()
);

create index facility_referrals_referee_idx on public.facility_referrals (lower(referee_email));
create index facility_referrals_status_idx on public.facility_referrals (status);

alter table public.facility_referrals enable row level security;

-- Admins read all leads and manage their status. Inserts run through the
-- submit_facility_referral SECURITY DEFINER function (which validates), so no anon
-- INSERT policy is needed — keeping the table write path single and controlled.
create policy facility_referrals_select_admin
  on public.facility_referrals for select
  to authenticated
  using ((select public.is_admin()));

create policy facility_referrals_update_admin
  on public.facility_referrals for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- waitlist_position(email): the nominator's honest rank. Everyone is ranked by how
-- many facilities they've nominated (desc), then signup time (asc) — so nominating
-- genuinely moves you up relative to people who haven't. Public (anon) read; returns
-- only a rank integer, never any row/PII.
-- ---------------------------------------------------------------------------
create or replace function public.waitlist_position(p_email text)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  with ranked as (
    select w.id,
           lower(w.email) as email_lc,
           row_number() over (
             order by (
               select count(*) from public.facility_referrals fr
               where lower(fr.referee_email) = lower(w.email)
             ) desc,
             w.created_at asc
           ) as pos
    from public.waitlist w
  )
  select pos::int from ranked where email_lc = lower(trim(p_email));
$$;

revoke all on function public.waitlist_position(text) from public;
grant execute on function public.waitlist_position(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_facility_referral(...): the single insert path for a nomination. Validates
-- the nominator is actually on the waitlist and that the required fields are present,
-- inserts the lead, and returns the nominator's NEW position so the UI can show the
-- real movement.
-- ---------------------------------------------------------------------------
create or replace function public.submit_facility_referral(
  p_referee_email text,
  p_facility_name text,
  p_city          text,
  p_facility_type text default null,
  p_contact_name  text default null,
  p_contact_info  text default null,
  p_relationship  text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_referee_email));
begin
  if not exists (select 1 from public.waitlist where lower(email) = v_email) then
    raise exception 'Join the waitlist before nominating a facility';
  end if;
  if coalesce(trim(p_facility_name), '') = '' or coalesce(trim(p_city), '') = '' then
    raise exception 'Facility name and city are required';
  end if;

  insert into public.facility_referrals
    (referee_email, facility_name, city, facility_type, contact_name, contact_info, relationship)
  values (
    v_email,
    trim(p_facility_name),
    trim(p_city),
    nullif(trim(coalesce(p_facility_type, '')), ''),
    nullif(trim(coalesce(p_contact_name, '')), ''),
    nullif(trim(coalesce(p_contact_info, '')), ''),
    nullif(trim(coalesce(p_relationship, '')), '')
  );

  return public.waitlist_position(v_email);
end;
$$;

revoke all on function public.submit_facility_referral(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_facility_referral(text, text, text, text, text, text, text) to anon, authenticated;
