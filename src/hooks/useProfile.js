import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Public-facing columns only. bank_account_number / bank_code are sensitive and
// are never selected for display (see code-standards.md — never SELECT *).
// council_reg_number is shown on the profile (Feature-specs/04 Profile View).
const PROFESSIONAL_PROFILE_SELECT =
  'user_id, full_name, specialty, council_reg_number, years_experience, bio, preferred_cities, phone, available_for_locum, availability, is_verified, avg_rating, created_at';
// cac_number is sensitive and is intentionally excluded from the public view.
const FACILITY_PROFILE_SELECT =
  'user_id, facility_name, facility_type, address, city, state, contact_name, is_verified, avg_rating, created_at';

// Reads a single professional's public profile by user id (RLS lets any
// authenticated user read profiles). Returns null if no profile exists.
export function useProfessionalProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      if (!userId) {
        throw new Error('No professional was specified.');
      }
      const { data, error: fetchError } = await supabase
        .from('professional_profiles')
        .select(PROFESSIONAL_PROFILE_SELECT)
        .eq('user_id', userId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      setProfile(data);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

// Reads a single facility's public profile by user id. Returns null if none.
export function useFacilityProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      if (!userId) {
        throw new Error('No facility was specified.');
      }
      const { data, error: fetchError } = await supabase
        .from('facility_profiles')
        .select(FACILITY_PROFILE_SELECT)
        .eq('user_id', userId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      setProfile(data);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

// Owner-scoped facility read. Includes cac_number / contact_phone (sensitive,
// kept out of the public FACILITY_PROFILE_SELECT) so the facility can view and
// edit its own full record. Pass the current user's id.
const OWN_FACILITY_PROFILE_SELECT =
  'user_id, facility_name, facility_type, cac_number, address, city, state, contact_name, contact_phone, description, is_verified, avg_rating, created_at';

export function useOwnFacilityProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      if (!userId) {
        throw new Error('You must be signed in to view your profile.');
      }
      const { data, error: fetchError } = await supabase
        .from('facility_profiles')
        .select(OWN_FACILITY_PROFILE_SELECT)
        .eq('user_id', userId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      setProfile(data);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}

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
        const row = {
          user_id: userId,
          full_name: values.fullName,
          specialty: values.specialty,
          council_reg_number: values.councilRegNumber,
          years_experience: values.yearsExperience,
          bio: values.bio || null,
          preferred_cities: values.preferredCities,
        };
        // Optional fields — only written when the caller supplies them, so editing
        // the basic profile never clears the phone/availability set elsewhere.
        if (values.phone !== undefined) {
          row.phone = values.phone || null;
        }
        if (values.availableForLocum !== undefined) {
          row.available_for_locum = values.availableForLocum;
        }
        if (values.availability !== undefined) {
          row.availability = values.availability;
        }
        const { error: saveError } = await supabase
          .from('professional_profiles')
          .upsert(row, { onConflict: 'user_id' });
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

// Updates only the availability-related columns on the current professional's row
// (master toggle, weekly schedule, preferred areas). Used by the Availability screen;
// kept separate from saveProfile so it never touches the required identity fields.
export function useSaveAvailability() {
  const userId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveAvailability = useCallback(
    async ({ availableForLocum, availability, preferredCities }) => {
      setLoading(true);
      setError(null);
      try {
        if (!userId) {
          throw new Error('You must be signed in to update your availability.');
        }
        const patch = {};
        if (availableForLocum !== undefined) {
          patch.available_for_locum = availableForLocum;
        }
        if (availability !== undefined) {
          patch.availability = availability;
        }
        if (preferredCities !== undefined) {
          patch.preferred_cities = preferredCities;
        }
        const { data, error: saveError } = await supabase
          .from('professional_profiles')
          .update(patch)
          .eq('user_id', userId)
          .select()
          .maybeSingle();
        if (saveError) {
          throw saveError;
        }
        if (data === null) {
          throw new Error('No profile found to update.');
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

  return { saveAvailability, loading, error };
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
        const facilityRow = {
          user_id: userId,
          facility_name: values.facilityName,
          facility_type: values.facilityType,
          cac_number: values.cacNumber,
          address: values.address,
          city: values.city,
          state: values.state,
          contact_name: values.contactName,
          contact_phone: values.contactPhone,
        };
        // Optional — only written when supplied, so edits that omit it don't clear it.
        if (values.description !== undefined) {
          facilityRow.description = values.description || null;
        }
        const { error: saveError } = await supabase
          .from('facility_profiles')
          .upsert(facilityRow, { onConflict: 'user_id' });
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
