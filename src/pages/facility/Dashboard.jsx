import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle2, Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DashboardHero from '@/components/dashboard/DashboardHero';
import StatCard from '@/components/dashboard/StatCard';
import SectionLabel from '@/components/ui/SectionLabel';
import NoticeBanner from '@/components/dashboard/NoticeBanner';
import CTAButton from '@/components/dashboard/CTAButton';
import RatingPromptBanner from '@/components/ratings/RatingPromptBanner';
import StatusBadge from '@/components/shifts/StatusBadge';
import PageContainer from '@/components/layout/PageContainer';
import { useFacilityDashboard } from '@/hooks/useDashboard';
import { usePendingRatings } from '@/hooks/useRatings';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';

function Dashboard() {
  const navigate = useNavigate();
  const { stats, shiftsNeedingAction, recentShifts, profile, loading } = useFacilityDashboard();
  const { pending, refetch: refetchPending } = usePendingRatings();

  // No facility profile row yet → onboard first.
  useEffect(() => {
    if (!loading && !profile) {
      navigate('/facility/onboarding', { replace: true });
    }
  }, [loading, profile, navigate]);

  return (
    <PageContainer>
        <DashboardHero
          badge="Facility"
          title={`Welcome, ${profile?.facility_name ?? 'your facility'}`}
          subtitle="Post shifts, review verified bids, and manage your hiring — all in one place."
          action={
            <Button
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => navigate('/facility/post-shift')}
            >
              <Plus className="size-4" aria-hidden="true" />
              Post a shift
            </Button>
          }
        />

        {pending.length > 0 && <RatingPromptBanner pending={pending} onRefetch={refetchPending} />}

        {!profile?.is_verified && (
          <NoticeBanner>Your facility is under review. You can still post shifts.</NoticeBanner>
        )}

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Open shifts" value={stats.openShifts} mono icon={Briefcase} />
          <StatCard label="Filled" value={stats.filledShifts} mono icon={CheckCircle2} />
          <StatCard
            label="Total spent"
            value={formatNaira(stats.totalSpentKobo)}
            mono
            icon={Wallet}
          />
        </div>

        {shiftsNeedingAction.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Needs your attention</SectionLabel>
            {shiftsNeedingAction.map((shift) => (
              <Card key={shift.id} className="border-l-4 border-l-primary">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {shift.role_required}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {shift.pendingBids} pending bid{shift.pendingBids === 1 ? '' : 's'} ·{' '}
                      {formatShiftRange(shift.start_time, shift.end_time)}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/facility/shifts/${shift.id}/bids`)}>
                    View bids
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CTAButton label="Post a shift" to="/facility/post-shift" icon={Plus} />

        <Card>
          <CardContent className="flex flex-col gap-1">
            <SectionLabel className="mb-2">Recent shifts</SectionLabel>
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && recentShifts.length === 0 && (
              <p className="text-sm text-muted-foreground">You haven’t posted any shifts yet.</p>
            )}
            {recentShifts.map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => navigate(`/facility/shifts/${shift.id}/bids`)}
                className="flex w-full items-center justify-between gap-3 border-b border-border py-2 text-left last:border-b-0 hover:opacity-80"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {shift.role_required}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatShiftRange(shift.start_time, shift.end_time)}
                  </span>
                </span>
                <StatusBadge status={shift.status} />
              </button>
            ))}
          </CardContent>
        </Card>
    </PageContainer>
  );
}

export default Dashboard;
