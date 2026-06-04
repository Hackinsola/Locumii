import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarX2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/shifts/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { useProfessionalBids } from '@/hooks/useBids';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';
import { shiftIcsHref } from '@/utils/calendar';
import PageContainer from '@/components/layout/PageContainer';

const BID_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Not selected',
  cancelled: 'Cancelled',
};

// Tabs segregate the professional's bids by outcome. "Not selected" groups both
// rejected and the auto-cancelled (lost-the-shift) bids.
const BID_TABS = [
  { value: 'accepted', label: 'Accepted' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Not selected' },
];

// Normalises a to-one PostgREST embed (object, or array in some shapes) to a
// single row.
function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function BidShiftCard({ bid, onView }) {
  const shift = single(bid.shifts);
  if (!shift) {
    return null;
  }
  const facility = single(shift.facility_profiles);

  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">{shift.role_required}</h3>
            <StatusBadge status={shift.status} />
          </div>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatNaira(shift.pay_rate_naira)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {facility?.facility_name ?? 'Facility'} · {shift.city}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatShiftRange(shift.start_time, shift.end_time)}
        </p>
        <p className="text-sm text-muted-foreground">
          Bid: {BID_STATUS_LABELS[bid.status] ?? bid.status}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => onView(shift.id)}>
            View shift
          </Button>
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
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Add to calendar
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MyShifts() {
  const navigate = useNavigate();
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

  function handleView(shiftId) {
    navigate(`/professional/shifts/${shiftId}`);
  }

  return (
    <PageContainer>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-medium text-foreground">Your shifts</h1>
            <p className="text-sm text-muted-foreground">
              Work you’ve been accepted for and the status of your bids.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/professional/shifts')}>
            Browse shifts
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {BID_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={activeTab === tab.value ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load your shifts.</p>}
        {!loading && !error && visibleBids.length === 0 && (
          <EmptyState icon={CalendarX2}>No shifts to show here yet.</EmptyState>
        )}

        <div className="flex flex-col gap-3">
          {visibleBids.map((bid) => (
            <BidShiftCard key={bid.id} bid={bid} onView={handleView} />
          ))}
        </div>
    </PageContainer>
  );
}

export default MyShifts;
