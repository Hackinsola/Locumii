-- 027_sms_dispatch.sql
-- private.dispatch_sms(): the single bridge from a database trigger to the send-sms
-- Edge Function. The notification triggers (028) call this after they have already
-- inserted the in-app notification row, so SMS is best-effort: it must never block
-- or roll back the originating action (accepting a bid, verifying a credential, …).
-- pg_net's net.http_post is asynchronous (it queues the request and returns), so the
-- HTTP call happens outside the user's transaction and a Termii/network failure
-- cannot fail the action — the in-app notification is already committed regardless.
--
-- Lives in `private` (not public) so it is not exposed as a callable RPC, matching
-- the project's SECURITY DEFINER helper convention (see 020).
--
-- ONE-TIME SETUP (run manually; secrets, so not committed literally). dispatch_sms
-- reads the project URL + service-role key from Supabase Vault:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
-- Until both secrets exist, dispatch_sms is a no-op (in-app notifications still work).

create extension if not exists pg_net with schema extensions;

create or replace function private.dispatch_sms(p_phone text, p_message text)
returns void
language plpgsql
security definer
set search_path = private, public, extensions, vault
as $$
declare
  v_url text;
  v_key text;
begin
  -- No phone on file → in-app notification already created, just skip the SMS.
  if p_phone is null or length(trim(p_phone)) = 0 then
    return;
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key';

  -- SMS not configured yet (no Termii / vault secrets) → skip silently. The in-app
  -- feed is the source of truth and does not depend on this.
  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/send-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('phone', p_phone, 'message', p_message)
  );
end;
$$;

revoke all on function private.dispatch_sms(text, text) from public, anon, authenticated;
