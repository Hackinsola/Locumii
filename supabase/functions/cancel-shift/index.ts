// cancel-shift
// Cancels an UNFILLED (open) shift the facility posted and refunds what they paid,
// minus the Paystack charges on the original collection (decision 2026-06). The
// refund + cancel run server-side because the Paystack secret key must never reach
// the client (INV-01). A filled/in-progress/completed shift cannot be cancelled
// here (no professional-side handling yet).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/';
const PAYSTACK_REFUND_URL = 'https://api.paystack.co/refund';
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

  // Identify the caller from their JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'Not authenticated.' }, 401);
  }
  const callerId = userData.user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: shift, error: shiftError } = await adminClient
    .from('shifts')
    .select('id, facility_id, status, paystack_reference')
    .eq('id', shiftId)
    .maybeSingle();
  if (shiftError) {
    return json({ error: 'Could not load the shift.' }, 500);
  }
  if (!shift) {
    return json({ error: 'Shift not found.' }, 404);
  }
  if (shift.facility_id !== callerId) {
    return json({ error: 'You can only cancel your own shifts.' }, 403);
  }
  if (shift.status !== 'open') {
    return json({ error: 'Only an open (unfilled) shift can be cancelled.' }, 409);
  }

  // Refund the original collection minus Paystack's fees, when there is one.
  if (shift.paystack_reference) {
    let verify: { status?: boolean; data?: { status?: string; amount?: number; fees?: number } };
    try {
      verify = await paystackFetch(
        PAYSTACK_VERIFY_URL + encodeURIComponent(shift.paystack_reference),
        paystackSecret
      );
    } catch (_error) {
      return json({ error: 'Could not reach Paystack to start the refund. Try again.' }, 502);
    }
    if (!verify?.status || verify?.data?.status !== 'success') {
      return json({ error: 'Original payment could not be verified for refund.' }, 502);
    }
    const amount = Number(verify.data?.amount ?? 0);
    const fees = Number(verify.data?.fees ?? 0);
    const refundAmount = Math.max(0, amount - fees);

    let refund: { status?: boolean; message?: string };
    try {
      refund = await paystackFetch(PAYSTACK_REFUND_URL, paystackSecret, {
        method: 'POST',
        body: JSON.stringify({ transaction: shift.paystack_reference, amount: refundAmount }),
      });
    } catch (_error) {
      return json({ error: 'Could not start the refund with Paystack. Try again.' }, 502);
    }
    if (!refund?.status) {
      // Do NOT cancel if the refund did not register — leave the shift open so the
      // facility keeps a claim on it and can retry / contact support.
      return json({ error: refund?.message ?? 'Paystack declined the refund.' }, 502);
    }
  }

  const { error: updateError } = await adminClient
    .from('shifts')
    .update({ status: 'cancelled' })
    .eq('id', shiftId)
    .eq('status', 'open');
  if (updateError) {
    return json(
      { error: 'Refund issued but the shift could not be cancelled. Contact support.' },
      500
    );
  }

  return json({ success: true }, 200);
});
