import { useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProfessionalBids, usePendingBidCounts } from '@/hooks/useBids';
import { useProfessionalEarnings, useFacilityTransactions } from '@/hooks/usePayments';
import { useFacilityShifts } from '@/hooks/useShifts';
import { useProfessionalProfile, useOwnFacilityProfile } from '@/hooks/useProfile';

// Dashboard data is composed from the existing per-feature hooks rather than a new
// bundled query — each hook already owns its fetch + RLS scoping. These wrappers just
// derive the dashboard shape (stats, upcoming, recent) and expose one loading/refetch.

// Normalises a to-one PostgREST embed (object, or array in some shapes) to one row.
function one(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

const RECENT_LIMIT = 5;
const UPCOMING_LIMIT = 3;

// Professional home: active/upcoming/earned stats, the next few confirmed shifts, and
// recent bids. `profile` carries the name + is_verified + existence (null = no profile).
export function useProDashboard() {
  const userId = useAuthStore((state) => state.userId);
  const { bids, loading: bidsLoading, error: bidsError, refetch: refetchBids } = useProfessionalBids();
  const { earnings, loading: earningsLoading, refetch: refetchEarnings } = useProfessionalEarnings();
  const {
    profile,
    loading: profileLoading,
    refetch: refetchProfile,
  } = useProfessionalProfile(userId);

  // Captured once (lazy init) so the render stays pure; refreshed on refetch/remount.
  const [now] = useState(() => Date.now());

  // Full upcoming list (for the count), then a small slice for display.
  const upcoming = bids
    .filter((bid) => {
      const shift = one(bid.shifts);
      return bid.status === 'accepted' && shift?.start_time && new Date(shift.start_time).getTime() > now;
    })
    .sort((a, b) => {
      const aStart = one(a.shifts)?.start_time ?? '';
      const bStart = one(b.shifts)?.start_time ?? '';
      return aStart.localeCompare(bStart);
    });
  const upcomingShifts = upcoming.slice(0, UPCOMING_LIMIT);

  const stats = {
    activeBids: bids.filter((bid) => bid.status === 'pending').length,
    upcomingShifts: upcoming.length,
    totalEarnedKobo: earnings.totalEarnedKobo,
  };

  const refetch = useCallback(() => {
    refetchBids();
    refetchEarnings();
    refetchProfile();
  }, [refetchBids, refetchEarnings, refetchProfile]);

  return {
    stats,
    upcomingShifts,
    recentBids: bids.slice(0, RECENT_LIMIT),
    profile,
    loading: bidsLoading || earningsLoading || profileLoading,
    error: bidsError,
    refetch,
  };
}

// Facility home: open/filled/spent stats, shifts needing action (open + ≥1 pending
// bid), and recent shifts. `profile` carries facility name + is_verified + existence.
export function useFacilityDashboard() {
  const userId = useAuthStore((state) => state.userId);
  const { shifts, loading: shiftsLoading, error: shiftsError, refetch: refetchShifts } = useFacilityShifts();
  const { summary, loading: txLoading, refetch: refetchTx } = useFacilityTransactions();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useOwnFacilityProfile(userId);

  const openShiftIds = shifts.filter((shift) => shift.status === 'open').map((shift) => shift.id);
  const { counts: pendingCounts } = usePendingBidCounts(openShiftIds);

  const shiftsNeedingAction = shifts
    .filter((shift) => shift.status === 'open' && (pendingCounts[shift.id] ?? 0) > 0)
    .map((shift) => ({ ...shift, pendingBids: pendingCounts[shift.id] }));

  const stats = {
    openShifts: shifts.filter((shift) => shift.status === 'open').length,
    filledShifts: shifts.filter((shift) => shift.status === 'filled').length,
    totalSpentKobo: summary.totalSpentKobo,
  };

  const refetch = useCallback(() => {
    refetchShifts();
    refetchTx();
    refetchProfile();
  }, [refetchShifts, refetchTx, refetchProfile]);

  return {
    stats,
    shiftsNeedingAction,
    recentShifts: shifts.slice(0, RECENT_LIMIT),
    profile,
    loading: shiftsLoading || txLoading || profileLoading,
    error: shiftsError,
    refetch,
  };
}
