import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const SHIFT_SELECT =
  'id, facility_id, role_required, start_time, end_time, pay_rate_naira, requirements, city, status, facility_profiles ( facility_name, avg_rating )';
const PAGE_SIZE = 20;

// Shift creation now goes through the verify-payment Edge Function (see
// usePostPaidShift in hooks/usePayments.js), which only creates a shift after a
// Paystack charge is verified server-side. The old client-side useCreateShift was
// removed when payment-gating was added (Feature-specs/09-payments.md).

// Browses open shifts (RLS exposes status='open' to any authenticated user),
// filtered by city / role substring / date / minimum pay (kobo), paginated with a
// Load More cursor. hasMore is true while the last page came back full.
export function useOpenShifts({ city, role, date, minPayKobo }) {
  const [shifts, setShifts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(
    async (pageIndex, replace) => {
      try {
        let query = supabase.from('shifts').select(SHIFT_SELECT).eq('status', 'open');
        if (city) {
          query = query.eq('city', city);
        }
        if (role) {
          query = query.ilike('role_required', `%${role}%`);
        }
        if (minPayKobo) {
          query = query.gte('pay_rate_naira', minPayKobo);
        }
        if (date) {
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          query = query
            .gte('start_time', dayStart.toISOString())
            .lte('start_time', dayEnd.toISOString());
        }
        const from = pageIndex * PAGE_SIZE;
        const { data, error: fetchError } = await query
          .order('start_time', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (fetchError) {
          throw fetchError;
        }
        const rows = data ?? [];
        setShifts((prev) => (replace ? rows : [...prev, ...rows]));
        setPage(pageIndex);
        setHasMore(rows.length === PAGE_SIZE);
        setError(null);
      } catch (caught) {
        setError(caught);
      } finally {
        setLoading(false);
      }
    },
    [city, role, date, minPayKobo]
  );

  useEffect(() => {
    // Filters changed (or first mount): fetch the first page and replace. State
    // updates happen after the await inside fetchPage, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    setLoading(true);
    fetchPage(page + 1, false);
  }, [page, fetchPage]);

  return { shifts, loading, error, hasMore, loadMore };
}

// Cancels one of the facility's own open shifts via the cancel-shift Edge Function,
// which refunds the facility (collected amount minus Paystack fees) and then sets
// the shift cancelled — both server-side, since the refund needs the secret key.
export function useCancelShift() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cancelShift = useCallback(async (shiftId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('cancel-shift', {
        body: { shiftId },
      });
      if (invokeError) {
        throw invokeError;
      }
      if (!data?.success) {
        throw new Error(data?.error ?? 'Could not cancel the shift.');
      }
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  return { cancelShift, loading, error };
}

// Lists the current facility's own shifts (any status), newest first.
export function useFacilityShifts() {
  const facilityId = useAuthStore((state) => state.userId);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchShifts = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select('id, role_required, start_time, end_time, pay_rate_naira, city, status')
        .eq('facility_id', facilityId)
        .order('start_time', { ascending: false })
        .range(0, PAGE_SIZE - 1);
      if (fetchError) {
        throw fetchError;
      }
      setShifts(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchShifts();
  }, [fetchShifts]);

  return { shifts, loading, error, refetch: fetchShifts };
}

// Fetches a single shift by id (open, or one the professional has bid on — both
// allowed by RLS). Returns null if not found / not visible.
export function useShift(shiftId) {
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchShift = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select(SHIFT_SELECT)
        .eq('id', shiftId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      setShift(data);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchShift();
  }, [fetchShift]);

  return { shift, loading, error, refetch: fetchShift };
}
