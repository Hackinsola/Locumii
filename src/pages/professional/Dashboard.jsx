import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Gavel, Search, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DashboardHero from '@/components/dashboard/DashboardHero';
import StatCard from '@/components/dashboard/StatCard';
import SectionLabel from '@/components/ui/SectionLabel';
import UpcomingShiftCard from '@/components/dashboard/UpcomingShiftCard';
import NoticeBanner from '@/components/dashboard/NoticeBanner';
import CTAButton from '@/components/dashboard/CTAButton';
import RatingPromptBanner from '@/components/ratings/RatingPromptBanner';
import PageContainer from '@/components/layout/PageContainer';
import { useProDashboard } from '@/hooks/useDashboard';
import { usePendingRatings } from '@/hooks/useRatings';
import { formatNaira } from '@/utils/money';

const BID_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Not selected',
  cancelled: 'Cancelled',
};

function one(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function RecentBidRow({ bid, onView }) {
  const shift = one(bid.shifts);
  if (!shift) {
    return null;
  }
  const facility = one(shift.facility_profiles);
  return (
    <button
      type="button"
      onClick={() => onView(shift.id)}
      className="flex w-full items-center justify-between gap-3 border-b border-border py-2 text-left last:border-b-0 hover:opacity-80"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          {shift.role_required}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {facility?.facility_name ?? 'Facility'}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {BID_STATUS_LABELS[bid.status] ?? bid.status}
      </span>
    </button>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { stats, upcomingShifts, recentBids, profile, loading } = useProDashboard();
  const { pending, refetch: refetchPending } = usePendingRatings();

  // No profile row yet → send them through onboarding first.
  useEffect(() => {
    if (!loading && !profile) {
      navigate('/professional/onboarding', { replace: true });
    }
  }, [loading, profile, navigate]);

  const nextShift = upcomingShifts[0];
  const nextFacility = nextShift ? one(nextShift.shifts)?.facility_profiles : null;

  return (
    <PageContainer>
        <DashboardHero
          badge="Professional"
          title={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ''}`}
          subtitle="Browse open shifts, track your bids, and watch your earnings grow — all in one place."
          action={
            <Button
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => navigate('/professional/shifts')}
            >
              <Search className="size-4" aria-hidden="true" />
              Find shifts
            </Button>
          }
        />

        {pending.length > 0 && <RatingPromptBanner pending={pending} onRefetch={refetchPending} />}

        {!profile?.is_verified && (
          <NoticeBanner>
            Your credentials are under review. You can browse shifts now — bidding unlocks once an
            admin verifies you.
          </NoticeBanner>
        )}

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Active bids" value={stats.activeBids} mono icon={Gavel} />
          <StatCard label="Upcoming" value={stats.upcomingShifts} mono icon={CalendarClock} />
          <StatCard
            label="Total earned"
            value={formatNaira(stats.totalEarnedKobo)}
            mono
            accent
            icon={Wallet}
          />
        </div>

        {nextShift && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Next shift</SectionLabel>
            <UpcomingShiftCard shift={one(nextShift.shifts)} facility={one(nextFacility)} />
          </div>
        )}

        <CTAButton label="Browse shifts" to="/professional/shifts" icon={Search} />

        <Card>
          <CardContent className="flex flex-col gap-1">
            <SectionLabel className="mb-2">Recent bids</SectionLabel>
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && recentBids.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You haven’t bid on any shifts yet.
              </p>
            )}
            {recentBids.map((bid) => (
              <RecentBidRow key={bid.id} bid={bid} onView={(id) => navigate(`/professional/shifts/${id}`)} />
            ))}
          </CardContent>
        </Card>
    </PageContainer>
  );
}

export default Dashboard;
