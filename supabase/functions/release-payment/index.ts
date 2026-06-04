// release-payment
// Disburses the net amount (gross − 10% platform commission) to the accepted
// professional's linked bank account once BOTH parties have confirmed the shift.
// Invoked by the confirming client, but fully authoritative server-side: it
// re-reads the confirmations + shift status and pays at most once per shift
// (transactions.shift_id is unique — the escrow row is the lock). The professional
// bears the fee, so the facility's earlier gross payment funds this net transfer.
// The Paystack secret + transfer logic live only here (INV-01).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const COMMISSION_RATE = 0.1; // 10% — keep in sync with src/constants/fees.js
const RECIPIENT_URL = 'https://api.paystack.co/transferrecipient';
const TRANSFER_URL = 'https://api.paystack.co/transfer';
const PAYSTACK_TIMEOUT_MS = 10000;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function paystackFetch(url: string, secret: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAYSTACK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!paystackSecret || !supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Payments are not configured on the server.' }, 500);
  }

  // DEV-ONLY escape hatch. When PAYMENTS_SIMULATE=true the real Paystack transfer
  // is skipped and the payout is just recorded as released — useful before the
  // Paystack business is activated for Transfers. NEVER set this in production:
  // it marks money as paid without moving any.
  const simulatePayouts = Deno.env.get('PAYMENTS_SIMULATE') === 'true';

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const shiftId = payload.shiftId;
  if (typeof shiftId !== 'string' || shiftId.length === 0) {
    return json({ error: 'Missing shift id.' }, 400);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'Not authenticated.' }, 401);
  }
  const callerId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: shift } = await admin
    .from('shifts')
    .select('id, facility_id, status, pay_rate_naira')
    .eq('id', shiftId)
    .maybeSingle();
  if (!shift) {
    return json({ error: 'Shift not found.' }, 404);
  }

  const { data: acceptedBid } = await admin
    .from('bids')
    .select('professional_id')
    .eq('shift_id', shiftId)
    .eq('status', 'accepted')
    .maybeSingle();

  // Only a party to the shift may trigger the payout.
  const isFacility = shift.facility_id === callerId;
  const isProfessional = acceptedBid?.professional_id === callerId;
  if (!isFacility && !isProfessional) {
    return json({ error: 'You are not a party to this shift.' }, 403);
  }

  const { data: confirmation } = await admin
    .from('shift_confirmations')
    .select('professional_confirmed_at, facility_confirmed_at')
    .eq('shift_id', shiftId)
    .maybeSingle();

  // Not ready yet (only one side confirmed, or the shift isn't completed). No-op.
  if (!confirmation?.professional_confirmed_at || !confirmation?.facility_confirmed_at) {
    return json({ ready: false }, 200);
  }
  if (shift.status !== 'completed') {
    return json({ ready: false }, 200);
  }
  if (!acceptedBid?.professional_id) {
    return json({ error: 'No accepted professional for this shift.' }, 409);
  }

  // Idempotency: one transaction row per shift.
  const { data: existing } = await admin
    .from('transactions')
    .select('id, status')
    .eq('shift_id', shiftId)
    .maybeSingle();
  if (existing?.status === 'released') {
    return json({ success: true, alreadyReleased: true }, 200);
  }
  if (existing?.status === 'escrow') {
    return json({ processing: true }, 200);
  }

  // Professional must have a bank account linked before we can pay them.
  const { data: prof } = await admin
    .from('professional_profiles')
    .select('bank_account_number, bank_code')
    .eq('user_id', acceptedBid.professional_id)
    .maybeSingle();
  if (!prof?.bank_account_number || !prof?.bank_code) {
    return json(
      { error: 'The professional has not linked a bank account yet. Payout will run once they do.', needsBank: true },
      409
    );
  }

  const grossKobo = Number(shift.pay_rate_naira);
  const commissionKobo = Math.round(grossKobo * COMMISSION_RATE);
  const netKobo = grossKobo - commissionKobo;

  async function markFailed() {
    await admin
      .from('transactions')
      .update({ status: 'failed' })
      .eq('shift_id', shiftId)
      .neq('status', 'released');
  }

  // Take the lock by inserting the escrow row (unless retrying a 'failed' one).
  if (!existing) {
    const { error: insertError } = await admin.from('transactions').insert({
      shift_id: shiftId,
      gross_amount_naira: grossKobo,
      commission_naira: commissionKobo,
      net_amount_naira: netKobo,
      status: 'escrow',
    });
    if (insertError) {
      // Unique violation → another caller is processing this payout.
      return json({ processing: true }, 200);
    }
  }

  // Simulated payout (dev): record as released without touching Paystack.
  if (simulatePayouts) {
    const { error: simError } = await admin
      .from('transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        paystack_transfer_code: `SIMULATED-${Date.now()}`,
      })
      .eq('shift_id', shiftId);
    if (simError) {
      return json({ error: 'Simulated payout could not be recorded.' }, 500);
    }
    return json({ success: true, released: true, simulated: true }, 200);
  }

  let recipient: { status?: boolean; message?: string; data?: { recipient_code?: string } };
  try {
    recipient = await paystackFetch(RECIPIENT_URL, paystackSecret, {
      method: 'POST',
      body: JSON.stringify({
        type: 'nuban',
        name: 'Locumii professional',
        account_number: prof.bank_account_number,
        bank_code: prof.bank_code,
        currency: 'NGN',
      }),
    });
  } catch (_error) {
    await markFailed();
    return json({ error: 'Could not reach Paystack to set up the payout. Try again.' }, 502);
  }
  if (!recipient?.status || !recipient.data?.recipient_code) {
    console.error('release-payment: recipient creation failed', JSON.stringify(recipient));
    await markFailed();
    return json({ error: recipient?.message ?? 'Could not create the transfer recipient.' }, 502);
  }

  let transfer: { status?: boolean; message?: string; data?: { status?: string; transfer_code?: string } };
  try {
    transfer = await paystackFetch(TRANSFER_URL, paystackSecret, {
      method: 'POST',
      body: JSON.stringify({
        source: 'balance',
        amount: netKobo,
        recipient: recipient.data.recipient_code,
        reason: 'Locumii shift payment',
      }),
    });
  } catch (_error) {
    await markFailed();
    return json({ error: 'Could not initiate the transfer. Try again.' }, 502);
  }
  if (!transfer?.status) {
    console.error('release-payment: transfer initiation failed', JSON.stringify(transfer));
    await markFailed();
    return json({ error: transfer?.message ?? 'Paystack declined the transfer.' }, 502);
  }
  // If the account requires OTP for transfers, the money has NOT moved yet — leave
  // the row in escrow so it isn't recorded as paid. The platform must disable
  // transfer OTP (Paystack dashboard) for fully automated payouts.
  if (transfer.data?.status === 'otp') {
    return json(
      { error: 'Transfer needs OTP approval. Disable transfer OTP in Paystack to automate payouts.', needsOtp: true },
      409
    );
  }

  const { error: updateError } = await admin
    .from('transactions')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      paystack_transfer_code: transfer.data?.transfer_code ?? null,
    })
    .eq('shift_id', shiftId);
  if (updateError) {
    return json({ error: 'Transfer sent but recording it failed. Contact support.' }, 500);
  }

  return json({ success: true, released: true }, 200);
});
