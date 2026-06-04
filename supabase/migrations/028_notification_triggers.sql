-- 028_notification_triggers.sql
-- The notification engine. AFTER triggers on the real tables fire on every Spec 10
-- event, regardless of which path caused the row change (a client write, the
-- accept_bid RPC, or the release-payment Edge Function). Each trigger:
--   1. inserts the in-app notification row (pure SQL — always succeeds, drives the
--      realtime bell). The trigger functions are SECURITY DEFINER and owned by the
--      migration role, so they bypass the notifications no-INSERT RLS.
--   2. looks up the recipient's phone and calls private.dispatch_sms (best-effort,
--      asynchronous SMS — see 027; it never blocks or rolls back the action).
--
-- Functions live in `private` so they are not RPC-exposed (project convention, 020).
-- Times are rendered in Africa/Lagos (WAT) since recipients are Nigerian.

-- ---------------------------------------------------------------------------
-- credential_approved: a professional becomes verified (admin flips is_verified).
-- ---------------------------------------------------------------------------
create or replace function private.notify_professional_verified()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_phone text;
  v_body  text;
begin
  if new.is_verified is not true or old.is_verified is true then
    return new;
  end if;

  v_body := 'Your Locumii credentials have been verified. You can now browse and bid on shifts. locumii.ng';

  insert into public.notifications (user_id, type, title, body, link)
  values (new.user_id, 'credential_approved', 'Credentials verified', v_body, '/professional/shifts');

  select phone into v_phone from public.users where id = new.user_id;
  perform private.dispatch_sms(v_phone, v_body);

  return new;
end;
$$;

create trigger professional_profiles_notify_verified
  after update of is_verified on public.professional_profiles
  for each row execute function private.notify_professional_verified();

-- ---------------------------------------------------------------------------
-- credential_rejected: an individual document is rejected. (No reason column on
-- credentials, so the message names the doc type only — see plan divergence.)
-- ---------------------------------------------------------------------------
create or replace function private.notify_credential_rejected()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_phone text;
  v_doc   text;
  v_body  text;
begin
  if new.status <> 'rejected' or old.status = 'rejected' then
    return new;
  end if;

  v_doc := initcap(replace(new.doc_type::text, '_', ' '));
  v_body := 'Your ' || v_doc || ' on Locumii was not approved. Please re-upload. locumii.ng';

  insert into public.notifications (user_id, type, title, body, link)
  values (new.professional_id, 'credential_rejected', 'Document not approved', v_body, '/professional/documents');

  select phone into v_phone from public.users where id = new.professional_id;
  perform private.dispatch_sms(v_phone, v_body);

  return new;
end;
$$;

create trigger credentials_notify_rejected
  after update of status on public.credentials
  for each row execute function private.notify_credential_rejected();

-- ---------------------------------------------------------------------------
-- bid_accepted / bid_declined: accept_bid accepts one bid and cancels the rest.
-- ---------------------------------------------------------------------------
create or replace function private.notify_bid_status_change()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_phone         text;
  v_facility_name text;
  v_role          text;
  v_start         timestamptz;
  v_type          text;
  v_title         text;
  v_body          text;
  v_link          text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'accepted' then
    select s.role_required, s.start_time, f.facility_name
      into v_role, v_start, v_facility_name
    from public.shifts s
    join public.facility_profiles f on f.user_id = s.facility_id
    where s.id = new.shift_id;

    v_type  := 'bid_accepted';
    v_title := 'Bid accepted';
    v_body  := 'Your bid was accepted! ' || v_facility_name || ' confirmed your shift on '
      || to_char(v_start at time zone 'Africa/Lagos', 'FMDD Mon') || ' at '
      || to_char(v_start at time zone 'Africa/Lagos', 'FMHH12:MI am') || '. locumii.ng';
    v_link  := '/professional/my-shifts';

  elsif new.status = 'cancelled' and old.status = 'pending' then
    -- The auto-decline step of accept_bid (no professional-withdraw flow exists).
    select s.role_required, s.start_time into v_role, v_start
    from public.shifts s where s.id = new.shift_id;

    v_type  := 'bid_declined';
    v_title := 'Bid not selected';
    v_body  := 'Your bid for ' || v_role || ' on '
      || to_char(v_start at time zone 'Africa/Lagos', 'FMDD Mon')
      || ' was not selected. Keep browsing shifts at locumii.ng';
    v_link  := '/professional/shifts';

  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (new.professional_id, v_type, v_title, v_body, v_link);

  select phone into v_phone from public.users where id = new.professional_id;
  perform private.dispatch_sms(v_phone, v_body);

  return new;
end;
$$;

create trigger bids_notify_status_change
  after update of status on public.bids
  for each row execute function private.notify_bid_status_change();

-- ---------------------------------------------------------------------------
-- facility_verified: an admin verifies a facility (is_verified flip).
-- ---------------------------------------------------------------------------
create or replace function private.notify_facility_verified()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_phone text;
  v_body  text;
begin
  if new.is_verified is not true or old.is_verified is true then
    return new;
  end if;

  v_body := 'Your facility ' || new.facility_name
    || ' has been verified on Locumii. You can now post shifts. locumii.ng';

  insert into public.notifications (user_id, type, title, body, link)
  values (new.user_id, 'facility_verified', 'Facility verified', v_body, '/facility/post-shift');

  -- Prefer the facility contact number; fall back to the account phone.
  select coalesce(new.contact_phone, u.phone) into v_phone
  from public.users u where u.id = new.user_id;
  perform private.dispatch_sms(v_phone, v_body);

  return new;
end;
$$;

create trigger facility_profiles_notify_verified
  after update of is_verified on public.facility_profiles
  for each row execute function private.notify_facility_verified();

-- ---------------------------------------------------------------------------
-- payment_released: a shift's escrow transaction is released to the professional.
-- ---------------------------------------------------------------------------
create or replace function private.notify_payment_released()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_prof_id       uuid;
  v_phone         text;
  v_facility_name text;
  v_body          text;
begin
  if new.status <> 'released' or old.status = 'released' then
    return new;
  end if;

  select b.professional_id, f.facility_name
    into v_prof_id, v_facility_name
  from public.bids b
  join public.shifts s on s.id = b.shift_id
  join public.facility_profiles f on f.user_id = s.facility_id
  where b.shift_id = new.shift_id and b.status = 'accepted';

  if v_prof_id is null then
    return new;
  end if;

  -- net_amount_naira is stored in kobo (see 006/009); divide by 100 for display.
  v_body := '₦'
    || to_char(new.net_amount_naira / 100.0, 'FM999G999G990D00')
    || ' has been sent to your bank account for your shift at '
    || v_facility_name || '. locumii.ng';

  insert into public.notifications (user_id, type, title, body, link)
  values (v_prof_id, 'payment_released', 'Payment sent', v_body, '/professional/earnings');

  select phone into v_phone from public.users where id = v_prof_id;
  perform private.dispatch_sms(v_phone, v_body);

  return new;
end;
$$;

create trigger transactions_notify_released
  after update of status on public.transactions
  for each row execute function private.notify_payment_released();

-- None of these are callable directly; they only run as triggers.
revoke all on function private.notify_professional_verified() from public, anon, authenticated;
revoke all on function private.notify_credential_rejected() from public, anon, authenticated;
revoke all on function private.notify_bid_status_change() from public, anon, authenticated;
revoke all on function private.notify_facility_verified() from public, anon, authenticated;
revoke all on function private.notify_payment_released() from public, anon, authenticated;
