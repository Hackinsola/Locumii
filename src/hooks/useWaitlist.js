import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

// Live waitlist size for the landing's social proof, via the privacy-preserving
// waitlist_count() RPC (returns only the aggregate — never any row/PII). Returns
// null until loaded so the caller can fall back to a qualitative line while the
// list is still tiny. Best-effort: any error just leaves it null.
export function useWaitlistCount() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let active = true;
    supabase.rpc('waitlist_count').then(({ data, error }) => {
      if (active && !error && typeof data === 'number') {
        setCount(data);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return count;
}

// Pre-launch waitlist signup. Inserts into public.waitlist, which RLS lets anonymous
// (signed-out) visitors insert into. A duplicate email hits the unique index (Postgres
// error 23505) and is treated as success — the visitor is already on the list.
export function useWaitlist() {
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(null);

  async function join({ email, fullName, role }) {
    setStatus('submitting');
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const { error: insertError } = await supabase.from('waitlist').insert({
      email: normalizedEmail,
      full_name: fullName?.trim() || null,
      role: role || null,
    });

    if (insertError && insertError.code !== '23505') {
      setError(insertError.message ?? 'Something went wrong. Please try again.');
      setStatus('error');
      return false;
    }

    // Count only a genuinely new row as a conversion — a duplicate email (23505)
    // means they already joined, so it isn't a fresh lead. `generate_lead` is GA4's
    // recommended event for a waitlist/lead-capture form.
    if (!insertError) {
      trackEvent('generate_lead', { method: 'waitlist', role: role || 'unspecified' });
    }

    // Their honest position in line (nominators rank higher — see migration 036).
    const { data: pos } = await supabase.rpc('waitlist_position', { p_email: normalizedEmail });
    if (typeof pos === 'number') {
      setPosition(pos);
    }

    setStatus('success');
    return true;
  }

  // Lets the nomination flow update the displayed position after a referral bumps it.
  return { join, status, error, position, setPosition };
}

// Submits a facility nomination (Spec 13). Returns the nominator's NEW waitlist
// position so the caller can show the real movement. Each call is one lead.
export function useFacilityReferral() {
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState(null);

  async function nominate({
    refereeEmail,
    facilityName,
    city,
    facilityType,
    contactName,
    contactInfo,
    relationship,
  }) {
    setStatus('submitting');
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_facility_referral', {
        p_referee_email: refereeEmail,
        p_facility_name: facilityName,
        p_city: city,
        p_facility_type: facilityType || null,
        p_contact_name: contactName || null,
        p_contact_info: contactInfo || null,
        p_relationship: relationship || null,
      });
      if (rpcError) {
        throw rpcError;
      }
      trackEvent('facility_referral', { city: city || 'unspecified' });
      setStatus('success');
      return { position: typeof data === 'number' ? data : null, error: null };
    } catch (caught) {
      setError(caught.message ?? 'Could not submit the facility. Please try again.');
      setStatus('error');
      return { position: null, error: caught };
    }
  }

  return { nominate, status, error };
}
