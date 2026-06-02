import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const SIGNED_URL_TTL_SECONDS = 900; // 15 minutes — INV-06 maximum.
const PAGE_SIZE = 20;

// Fetches the pending credential queue (admin-only via RLS), newest last, with the
// owning professional's basic details embedded.
export function usePendingCredentials() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // No setState before the first await: the effect calls this on mount while
  // `loading` is already true, so it never sets state synchronously in an effect.
  const fetchPending = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('credentials')
        .select(
          'id, professional_id, doc_type, storage_path, created_at, professional_profiles ( full_name, specialty, is_verified )'
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .range(0, PAGE_SIZE - 1);
      if (fetchError) {
        throw fetchError;
      }
      setCredentials(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: the architecture puts all data fetching in hooks. setState
    // only runs after the awaited query resolves, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPending();
  }, [fetchPending]);

  return { credentials, loading, error, refetch: fetchPending };
}

// Admin review actions: approve/reject a credential, mint a short-lived signed URL
// to view a document, and flip a professional's verified flag.
export function useReviewCredential() {
  const adminId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reviewCredential = useCallback(
    async (credentialId, status) => {
      setLoading(true);
      setError(null);
      try {
        const { error: updateError } = await supabase
          .from('credentials')
          .update({ status, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
          .eq('id', credentialId);
        if (updateError) {
          throw updateError;
        }
        return { error: null };
      } catch (caught) {
        setError(caught);
        return { error: caught };
      } finally {
        setLoading(false);
      }
    },
    [adminId]
  );

  const verifyProfessional = useCallback(async (professionalId) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('professional_profiles')
        .update({ is_verified: true })
        .eq('user_id', professionalId);
      if (updateError) {
        throw updateError;
      }
      return { error: null };
    } catch (caught) {
      setError(caught);
      return { error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  // Returns a signed URL (≤15 min) for the private document; never a public URL.
  const getDocumentUrl = useCallback(async (storagePath) => {
    setError(null);
    try {
      const { data, error: urlError } = await supabase.storage
        .from('credentials')
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
      if (urlError) {
        throw urlError;
      }
      return { url: data.signedUrl, error: null };
    } catch (caught) {
      setError(caught);
      return { url: null, error: caught };
    }
  }, []);

  return { reviewCredential, verifyProfessional, getDocumentUrl, loading, error };
}
