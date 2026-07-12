import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CalendarX2 } from 'lucide-react';
import ShiftCard from '@/components/shifts/ShiftCard';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/layout/PageHeader';
import PageContainer from '@/components/layout/PageContainer';
import { useProfessionalBids } from '@/hooks/useBids';
import { shiftIcsHref } from '@/utils/calendar';
import { cn } from '@/lib/utils';

const BID_STATUS_LABELS = {
  pending: 'Pending review',
  accepted: 'Accepted',
  rejected: 'Not selected',
  cancelled: 'Cancelled',
};

// Tabs segregate the professional's bids by outcome. "Not selected" groups both
// rejected and the auto-cancelled (lost-the-shift) bids.
const BID_TABS = [
  { value: 'accepted', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Not selected' },
];

// Normalises a to-one PostgREST embed (object, or array in some shapes) to a
// single row.
function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function BidShiftCard({ bid }) {
  const shift = single(bid.shifts);
  if (!shift) {
    return null;
  }
  const facility = single(shift.facility_profiles);

  return (
    <div className="flex flex-col gap-1.5">
      <Link to={`/professional/shifts/${shift.id}`} className="block">
        <ShiftCard
          shift={shift}
          badge
          footer={
            <span className="text-xs text-muted-foreground">
              Application: {BID_STATUS_LABELS[bid.status] ?? bid.status}
            </span>
          }
        />
      </Link>
      {bid.status === 'accepted' && (
        <a
          href={shiftIcsHref({
            id: shift.id,
            summary: `${shift.role_required} at ${facility?.facility_name ?? 'facility'}`,
            startTime: shift.start_time,
            endTime: shift.end_time,
            location: shift.city,
          })}
          download="locumii-shift.ics"
          className="inline-flex items-center gap-1 self-start pl-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          <CalendarPlus className="size-3.5" aria-hidden="true" />
          Add to calendar
        </a>
      )}
    </div>
  );
}

function MyShifts() {
  const { bids, loading, error } = useProfessionalBids();
  const [activeTab, setActiveTab] = useState('accepted');

  const visibleBids = bids
    .filter((bid) =>
      activeTab === 'closed'
        ? bid.status === 'rejected' || bid.status === 'cancelled'
        : bid.status === activeTab
    )
    .sort((a, b) => {
      if (activeTab !== 'accepted') {
        return 0;
      }
      const aStart = single(a.shifts)?.start_time ?? '';
      const bStart = single(b.shifts)?.start_time ?? '';
      return aStart.localeCompare(bStart);
    });

  return (
    <PageContainer>
      <PageHeader
        title="My Jobs"
        subtitle="Shifts you’ve been accepted for and the status of your applications."
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {BID_TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load your shifts.</p>}
      {!loading && !error && visibleBids.length === 0 && (
        <EmptyState icon={CalendarX2}>
          Nothing here yet. Browse the Explore tab and apply to your first shift.
        </EmptyState>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {visibleBids.map((bid) => (
          <BidShiftCard key={bid.id} bid={bid} />
        ))}
      </div>
    </PageContainer>
  );
}

export default MyShifts;
