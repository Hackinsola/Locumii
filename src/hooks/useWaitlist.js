import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Pre-launch waitlist signup. Inserts into public.waitlist, which RLS lets anonymous
// (signed-out) visitors insert into. A duplicate email hits the unique index (Postgres
// error 23505) and is treated as success — the visitor is already on the list.
export function useWaitlist() {
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState(null);

  async function join({ email, fullName, role }) {
    setStatus('submitting');
    setError(null);

    const { error: insertError } = await supabase.from('waitlist').insert({
      email: email.trim().toLowerCase(),
      full_name: fullName?.trim() || null,
      role: role || null,
    });

    if (insertError && insertError.code !== '23505') {
      setError(insertError.message ?? 'Something went wrong. Please try again.');
      setStatus('error');
      return false;
    }

    setStatus('success');
    return true;
  }

  return { join, status, error };
}
