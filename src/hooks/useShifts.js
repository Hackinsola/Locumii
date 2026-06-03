import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const SHIFT_SELECT =
  'id, role_required, start_time, end_time, pay_rate_naira, requirements, city, status, facility_profiles ( facility_name, avg_rating )';
const PAGE_SIZE = 20;

// Creates a shift owned by the current facility. status defaults to 'open' and
// paystack_reference stays null until the payment unit is built. pay_rate_naira is
// an integer in kobo (see utils/money.js).
export function useCreateShift() {
  const facilityId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createShift = useCallback(
    async (values) => {
      setLoading(true);
      setError(null);
      try {
        if (!facilityId) {
          throw new Error('You must be signed in to post a shift.');
        }
        const { data, error: insertError } = await supabase
          .from('shifts')
          .insert({
            facility_id: facilityId,
            role_required: values.roleRequired,
            start_time: values.startTime,
            end_time: values.endTime,
            pay_rate_naira: values.payRateKobo,
            requirements: values.requirements || null,
            city: values.city,
          })
          .select('id')
          .single();
        if (insertError) {
          throw insertError;
        }
        return { error: null, shiftId: data?.id };
      } catch (caught) {
        setError(caught);
        return { error: caught };
      } finally {
        setLoading(false);
      }
    },
    [facilityId]
  );

  return { createShift, loading, error };
}

// Browses open shifts (RLS exposes status='open' to any authenticated user),
// filtered by city / role substring / date, capped at one page.
export function useOpenShifts({ city, role, date }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchShifts = useCallback(async () => {
    try {
      let query = supabase.from('shifts').select(SHIFT_SELECT).eq('status', 'open');
      if (city) {
        query = query.eq('city', city);
      }
      if (role) {
        query = query.ilike('role_required', `%${role}%`);
      }
      if (date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        query = query.gte('start_time', dayStart.toISOString()).lte('start_time', dayEnd.toISOString());
      }
      const { data, error: fetchError } = await query
        .order('start_time', { ascending: true })
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
  }, [city, role, date]);

  useEffect(() => {
    // Fetch-on-mount / on-filter-change; setState only runs after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchShifts();
  }, [fetchShifts]);

  return { shifts, loading, error, refetch: fetchShifts };
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
