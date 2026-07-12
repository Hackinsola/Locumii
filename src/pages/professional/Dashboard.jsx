import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Navigation, SearchX, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import EmptyState from '@/components/ui/EmptyState';
import ShiftCard from '@/components/shifts/ShiftCard';
import NoticeBanner from '@/components/dashboard/NoticeBanner';
import RatingPromptBanner from '@/components/ratings/RatingPromptBanner';
import Reveal from '@/components/layout/Reveal';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { avatarUrl, useProfessionalProfile } from '@/hooks/useProfile';
import { useOpenShifts } from '@/hooks/useShifts';
import { usePendingRatings } from '@/hooks/useRatings';
import { PROFESSIONAL_SPECIALTIES, FCT_CITIES } from '@/constants/options';
import { cn } from '@/lib/utils';

const SPECIALTY_LABELS = Object.fromEntries(
  PROFESSIONAL_SPECIALTIES.map((item) => [item.value, item.label])
);

// Filter values: 'near' = the professional's preferred areas, '' = all areas, or a
// specific FCT council.
function Dashboard() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfessionalProfile(userId);
  const { pending, refetch: refetchPending } = usePendingRatings();
  const [filter, setFilter] = useState('near');

  // 'near' and 'all' both fetch every open shift; the near/away split happens client
  // side against the professional's preferred areas.
  const cityParam = filter === 'near' || filter === '' ? '' : filter;
  const { shifts, loading, error, hasMore, loadMore } = useOpenShifts({ city: cityParam });

  // No profile row yet → send them through onboarding first.
  useEffect(() => {
    if (!profileLoading && !profile && !profileError) {
      navigate('/professional/onboarding', { replace: true });
    }
  }, [profileLoading, profile, profileError, navigate]);

  const preferred = useMemo(() => profile?.preferred_cities ?? [], [profile]);
  const { near, away } = useMemo(() => {
    if (filter !== 'near') {
      return { near: shifts, away: [] };
    }
    return {
      near: shifts.filter((shift) => preferred.includes(shift.city)),
      away: shifts.filter((shift) => !preferred.includes(shift.city)),
    };
  }, [filter, shifts, preferred]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'there';
  const specialtyLabel = profile?.specialty ? SPECIALTY_LABELS[profile.specialty] : null;
  const homeCity = preferred[0] ?? 'Abuja, FCT';

  function renderCards(list, offset = 0) {
    return list.map((shift, index) => (
      <Reveal key={shift.id} delay={Math.min((offset + index) * 60, 360)}>
        <Link to={`/professional/shifts/${shift.id}`} className="block">
          <ShiftCard shift={shift} />
        </Link>
      </Reveal>
    ));
  }

  return (
    <PageContainer>
      {/* Greeting header with a soft brand glow */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 -left-6 size-40 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <InitialsAvatar name={profile?.full_name} src={avatarUrl(profile?.avatar_path)} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
              Hi, {firstName}
            </h1>
            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
              {specialtyLabel && <span>{specialtyLabel}</span>}
              {specialtyLabel && <span aria-hidden="true">·</span>}
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{homeCity}</span>
            </p>
          </div>
          <Link
            to="/professional/earnings"
            aria-label="Earnings"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
          >
            <Wallet className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {pending.length > 0 && <RatingPromptBanner pending={pending} onRefetch={refetchPending} />}

      {profile && !profile.is_verified && (
        <NoticeBanner>
          Your credentials are under review. You can browse shifts now — bidding unlocks once an
          admin verifies you.
        </NoticeBanner>
      )}

      {/* Area filter chips */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <FilterChip active={filter === 'near'} onClick={() => setFilter('near')}>
          <Navigation className="size-3.5" aria-hidden="true" />
          Near me
          {filter === 'near' && near.length > 0 && (
            <span className="rounded-full bg-primary-foreground/25 px-1.5 text-xs">{near.length}</span>
          )}
        </FilterChip>
        <FilterChip active={filter === ''} onClick={() => setFilter('')}>
          All areas
        </FilterChip>
        {FCT_CITIES.map((city) => (
          <FilterChip key={city} active={filter === city} onClick={() => setFilter(city)}>
            {city}
          </FilterChip>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">Could not load shifts.</p>}

      {/* Near-me view: local jobs first, then a "further away" group */}
      {filter === 'near' ? (
        <>
          {!loading && preferred.length === 0 && (
            <NoticeBanner>
              Set your preferred areas in{' '}
              <Link to="/professional/availability" className="font-medium text-primary underline-offset-2 hover:underline">
                Availability
              </Link>{' '}
              to see jobs near you.
            </NoticeBanner>
          )}
          {near.length > 0 && <div className="grid gap-3 md:grid-cols-2">{renderCards(near)}</div>}
          {away.length > 0 && (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-brand-accent-light px-4 py-3 text-sm text-brand-accent">
                <Navigation className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  {near.length === 0
                    ? 'No jobs in your areas right now — showing jobs further away.'
                    : 'More jobs further away.'}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">{renderCards(away, near.length)}</div>
            </>
          )}
          {!loading && near.length === 0 && away.length === 0 && (
            <EmptyState icon={SearchX}>No open shifts right now. Check back soon.</EmptyState>
          )}
        </>
      ) : (
        <>
          {!loading && shifts.length === 0 && (
            <EmptyState icon={SearchX}>
              No open shifts {filter ? `in ${filter} ` : ''}right now. Check back soon.
            </EmptyState>
          )}
          <div className="grid gap-3 md:grid-cols-2">{renderCards(shifts)}</div>
        </>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && hasMore && (
        <Button variant="outline" className="self-center" onClick={loadMore}>
          Load more
        </Button>
      )}
    </PageContainer>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

export default Dashboard;
