import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { COMMISSION_RATE } from '@/constants/fees';

// The current professional's earnings: released payouts (RLS scopes transactions to
// shifts they worked), total earned, completed count, and a pending estimate (net
// of accepted bids on filled / in-progress shifts not yet paid out). One page.
export function useProfessionalEarnings() {
  const userId = useAuthStore((state) => state.userId);
  const [earnings, setEarnings] = useState({
    totalEarnedKobo: 0,
    pendingKobo: 0,
    completedCount: 0,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEarnings = useCallback(async () => {
    try {
      const { data: released, error: releasedError } = await supabase
        .from('transactions')
        .select(
          'shift_id, status, gross_amount_naira, commission_naira, net_amount_naira, released_at, shifts ( role_required, start_time, facility_profiles ( facility_name ) )'
        )
        .eq('status', 'released')
        .order('released_at', { ascending: false })
        .range(0, 19);
      if (releasedError) {
        throw releasedError;
      }
      const rows = released ?? [];
      const totalEarnedKobo = rows.reduce((sum, row) => sum + (row.net_amount_naira ?? 0), 0);

      const { data: accepted, error: acceptedError } = await supabase
        .from('bids')
        .select('shifts ( pay_rate_naira, status )')
        .eq('professional_id', userId)
        .eq('status', 'accepted');
      if (acceptedError) {
        throw acceptedError;
      }
      const pendingKobo = (accepted ?? []).reduce((sum, bid) => {
        const shift = Array.isArray(bid.shifts) ? bid.shifts[0] : bid.shifts;
        if (shift && (shift.status === 'filled' || shift.status === 'in_progress')) {
          const gross = shift.pay_rate_naira ?? 0;
          return sum + (gross - Math.round(gross * COMMISSION_RATE));
        }
        return sum;
      }, 0);

      setEarnings({
        totalEarnedKobo,
        pendingKobo,
        completedCount: rows.length,
        transactions: rows,
      });
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEarnings();
  }, [fetchEarnings]);

  return { earnings, loading, error, refetch: fetchEarnings };
}

// The facility's transaction history (RLS scopes transactions to the facility's own
// shifts), with a spend summary. One page.
export function useFacilityTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalSpentKobo: 0, completedCount: 0, avgKobo: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select(
          'shift_id, status, gross_amount_naira, commission_naira, net_amount_naira, released_at, created_at, shifts ( role_required, start_time )'
        )
        .order('created_at', { ascending: false })
        .range(0, 19);
      if (fetchError) {
        throw fetchError;
      }
      const rows = data ?? [];
      const releasedRows = rows.filter((row) => row.status === 'released');
      const totalSpentKobo = releasedRows.reduce((sum, row) => sum + (row.gross_amount_naira ?? 0), 0);
      const completedCount = releasedRows.length;
      setTransactions(rows);
      setSummary({
        totalSpentKobo,
        completedCount,
        avgKobo: completedCount > 0 ? Math.round(totalSpentKobo / completedCount) : 0,
      });
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, summary, loading, error, refetch: fetchTransactions };
}

// Triggers the payout for a completed shift. Safe to call after either party's
// completion confirmation: the release-payment Edge Function re-checks that BOTH
// sides confirmed and pays at most once per shift (so a single-side confirm is a
// no-op that returns { ready: false }). Returns the function's result for the UI.
export function useReleasePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const releasePayment = useCallback(async (shiftId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('release-payment', {
        body: { shiftId },
      });
      if (invokeError) {
        throw invokeError;
      }
      return { result: data, error: null };
    } catch (caught) {
      setError(caught);
      return { result: null, error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  return { releasePayment, loading, error };
}

// The supported Nigerian banks (name + code) for the bank-linking select, fetched
// through the paystack-proxy Edge Function (secret key stays server-side).
export function useSupportedBanks() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBanks = useCallback(async () => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('paystack-proxy', {
        body: { action: 'banks' },
      });
      if (invokeError) {
        throw invokeError;
      }
      if (!data?.banks) {
        throw new Error(data?.error ?? 'Could not load the bank list.');
      }
      setBanks(data.banks);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBanks();
  }, [fetchBanks]);

  return { banks, loading, error };
}

// Resolves an account number + bank code to the account holder's name (via
// Paystack, server-side). The professional confirms this before saving.
export function useResolveBankAccount() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolveAccount = useCallback(async ({ accountNumber, bankCode }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('paystack-proxy', {
        body: { action: 'resolve', accountNumber, bankCode },
      });
      if (invokeError) {
        throw invokeError;
      }
      if (!data?.accountName) {
        throw new Error(data?.error ?? 'Could not verify the account.');
      }
      return { accountName: data.accountName, error: null };
    } catch (caught) {
      setError(caught);
      return { accountName: null, error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolveAccount, loading, error };
}

// Saves the verified bank account on the current professional's profile. Only
// done after a successful resolve. bank_account_number / bank_code are updatable
// by the owner (the guard trigger only protects is_verified / avg_rating).
export function useLinkBankAccount() {
  const userId = useAuthStore((state) => state.userId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const linkBankAccount = useCallback(
    async ({ accountNumber, bankCode }) => {
      setLoading(true);
      setError(null);
      try {
        const { error: updateError } = await supabase
          .from('professional_profiles')
          .update({ bank_account_number: accountNumber, bank_code: bankCode })
          .eq('user_id', userId);
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
    [userId]
  );

  return { linkBankAccount, loading, error };
}

// Whether the current professional has a bank account linked, with only the last 4
// digits kept (the full number is sensitive — never stored client-side beyond this
// masked read; code-standards).
export function useOwnBankAccount() {
  const userId = useAuthStore((state) => state.userId);
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBank = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('professional_profiles')
        .select('bank_account_number, bank_code')
        .eq('user_id', userId)
        .maybeSingle();
      if (fetchError) {
        throw fetchError;
      }
      if (data?.bank_account_number && data?.bank_code) {
        setBank({
          linked: true,
          bankCode: data.bank_code,
          accountLast4: String(data.bank_account_number).slice(-4),
        });
      } else {
        setBank({ linked: false });
      }
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBank();
  }, [fetchBank]);

  return { bank, loading, error, refetch: fetchBank };
}

// Posts a shift only after a Paystack charge is verified server-side. The
// verify-payment Edge Function checks the charge with Paystack (secret key,
// server-side), confirms the amount equals the gross pay rate, and creates the
// shift — so the shift is never created without a confirmed payment.
export function usePostPaidShift() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const postPaidShift = useCallback(async ({ reference, shift }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('verify-payment', {
        body: { reference, shift },
      });
      if (invokeError) {
        throw invokeError;
      }
      if (!data?.success) {
        throw new Error(data?.error ?? 'Payment could not be verified.');
      }
      return { shiftId: data.shiftId, error: null };
    } catch (caught) {
      setError(caught);
      return { shiftId: null, error: caught };
    } finally {
      setLoading(false);
    }
  }, []);

  return { postPaidShift, loading, error };
}
