-- 040_email_notifications.sql
-- Switch outbound notifications from SMS (Termii, never activated) to EMAIL for
-- now (user decision 2026-07-12): Termii was never configured, while every user
-- already has an email (users.email is not null). The in-app notification feed is
-- unchanged and remains the source of truth.
--
-- Mirrors the SMS design one-for-one (026/027/035):
--   email_log              <- sms_log            (audit of every send attempt)
--   private.dispatch_email <- private.dispatch_sms (pg_net -> send-email function)
--   five notify_* trigger functions now call dispatch_email; the dispatch_sms
--   CALLS are removed but the function itself is kept for a later SMS re-enable.
--
-- ONE-TIME SETUP (same Vault secrets the SMS path needed; dispatch is a silent
-- no-op until both exist — in-app notifications still work):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
-- The send-email Edge Function additionally needs the RESEND_API_KEY secret
-- (and optional EMAIL_FROM) set in the Edge Functions secrets.

-- ---------------------------------------------------------------------------
-- email_log — audit trail of every Resend attempt. Written only by the
-- send-email Edge Function (service_role); never read or written by the client.
-- ---------------------------------------------------------------------------
create table public.email_log (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  subject           text not null,
  message           text not null,
  status            text not null default 'sent' check (status in ('sent', 'failed')),
  resend_message_id text,
  error_message     text,
  created_at        timestamptz not null default now()
);

create index email_log_created_at_idx on public.email_log (created_at desc);

-- RLS on with no policies: service_role bypasses RLS; every other role is denied.
alter table public.email_log enable row level security;

-- ---------------------------------------------------------------------------
-- private.dispatch_email — the single bridge from a database trigger to the
-- send-email Edge Function. Same contract as dispatch_sms: asynchronous
-- (net.http_post queues and returns), best-effort, never blocks or rolls back
-- the originating action.
-- ---------------------------------------------------------------------------
create or replace function private.dispatch_email(p_email text, p_subject text, p_message text)
returns void
language plpgsql
security definer
set search_path = private, public, extensions, vault
as $$
declare
  v_url text;
  v_key text;
begin
  if p_email is null or length(trim(p_email)) = 0 then
    return;
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key';

  -- Email not configured yet (no Vault secrets) -> skip silently. The in-app
  -- feed does not depend on this.
  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('email', p_email, 'subject', p_subject, 'message', p_message)
  );
end;
$$;

revoke all on function private.dispatch_email(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The five notification trigger functions (bodies from 035), with the phone
-- lookup + dispatch_sms swapped for an email lookup + dispatch_email. The
-- existing triggers reference these functions by name, so replacing the bodies
-- is sufficient.
-- ---------------------------------------------------------------------------
create or replace function private.notify_professional_verified()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_email text;
  v_body  text;
begin
  if new.is_verified is not true or old.is_verified is true then
    return new;
  end if;

  v_body := 'Your Locumii credentials have been verified. You can now browse and bid on shifts. locumii.com';

  insert into public.notifications (user_id, type, title, body, link)
  values (new.user_id, 'credential_approved', 'Credentials verified', v_body, '/professional/shifts');

  select email into v_email from public.users where id = new.user_id;
  perform private.dispatch_email(v_email, 'Credentials verified', v_body);

  return new;
end;
$$;

create or replace function private.notify_credential_rejected()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_email text;
  v_doc   text;
  v_body  text;
begin
  if new.status <> 'rejected' or old.status = 'rejected' then
    return new;
  end if;

  v_doc := initcap(replace(new.doc_type::text, '_', ' '));
  v_body := 'Your ' || v_doc || ' on Locumii was not approved. Please re-upload. locumii.com';

  insert into public.notifications (user_id, type, title, body, link)
  values (new.professional_id, 'credential_rejected', 'Document not approved', v_body, '/professional/documents');

  select email into v_email from public.users where id = new.professional_id;
  perform private.dispatch_email(v_email, 'Document not approved', v_body);

  return new;
end;
$$;

create or replace function private.notify_bid_status_change()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_email         text;
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
      || to_char(v_start at time zone 'Africa/Lagos', 'FMHH12:MI am') || '. locumii.com';
    v_link  := '/professional/my-shifts';

  elsif new.status = 'cancelled' and old.status = 'pending' then
    -- The auto-decline step of accept_bid (no professional-withdraw flow exists).
    select s.role_required, s.start_time into v_role, v_start
    from public.shifts s where s.id = new.shift_id;

    v_type  := 'bid_declined';
    v_title := 'Bid not selected';
    v_body  := 'Your bid for ' || v_role || ' on '
      || to_char(v_start at time zone 'Africa/Lagos', 'FMDD Mon')
      || ' was not selected. Keep browsing shifts at locumii.com';
    v_link  := '/professional/shifts';

  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (new.professional_id, v_type, v_title, v_body, v_link);

  select email into v_email from public.users where id = new.professional_id;
  perform private.dispatch_email(v_email, v_title, v_body);

  return new;
end;
$$;

create or replace function private.notify_facility_verified()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_email text;
  v_body  text;
begin
  if new.is_verified is not true or old.is_verified is true then
    return new;
  end if;

  v_body := 'Your facility ' || new.facility_name
    || ' has been verified on Locumii. You can now post shifts. locumii.com';

  insert into public.notifications (user_id, type, title, body, link)
  values (new.user_id, 'facility_verified', 'Facility verified', v_body, '/facility/post-shift');

  select email into v_email from public.users where id = new.user_id;
  perform private.dispatch_email(v_email, 'Facility verified', v_body);

  return new;
end;
$$;

create or replace function private.notify_payment_released()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_prof_id       uuid;
  v_email         text;
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
    || v_facility_name || '. locumii.com';

  insert into public.notifications (user_id, type, title, body, link)
  values (v_prof_id, 'payment_released', 'Payment sent', v_body, '/professional/earnings');

  select email into v_email from public.users where id = v_prof_id;
  perform private.dispatch_email(v_email, 'Payment sent', v_body);

  return new;
end;
$$;
