import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

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
