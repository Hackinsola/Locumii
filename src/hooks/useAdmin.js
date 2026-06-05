import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 20;

// Dashboard counts (admin-only via is_admin() RLS). totalRevenue sums the
// commission on released transactions — there are none until the payment unit
// ships, so this reads 0 for now. NOTE: when transaction volume grows this sum
// should move to a database aggregate (RPC) rather than a client-side reduce.
export function useAdminDashboard() {
  const [counts, setCounts] = useState({
    pendingCredentials: 0,
    pendingFacilities: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCounts = useCallback(async () => {
    try {
      const [pendingCredentials, pendingFacilities, totalUsers, releasedTransactions] =
        await Promise.all([
          supabase
            .from('credentials')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('facility_profiles')
            .select('user_id', { count: 'exact', head: true })
            .eq('is_verified', false),
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase
            .from('transactions')
            .select('commission_naira')
            .eq('status', 'released')
            .range(0, 999),
        ]);

      for (const result of [pendingCredentials, pendingFacilities, totalUsers, releasedTransactions]) {
        if (result.error) {
          throw result.error;
        }
      }

      const totalRevenue = (releasedTransactions.data ?? []).reduce(
        (sum, row) => sum + (row.commission_naira ?? 0),
        0
      );

      setCounts({
        pendingCredentials: pendingCredentials.count ?? 0,
        pendingFacilities: pendingFacilities.count ?? 0,
        totalUsers: totalUsers.count ?? 0,
        totalRevenue,
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
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading, error, refetch: fetchCounts };
}

// Pre-launch waitlist signups (admin-only via the waitlist_select_admin RLS policy).
// Newest first; one generous page since the list is small pre-launch. Backs the admin
// Waitlist page (view + CSV export).
export function useWaitlistSignups() {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSignups = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('waitlist')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .range(0, 999);
      if (fetchError) {
        throw fetchError;
      }
      setSignups(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSignups();
  }, [fetchSignups]);

  return { signups, loading, error, refetch: fetchSignups };
}

// Facilities awaiting verification (is_verified = false). Admin reads all rows via
// the facility_profiles select policy. One page, oldest first.
export function usePendingFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFacilities = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('facility_profiles')
        .select(
          'user_id, facility_name, facility_type, city, cac_number, contact_name, contact_phone, created_at'
        )
        .eq('is_verified', false)
        .order('created_at', { ascending: true })
        .range(0, PAGE_SIZE - 1);
      if (fetchError) {
        throw fetchError;
      }
      setFacilities(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFacilities();
  }, [fetchFacilities]);

  return { facilities, loading, error, refetch: fetchFacilities };
}

// Paginated user list (admin reads all via users_select_own → is_admin()). Filters
// by role and status (exact) and by email substring. The display name lives in the
// role profile tables, so both are embedded and the present one is used.
export function useUsers({ role, status, search, page = 0 }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      let query = supabase
        .from('users')
        .select(
          'id, email, role, status, created_at, professional_profiles ( full_name, avg_rating ), facility_profiles ( facility_name )'
        );
      if (role) {
        query = query.eq('role', role);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.ilike('email', `%${search}%`);
      }
      const from = page * PAGE_SIZE;
      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (fetchError) {
        throw fetchError;
      }
      setUsers(data ?? []);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [role, status, search, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

// Admin status changes on a user row (users_update_admin RLS). Suspend doubles as
// "ban" for the MVP (ban = permanent suspension); reactivate restores access.
export function useUpdateUserStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setStatus = useCallback(async (userId, status) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ status })
        .eq('id', userId);
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

  const suspendUser = useCallback((userId) => setStatus(userId, 'suspended'), [setStatus]);
  const reactivateUser = useCallback((userId) => setStatus(userId, 'active'), [setStatus]);

  return { suspendUser, reactivateUser, loading, error };
}

// Completed-shift counts for a set of professionals, as a { userId: count } map.
// Used with avg_rating to flag low performers in the admin user manager (Spec 11):
// a completed shift = an accepted bid on a shift that reached status 'completed'.
// Admin RLS (is_admin() in bids/shifts select policies) allows this read directly.
export function useCompletedShiftCounts(professionalIds) {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);

  // Stable key so the effect only re-runs when the actual id set changes.
  const idsKey = (professionalIds ?? []).slice().sort().join(',');

  const fetchCounts = useCallback(async () => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setCounts({});
      return;
    }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('bids')
        .select('professional_id, shifts!inner ( status )')
        .in('professional_id', ids)
        .eq('status', 'accepted')
        .eq('shifts.status', 'completed');
      if (fetchError) {
        throw fetchError;
      }
      const map = {};
      for (const row of data ?? []) {
        map[row.professional_id] = (map[row.professional_id] ?? 0) + 1;
      }
      setCounts(map);
    } catch {
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, [idsKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading };
}

// Marks a facility verified. The guard_facility_protected_columns trigger permits
// the is_verified change only because the caller is an admin (is_admin() JWT).
export function useVerifyFacility() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const approveFacility = useCallback(async (facilityUserId) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('facility_profiles')
        .update({ is_verified: true })
        .eq('user_id', facilityUserId);
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

  return { approveFacility, loading, error };
}
