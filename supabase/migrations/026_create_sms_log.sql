-- 026_create_sms_log.sql
-- Audit trail of every Termii SMS attempt (success or failure). Written only by the
-- send-sms Edge Function (service_role); never read or written by the client.

create table public.sms_log (
  id                uuid primary key default gen_random_uuid(),
  phone             text not null,
  message           text not null,
  status            text not null default 'sent' check (status in ('sent', 'failed')),
  termii_message_id text,
  error_message     text,
  created_at        timestamptz not null default now()
);

create index sms_log_created_at_idx on public.sms_log (created_at desc);

-- RLS on with no policies: service_role (the Edge Function) bypasses RLS, so it can
-- still insert; every other role is denied. This is stricter than leaving RLS off,
-- which would expose the table to any authenticated client.
alter table public.sms_log enable row level security;
