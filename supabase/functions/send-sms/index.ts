// send-sms
// The single SMS sender. Delivers one transactional message through Termii and
// records the attempt in sms_log. Called ONLY server-to-server — from the database
// (private.dispatch_sms via pg_net, on notification events) and from
// send-shift-reminder. It is NEVER called from the browser: the caller must present
// the service-role key as the bearer token, so a normal user JWT is rejected. This
// keeps TERMII_API_KEY and the SMS path entirely off the client (INV-05 spirit).
//
// Notifications: the event triggers already insert the in-app notification row, so
// they call this WITHOUT the notif* fields. send-shift-reminder has no DB row to
// trigger from, so it passes userId/notifType/notifTitle and this function inserts
// the notification itself — the only path that does.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TERMII_URL = 'https://api.ng.termii.com/api/sms/send';
const TERMII_TIMEOUT_MS = 10000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Reads the `role` claim from a JWT's payload without verifying the signature — the
// platform (verify_jwt) already verified it, so this only needs to inspect the claim.
function roleFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded));
    return typeof decoded?.role === 'string' ? decoded.role : null;
  } catch {
    return null;
  }
}

interface SMSPayload {
  phone?: string;
  message?: string;
  userId?: string;
  notifType?: string;
  notifTitle?: string;
  notifLink?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const termiiApiKey = Deno.env.get('TERMII_API_KEY');
  const senderId = Deno.env.get('TERMII_SENDER_ID') ?? 'Locumii';
  if (!supabaseUrl || !serviceRoleKey || !termiiApiKey) {
    return json({ error: 'SMS is not configured on the server.' }, 500);
  }

  // Server-only: the caller's JWT must carry role 'service_role'. verify_jwt is on,
  // so the platform has already cryptographically verified this token was signed by
  // this project — a forged token is rejected before we run. A browser/user token
  // carries role 'authenticated'/'anon', so send-sms can never be called from the
  // client. (Checking the role claim rather than an exact key string keeps this
  // working across service-role key rotations.)
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (roleFromJwt(token) !== 'service_role') {
    return json({ error: 'Forbidden.' }, 403);
  }

  let payload: SMSPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message : '';
  if (!phone || !message) {
    return json({ error: 'phone and message are required.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Send via Termii.
  let termiiData: { message_id?: string; message?: string } = {};
  let ok = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TERMII_TIMEOUT_MS);
    try {
      const response = await fetch(TERMII_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          from: senderId,
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: termiiApiKey,
        }),
        signal: controller.signal,
      });
      termiiData = await response.json().catch(() => ({}));
      // Termii returns 200 with a message_id on success.
      ok = response.ok && Boolean(termiiData?.message_id);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    termiiData = { message: error instanceof Error ? error.message : 'Network error.' };
    ok = false;
  }

  // 2. Log every attempt (success or failure).
  await admin.from('sms_log').insert({
    phone,
    message,
    status: ok ? 'sent' : 'failed',
    termii_message_id: termiiData?.message_id ?? null,
    error_message: ok ? null : (termiiData?.message ?? 'Unknown error.'),
  });

  // 3. Reminder path only: no DB row triggered this, so create the notification here.
  if (payload.userId && payload.notifType && payload.notifTitle) {
    await admin.from('notifications').insert({
      user_id: payload.userId,
      type: payload.notifType,
      title: payload.notifTitle,
      body: message,
      link: payload.notifLink ?? null,
    });
  }

  if (!ok) {
    console.error('send-sms: Termii delivery failed', JSON.stringify(termiiData));
    return json({ sent: false, error: termiiData?.message ?? 'SMS delivery failed.' }, 502);
  }
  return json({ sent: true, messageId: termiiData?.message_id ?? null }, 200);
});
