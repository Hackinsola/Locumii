// send-shift-reminder
// Cron-triggered every 15 minutes. Finds filled shifts starting in ~2 hours and
// texts both parties a reminder. Unlike the event reminders, there is no DB row
// change to trigger from, so this function drives send-sms directly and passes the
// notif* fields for the professional so an in-app notification is also created.
// Runs entirely server-side with the service-role key.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WINDOW_START_MIN = 105; // shift starts between now+105m and now+120m → ~2h out
const WINDOW_END_MIN = 120;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

// WAT (UTC+1) clock time, e.g. "2:30 PM".
function formatTimeWAT(iso: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  }).format(new Date(iso));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Reminders are not configured on the server.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  async function sendSMS(body: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.error('send-shift-reminder: send-sms call failed', error);
    }
  }

  const now = new Date();
  const { data: shifts, error } = await admin
    .from('shifts')
    .select(
      'id, start_time, role_required, ' +
        'facility_profiles ( facility_name, contact_phone ), ' +
        'bids ( professional_id, status, professional_profiles ( full_name, specialty ) )'
    )
    .eq('status', 'filled')
    .gte('start_time', addMinutes(now, WINDOW_START_MIN).toISOString())
    .lte('start_time', addMinutes(now, WINDOW_END_MIN).toISOString());

  if (error) {
    console.error('send-shift-reminder: query failed', error);
    return json({ error: 'Could not load shifts.' }, 500);
  }

  const rows = shifts ?? [];

  // Resolve professional phone numbers (users.phone) for the accepted bids.
  const acceptedByShift = new Map<string, { professionalId: string; fullName: string; specialty: string }>();
  for (const shift of rows) {
    const accepted = (shift.bids ?? []).find((b: { status: string }) => b.status === 'accepted');
    if (accepted) {
      acceptedByShift.set(shift.id, {
        professionalId: accepted.professional_id,
        fullName: accepted.professional_profiles?.full_name ?? 'Your professional',
        specialty: accepted.professional_profiles?.specialty ?? '',
      });
    }
  }

  const professionalIds = [...acceptedByShift.values()].map((a) => a.professionalId);
  const phoneById = new Map<string, string>();
  if (professionalIds.length > 0) {
    const { data: users } = await admin.from('users').select('id, phone').in('id', professionalIds);
    for (const u of users ?? []) {
      if (u.phone) {
        phoneById.set(u.id, u.phone);
      }
    }
  }

  let sent = 0;
  for (const shift of rows) {
    const accepted = acceptedByShift.get(shift.id);
    if (!accepted) {
      continue;
    }
    const facility = shift.facility_profiles;
    const clock = formatTimeWAT(shift.start_time);

    // Professional — also creates an in-app notification.
    const profPhone = phoneById.get(accepted.professionalId);
    if (profPhone) {
      await sendSMS({
        phone: profPhone,
        message: `Reminder: Your shift at ${facility?.facility_name ?? 'the facility'} starts in 2 hours (${clock}). Good luck!`,
        userId: accepted.professionalId,
        notifType: 'shift_reminder',
        notifTitle: 'Shift reminder',
        notifLink: '/professional/my-shifts',
      });
      sent += 1;
    }

    // Facility contact — SMS only.
    if (facility?.contact_phone) {
      await sendSMS({
        phone: facility.contact_phone,
        message: `Reminder: ${accepted.fullName}${accepted.specialty ? ` (${accepted.specialty})` : ''} arrives in 2 hours for their shift.`,
      });
      sent += 1;
    }
  }

  return json({ ok: true, shifts: rows.length, messages: sent }, 200);
});
