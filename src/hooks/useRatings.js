import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// The rating the current user has already left on a shift (null if none yet).
export function useShiftRating(shiftId) {
  const userId = useAuthStore((state) => state.userId);
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRating = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('ratings')
        .select('id, score, comment')
        .eq('shift_id', shiftId)
        .eq('rater_user_id', userId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      setRating(data);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [shiftId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRating();
  }, [fetchRating]);

  return { rating, loading, error, refetch: fetchRating };
}

// Submits a 1–5 rating of the counterparty for a completed shift. The DB enforces
// completed-only, party-only, and one-per-direction (migration 010); avg_rating is
// recomputed by a trigger (021).
export function useSubmitRating() {
  const raterId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitRating = useCallback(
    async ({ shiftId, rateeUserId, score, comment }) => {
      setLoading(true);
      setError(null);
      try {
        const { error: insertError } = await supabase.from('ratings').insert({
          shift_id: shiftId,
          rater_user_id: raterId,
          ratee_user_id: rateeUserId,
          score,
          comment: comment || null,
        });
        if (insertError) {
          throw insertError;
        }
        return { error: null };
      } catch (caught) {
        setError(caught);
        return { error: caught };
      } finally {
        setLoading(false);
      }
    },
    [raterId]
  );

  return { submitRating, loading, error };
}
