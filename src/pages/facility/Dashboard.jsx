import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Clock, Plus, Users, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import SectionLabel from '@/components/ui/SectionLabel';
import EmptyState from '@/components/ui/EmptyState';
import NoticeBanner from '@/components/dashboard/NoticeBanner';
import RatingPromptBanner from '@/components/ratings/RatingPromptBanner';
import FacilityShiftCard from '@/components/shifts/FacilityShiftCard';
import Reveal from '@/components/layout/Reveal';
import PageContainer from '@/components/layout/PageContainer';
import { useFacilityDashboard } from '@/hooks/useDashboard';
import { usePendingRatings } from '@/hooks/useRatings';
import { formatNaira } from '@/utils/money';
import { cn } from '@/lib/utils';

function StatTile({ icon: Icon, value, label, accent = false }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 px-1 py-1 text-center">
        <span className={cn('flex size-9 items-center justify-center rounded-full', accent ? 'bg-brand-accent/15 text-brand-accent' : 'bg-primary/15 text-primary')}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className={cn('text-lg font-bold', accent ? 'text-brand-accent' : 'text-foreground')}>
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

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
      {/* Welcome header */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 -left-6 size-40 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <InitialsAvatar name={profile?.facility_name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              {profile?.facility_name ?? 'Your clinic'}
            </h1>
          </div>
          <Button
            size="icon-lg"
            aria-label="Post a job"
            onClick={() => navigate('/facility/post-shift')}
          >
            <Plus className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {pending.length > 0 && <RatingPromptBanner pending={pending} onRefetch={refetchPending} />}

      {profile && !profile.is_verified && (
        <NoticeBanner>Your clinic is under review. You can still post jobs.</NoticeBanner>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-2">
        <StatTile icon={Briefcase} value={stats.openShifts} label="Open jobs" />
        <StatTile icon={Users} value={shiftsNeedingAction.length} label="Pending" />
        <StatTile icon={Clock} value={stats.filledShifts} label="Filled" />
        <StatTile icon={Wallet} value={formatNaira(stats.totalSpentKobo)} label="Spent" accent />
      </div>

      {/* Needs your attention */}
      {shiftsNeedingAction.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Needs your attention</SectionLabel>
          {shiftsNeedingAction.map((shift) => (
            <FacilityShiftCard
              key={shift.id}
              shift={shift}
              footer={
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-brand-accent">
                    {shift.pendingBids} pending application{shift.pendingBids === 1 ? '' : 's'}
                  </span>
                  <Button size="sm" onClick={() => navigate(`/facility/shifts/${shift.id}/bids`)}>
                    Review
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Active jobs */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Active jobs</SectionLabel>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && recentShifts.length === 0 && (
          <EmptyState icon={Briefcase}>No jobs yet. Post your first locum job to get started.</EmptyState>
        )}
        {recentShifts.map((shift, index) => (
          <Reveal key={shift.id} delay={Math.min(index * 60, 240)}>
            <button
              type="button"
              onClick={() => navigate(`/facility/shifts/${shift.id}/bids`)}
              className="block w-full text-left"
            >
              <FacilityShiftCard shift={shift} />
            </button>
          </Reveal>
        ))}
      </div>

      {/* Need more doctors CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-2">
          <h3 className="text-base font-bold text-foreground">Need more doctors?</h3>
          <p className="text-sm text-muted-foreground">
            Post a new job to find qualified locum professionals in your area.
          </p>
          <Button className="mt-1 w-full" onClick={() => navigate('/facility/post-shift')}>
            <Plus className="size-4" aria-hidden="true" />
            Create job posting
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export default Dashboard;
