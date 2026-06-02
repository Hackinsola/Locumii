import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Creates or updates the current user's professional_profiles row. is_verified
// and avg_rating are intentionally never written here — a DB trigger blocks
// non-admins from changing them, so they keep their defaults on insert.
export function useSaveProfessionalProfile() {
  const userId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveProfile = useCallback(
    async (values) => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) {
          throw new Error('You must be signed in to save your profile.');
        }
        const { error: saveError } = await supabase.from('professional_profiles').upsert(
          {
            user_id: userId,
            full_name: values.fullName,
            specialty: values.specialty,
            council_reg_number: values.councilRegNumber,
            years_experience: values.yearsExperience,
            bio: values.bio || null,
            preferred_cities: values.preferredCities,
          },
          { onConflict: 'user_id' }
        );
        if (saveError) {
          throw saveError;
        }
        return { error: null };
      } catch (caught) {
        setError(caught);
        return { error: caught };
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  return { saveProfile, loading, error };
}

// Creates or updates the current user's facility_profiles row. As with the
// professional profile, is_verified and avg_rating are never written here.
export function useSaveFacilityProfile() {
  const userId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveProfile = useCallback(
    async (values) => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) {
          throw new Error('You must be signed in to save your profile.');
        }
        const { error: saveError } = await supabase.from('facility_profiles').upsert(
          {
            user_id: userId,
            facility_name: values.facilityName,
            facility_type: values.facilityType,
            cac_number: values.cacNumber,
            address: values.address,
            city: values.city,
            state: values.state,
            contact_name: values.contactName,
          },
          { onConflict: 'user_id' }
        );
        if (saveError) {
          throw saveError;
        }
        return { error: null };
      } catch (caught) {
        setError(caught);
        return { error: caught };
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  return { saveProfile, loading, error };
}
