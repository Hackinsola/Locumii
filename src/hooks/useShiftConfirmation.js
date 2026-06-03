import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Reads the dual-confirmation row for a shift (RLS: the shift's facility, the
// accepted professional, and admins can read it). Null until either side confirms.
export function useShiftConfirmation(shiftId) {
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfirmation = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('shift_confirmations')
        .select('shift_id, professional_confirmed_at, facility_confirmed_at')
        .eq('shift_id', shiftId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      setConfirmation(data);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfirmation();
  }, [fetchConfirmation]);

  return { confirmation, loading, error, refetch: fetchConfirmation };
}

// The accepted professional checks in (shift filled -> in_progress) via RPC.
export function useCheckInShift() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkIn = useCallback(async (shiftId) => {
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('check_in_shift', { p_shift_id: shiftId });
      if (rpcError) {
        throw rpcError;
      }
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkIn, loading, error };
}

// Confirms completion for the current user's side. The column is chosen by role;
// the guard trigger independently enforces that each party writes only its own.
// When both sides are set, a DB trigger moves the shift to completed.
export function useConfirmCompletion() {
  const role = useAuthStore((state) => state.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const confirm = useCallback(
    async (shiftId) => {
      setLoading(true);
      setError(null);
      try {
        const column = role === 'facility' ? 'facility_confirmed_at' : 'professional_confirmed_at';
        const { error: upsertError } = await supabase
          .from('shift_confirmations')
          .upsert({ shift_id: shiftId, [column]: new Date().toISOString() }, { onConflict: 'shift_id' });
        if (upsertError) {
          throw upsertError;
        }
        return { error: null };
      } catch (caught) {
        setError(caught);
        return { error: caught };
      } finally {
        setLoading(false);
      }
    },
    [role]
  );

  return { confirm, loading, error };
}
