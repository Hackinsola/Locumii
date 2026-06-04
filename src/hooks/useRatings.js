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

const RATINGS_PAGE_SIZE = 20;

// Ratings a given user has received (ratee), newest first, one page. Ratings are
// publicly readable (migration 010), so this works for any authenticated viewer.
export function useUserRatings(userId) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRatings = useCallback(async () => {
    try {
      if (!userId) {
        throw new Error('No user was specified.');
      }
      const { data, error: fetchError } = await supabase
        .from('ratings')
        .select('id, score, comment, created_at')
        .eq('ratee_user_id', userId)
        .order('created_at', { ascending: false })
        .range(0, RATINGS_PAGE_SIZE - 1);
      if (fetchError) {
        throw fetchError;
      }
      setRatings(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRatings();
  }, [fetchRatings]);

  return { ratings, loading, error, refetch: fetchRatings };
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

// Normalises a PostgREST embed to a single row (to-one embeds come back as an
// object; some shapes arrive as a one-element array).
function one(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

// Completed shifts the current user was a party to but has NOT yet rated — the feed
// behind the "you have shifts to rate" prompt. Role-aware: a professional rates the
// facility they worked for; a facility rates the professional it hired. Each item is
// { shift, rateeUserId, rateeName, raterRole }. The same shift stays rateable inline
// (ShiftDetail / ManageBids); this only surfaces it proactively.
export function usePendingRatings() {
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPending = useCallback(async () => {
    try {
      if (!userId || (role !== 'professional' && role !== 'facility')) {
        setPending([]);
        return;
      }

      // Shifts this user has already rated, to exclude them.
      const { data: rated, error: ratedError } = await supabase
        .from('ratings')
        .select('shift_id')
        .eq('rater_user_id', userId);
      if (ratedError) {
        throw ratedError;
      }
      const ratedShiftIds = new Set((rated ?? []).map((row) => row.shift_id));

      let items = [];

      if (role === 'professional') {
        // Accepted bids on completed shifts → rate the facility.
        const { data, error: fetchError } = await supabase
          .from('bids')
          .select(
            'shift_id, shifts!inner ( id, role_required, start_time, end_time, status, facility_id, facility_profiles ( facility_name ) )'
          )
          .eq('professional_id', userId)
          .eq('status', 'accepted')
          .eq('shifts.status', 'completed');
        if (fetchError) {
          throw fetchError;
        }
        items = (data ?? []).map((row) => {
          const shift = one(row.shifts);
          const facility = one(shift?.facility_profiles);
          return {
            shift,
            rateeUserId: shift?.facility_id,
            rateeName: facility?.facility_name ?? 'the facility',
            raterRole: 'professional',
          };
        });
      } else {
        // Completed shifts this facility posted → rate the accepted professional.
        const { data, error: fetchError } = await supabase
          .from('shifts')
          .select(
            'id, role_required, start_time, end_time, status, bids!inner ( professional_id, status, professional_profiles ( full_name ) )'
          )
          .eq('facility_id', userId)
          .eq('status', 'completed')
          .eq('bids.status', 'accepted');
        if (fetchError) {
          throw fetchError;
        }
        items = (data ?? []).map((shift) => {
          const acceptedBid = one(shift.bids);
          const professional = one(acceptedBid?.professional_profiles);
          return {
            shift,
            rateeUserId: acceptedBid?.professional_id,
            rateeName: professional?.full_name ?? 'the professional',
            raterRole: 'facility',
          };
        });
      }

      setPending(
        items.filter((item) => item.shift?.id && item.rateeUserId && !ratedShiftIds.has(item.shift.id))
      );
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPending();
  }, [fetchPending]);

  return { pending, loading, error, refetch: fetchPending };
}
