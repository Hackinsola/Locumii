// paystack-proxy
// Server-side proxy for the two read-only Paystack endpoints the bank-linking UI
// needs: the supported bank list and account-name resolution. Kept server-side so
// the Paystack secret key never reaches the client (INV-01). Requires a valid JWT.
//
// `resolve` is rate-limited per caller: it turns an account number into the holder's
// name, so without a limit a signed-in user could enumerate account-holder names by
// brute-forcing account numbers. The counter lives in Postgres (check_rate_limit,
// migration 033) so the limit holds across stateless Edge Function isolates.
//
// Body: { action: 'banks' } | { action: 'resolve', accountNumber, bankCode }
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_BANKS_URL = 'https://api.paystack.co/bank?currency=NGN&country=nigeria';
const PAYSTACK_RESOLVE_URL = 'https://api.paystack.co/bank/resolve';
const PAYSTACK_TIMEOUT_MS = 10000;

// resolve is the enumeration-sensitive action: allow a generous burst for normal
// bank-linking (a user resolves 1–3 times) but refuse sustained brute-forcing.
const RESOLVE_MAX_PER_WINDOW = 15;
const RESOLVE_WINDOW_SECONDS = 60;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Reads the `sub` (user id) claim from a JWT payload without verifying the signature
// — the platform (verify_jwt) already verified it. Used only to key the rate limit.
function subFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded));
    return typeof decoded?.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}

async function paystackGet(url: string, secret: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!paystackSecret) {
    return json({ error: 'Payments are not configured on the server.' }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const action = payload.action;

  if (action === 'banks') {
    let result: { status?: boolean; data?: Array<{ name: string; code: string }> };
    try {
      result = await paystackGet(PAYSTACK_BANKS_URL, paystackSecret);
    } catch (_error) {
      return json({ error: 'Could not load the bank list. Try again.' }, 502);
    }
    if (!result?.status || !Array.isArray(result.data)) {
      return json({ error: 'Could not load the bank list.' }, 502);
    }
    // Return only what the UI needs (name + code), not the full Paystack payload.
    const banks = result.data.map((bank) => ({ name: bank.name, code: bank.code }));
    return json({ banks }, 200);
  }

  if (action === 'resolve') {
    const accountNumber = payload.accountNumber;
    const bankCode = payload.bankCode;
    if (typeof accountNumber !== 'string' || !/^\d{10}$/.test(accountNumber)) {
      return json({ error: 'Enter a valid 10-digit account number.' }, 400);
    }
    if (typeof bankCode !== 'string' || bankCode.length === 0) {
      return json({ error: 'Select a bank.' }, 400);
    }

    // Rate-limit per caller before hitting Paystack, to block account-name
    // enumeration. Key on the JWT sub (the user id); fall back to the forwarded IP
    // for the unusual case of a token without a sub claim.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceRoleKey) {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const identifier =
        subFromJwt(token) ??
        (req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown');
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data: allowed, error: limitError } = await admin.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_action: 'paystack_resolve',
        p_max: RESOLVE_MAX_PER_WINDOW,
        p_window_seconds: RESOLVE_WINDOW_SECONDS,
      });
      // Fail closed on an explicit over-limit; fail open on an unexpected limiter
      // error so a limiter outage never blocks legitimate bank linking.
      if (!limitError && allowed === false) {
        return json({ error: 'Too many attempts. Please wait a minute and try again.' }, 429);
      }
    }
    const url = `${PAYSTACK_RESOLVE_URL}?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
    let result: { status?: boolean; message?: string; data?: { account_name?: string } };
    try {
      result = await paystackGet(url, paystackSecret);
    } catch (_error) {
      return json({ error: 'Could not reach Paystack to verify the account. Try again.' }, 502);
    }
    if (!result?.status || !result.data?.account_name) {
      return json({ error: result?.message ?? 'Could not resolve that account.' }, 422);
    }
    return json({ accountName: result.data.account_name }, 200);
  }

  return json({ error: 'Unknown action.' }, 400);
});
