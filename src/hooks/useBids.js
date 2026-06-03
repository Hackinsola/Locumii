import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// The current professional's bid on a given shift (null if they haven't bid).
export function useShiftBid(shiftId) {
  const professionalId = useAuthStore((state) => state.userId);
  const [bid, setBid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBid = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('bids')
        .select('id, status, submitted_at')
        .eq('shift_id', shiftId)
        .eq('professional_id', professionalId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      setBid(data);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [shiftId, professionalId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBid();
  }, [fetchBid]);

  return { bid, loading, error, refetch: fetchBid };
}

// Lists the bids on a shift (RLS lets a facility see bids on its own shifts),
// with each bidder's profile embedded.
export function useShiftBids(shiftId) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBids = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('bids')
        .select(
          'id, status, submitted_at, professional_id, professional_profiles ( full_name, specialty, is_verified, avg_rating )'
        )
        .eq('shift_id', shiftId)
        .order('submitted_at', { ascending: true });
      if (fetchError) {
        throw fetchError;
      }
      setBids(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBids();
  }, [fetchBids]);

  return { bids, loading, error, refetch: fetchBids };
}

// Accepts a bid via the accept_bid RPC: server-side, atomic — sets the bid
// accepted, cancels the competing bids, and moves the shift to filled.
export function useAcceptBid() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const acceptBid = useCallback(async (bidId) => {
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('accept_bid', { p_bid_id: bidId });
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

  return { acceptBid, loading, error };
}

// Submits a pending bid on a shift. The DB enforces INV-02 (verified-only) and the
// one-bid-per-shift constraint; this returns their errors for the UI to handle.
export function useSubmitBid() {
  const professionalId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitBid = useCallback(
    async (shiftId) => {
      setLoading(true);
      setError(null);
      try {
        if (!professionalId) {
          throw new Error('You must be signed in to bid.');
        }
        const { error: insertError } = await supabase
          .from('bids')
          .insert({ shift_id: shiftId, professional_id: professionalId, status: 'pending' });
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
    [professionalId]
  );

  return { submitBid, loading, error };
}
