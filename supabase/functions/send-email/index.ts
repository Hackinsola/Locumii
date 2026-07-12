// send-email
// The single transactional email sender. Delivers one message through Resend and
// records the attempt in email_log. Called ONLY server-to-server — from the
// database (private.dispatch_email via pg_net, on notification events) and from
// send-shift-reminder. It is NEVER called from the browser: the caller must
// present the service-role key as the bearer token, so a normal user JWT is
// rejected. This keeps RESEND_API_KEY and the email path entirely off the client
// (INV-05 spirit). Mirrors send-sms one-for-one.
//
// Notifications: the event triggers already insert the in-app notification row,
// so they call this WITHOUT the notif* fields. send-shift-reminder has no DB row
// to trigger from, so it passes userId/notifType/notifTitle and this function
// inserts the notification itself — the only path that does.
//
// Secrets: RESEND_API_KEY (required), EMAIL_FROM (optional; defaults to Resend's
// shared onboarding sender, which only delivers to the Resend account owner's
// address until a domain is verified), EMAIL_REPLY_TO (optional; defaults to the
// support address so replies to automated notifications reach a human).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_URL = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 10000;

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

interface EmailPayload {
  email?: string;
  subject?: string;
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
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'Locumii <onboarding@resend.dev>';
  const replyTo = Deno.env.get('EMAIL_REPLY_TO') ?? 'support@locumii.com';
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    return json({ error: 'Email is not configured on the server.' }, 500);
  }

  // Server-only. Two accepted credentials: (a) the platform-injected service key
  // verbatim — on newer projects this is the sb_secret_... format, NOT a JWT, so
  // it can't be checked by claim (this is how send-shift-reminder calls us);
  // (b) any project JWT carrying the service_role claim — the legacy key stored
  // in Vault for the pg_net trigger calls. A user/anon token matches neither.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token !== serviceRoleKey && roleFromJwt(token) !== 'service_role') {
    return json({ error: 'Forbidden.' }, 403);
  }

  let payload: EmailPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const message = typeof payload.message === 'string' ? payload.message : '';
  if (!email || !subject || !message) {
    return json({ error: 'email, subject and message are required.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Send via Resend.
  let resendData: { id?: string; message?: string } = {};
  let ok = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
    try {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({ from, to: [email], subject, text: message, reply_to: replyTo }),
        signal: controller.signal,
      });
      resendData = await response.json().catch(() => ({}));
      // Resend returns 200 with an id on success.
      ok = response.ok && Boolean(resendData?.id);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    resendData = { message: error instanceof Error ? error.message : 'Network error.' };
    ok = false;
  }

  // 2. Log every attempt (success or failure).
  await admin.from('email_log').insert({
    email,
    subject,
    message,
    status: ok ? 'sent' : 'failed',
    resend_message_id: resendData?.id ?? null,
    error_message: ok ? null : (resendData?.message ?? 'Unknown error.'),
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
    console.error('send-email: Resend delivery failed', JSON.stringify(resendData));
    return json({ sent: false, error: resendData?.message ?? 'Email delivery failed.' }, 502);
  }
  return json({ sent: true, messageId: resendData?.id ?? null }, 200);
});
