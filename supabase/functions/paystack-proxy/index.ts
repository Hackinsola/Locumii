// paystack-proxy
// Server-side proxy for the two read-only Paystack endpoints the bank-linking UI
// needs: the supported bank list and account-name resolution. Kept server-side so
// the Paystack secret key never reaches the client (INV-01). Requires a valid JWT.
//
// Body: { action: 'banks' } | { action: 'resolve', accountNumber, bankCode }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_BANKS_URL = 'https://api.paystack.co/bank?currency=NGN&country=nigeria';
const PAYSTACK_RESOLVE_URL = 'https://api.paystack.co/bank/resolve';
const PAYSTACK_TIMEOUT_MS = 10000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
