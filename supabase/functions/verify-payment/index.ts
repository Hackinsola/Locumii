// verify-payment
// Called by the facility PostShift flow after the Paystack inline popup reports a
// successful charge. It verifies the charge SERVER-SIDE with Paystack (the client
// callback is never trusted — code-standards), confirms the charged amount equals
// the shift's gross pay rate, then creates the shift. Creating the shift only here
// (with the verified reference) binds the amount paid to the pay rate posted.
//
// The professional bears the 10% platform fee (decision 2026-06): the facility is
// charged the gross pay rate; the fee is deducted later at payout. So the expected
// charge equals payRateKobo (gross), not gross + fee.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/';
const PAYSTACK_TIMEOUT_MS = 10000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!paystackSecret || !supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Payments are not configured on the server.' }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const reference = payload.reference;
  const shift = payload.shift as Record<string, unknown> | undefined;
  // DEV-ONLY: the client may ask to post without a charge. Honoured only while the
  // PAYMENTS_SIMULATE Edge secret is 'true' (same switch as release-payment's
  // simulated payouts). NEVER set in production: shifts would post unpaid.
  const simulateRequested = payload.simulate === true;
  const simulateEnabled = Deno.env.get('PAYMENTS_SIMULATE') === 'true';
  if (simulateRequested && !simulateEnabled) {
    // Tell the client to fall back to the real Paystack popup.
    return json({ success: false, simulationDisabled: true }, 200);
  }
  if (typeof reference !== 'string' || reference.length === 0) {
    return json({ error: 'Missing payment reference.' }, 400);
  }
  if (simulateRequested && !reference.startsWith('SIMULATED-')) {
    return json({ error: 'Simulated posts must use a SIMULATED- reference.' }, 400);
  }
  if (!shift || typeof shift !== 'object') {
    return json({ error: 'Missing shift details.' }, 400);
  }

  const roleRequired = shift.roleRequired;
  const startTime = shift.startTime;
  const endTime = shift.endTime;
  const payRateKobo = shift.payRateKobo;
  const requirements = shift.requirements;
  const city = shift.city;
  if (typeof roleRequired !== 'string' || roleRequired.trim().length === 0) {
    return json({ error: 'Invalid role.' }, 400);
  }
  if (typeof startTime !== 'string' || typeof endTime !== 'string') {
    return json({ error: 'Invalid shift times.' }, 400);
  }
  if (typeof payRateKobo !== 'number' || !Number.isInteger(payRateKobo) || payRateKobo <= 0) {
    return json({ error: 'Invalid pay rate.' }, 400);
  }
  if (typeof city !== 'string' || city.trim().length === 0) {
    return json({ error: 'Invalid city.' }, 400);
  }
  if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
    return json({ error: 'End time must be after start time.' }, 400);
  }

  // Identify the caller from their JWT; only a facility may post a shift.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'Not authenticated.' }, 401);
  }
  const user = userData.user;
  if ((user.app_metadata as Record<string, unknown> | undefined)?.role !== 'facility') {
    return json({ error: 'Only facilities can post shifts.' }, 403);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Idempotency: if this reference already produced a shift, return it instead of
  // creating a duplicate (handles a double success callback).
  const { data: existing } = await adminClient
    .from('shifts')
    .select('id')
    .eq('paystack_reference', reference)
    .maybeSingle();
  if (existing) {
    return json({ success: true, shiftId: existing.id, duplicate: true }, 200);
  }

  // Verify the charge with Paystack (server-side; explicit timeout per
  // code-standards). Skipped entirely for a simulated post (dev flag above):
  // there is no charge to verify — the SIMULATED- reference is recorded as-is.
  if (!simulateRequested) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);
    let verify: { status?: boolean; data?: { status?: string; amount?: number } };
    try {
      const response = await fetch(PAYSTACK_VERIFY_URL + encodeURIComponent(reference), {
        headers: { Authorization: `Bearer ${paystackSecret}` },
        signal: controller.signal,
      });
      verify = await response.json();
    } catch (_error) {
      return json({ error: 'Could not verify the payment with Paystack. Please try again.' }, 502);
    } finally {
      clearTimeout(timeout);
    }

    if (!verify?.status || verify?.data?.status !== 'success') {
      return json({ error: 'Payment was not successful.' }, 402);
    }
    // The facility pays the gross pay rate (professional bears the fee), so the
    // verified Paystack amount must equal payRateKobo exactly.
    if (Number(verify.data?.amount) !== Number(payRateKobo)) {
      return json({ error: 'Paid amount does not match the shift pay rate.' }, 402);
    }
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('shifts')
    .insert({
      facility_id: user.id,
      role_required: roleRequired.trim(),
      start_time: startTime,
      end_time: endTime,
      pay_rate_naira: payRateKobo, // integer kobo, despite the _naira name
      requirements: typeof requirements === 'string' && requirements.trim().length > 0
        ? requirements.trim()
        : null,
      city,
      status: 'open',
      paystack_reference: reference,
    })
    .select('id')
    .single();
  if (insertError) {
    return json(
      { error: 'Payment verified, but the shift could not be created. Contact support.' },
      500
    );
  }

  return json({ success: true, shiftId: inserted.id, simulated: simulateRequested }, 200);
});
