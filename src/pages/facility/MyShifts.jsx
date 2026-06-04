import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/shifts/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { Briefcase } from 'lucide-react';
import { useCancelShift, useFacilityShifts } from '@/hooks/useShifts';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';
import PageContainer from '@/components/layout/PageContainer';

// Cancelled shifts are intentionally omitted — the rows stay in the DB (they hold
// the payment + refund record) but are hidden from this everyday view.
const STATUS_TABS = [
  { value: 'open', label: 'Open' },
  { value: 'filled', label: 'Filled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

function MyShifts() {
  const navigate = useNavigate();
  const { shifts, loading, error, refetch } = useFacilityShifts();
  const { cancelShift, loading: cancelling } = useCancelShift();
  const [pendingCancel, setPendingCancel] = useState(null);
  const [cancelError, setCancelError] = useState(null);
  const [activeTab, setActiveTab] = useState('open');

  const activeLabel = STATUS_TABS.find((tab) => tab.value === activeTab)?.label ?? '';
  const visibleShifts = shifts.filter((shift) => shift.status === activeTab);

  async function handleConfirmCancel() {
    setCancelError(null);
    const { error: cancelErr } = await cancelShift(pendingCancel.id);
    if (cancelErr) {
      setCancelError(cancelErr.message ?? 'Could not cancel this shift.');
      setPendingCancel(null);
      return;
    }
    setPendingCancel(null);
    refetch();
  }

  return (
    <PageContainer>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-medium text-foreground">Your shifts</h1>
            <p className="text-sm text-muted-foreground">Manage bids on the shifts you’ve posted.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/facility/post-shift')}>
            Post a shift
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
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
        {!loading && !error && visibleShifts.length === 0 && (
          <EmptyState icon={Briefcase}>No {activeLabel.toLowerCase()} shifts.</EmptyState>
        )}
        {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}

        <div className="flex flex-col gap-3">
          {visibleShifts.map((shift) => (
            <Card key={shift.id}>
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
                <p className="text-sm text-muted-foreground">{shift.city}</p>
                <p className="text-sm text-muted-foreground">
                  {formatShiftRange(shift.start_time, shift.end_time)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/facility/shifts/${shift.id}/bids`)}
                  >
                    Manage bids
                  </Button>
                  {shift.status === 'open' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingCancel(shift)}
                      disabled={cancelling}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      <ConfirmModal
        isOpen={Boolean(pendingCancel)}
        title="Cancel this shift?"
        message={
          pendingCancel
            ? `${pendingCancel.role_required} on ${formatShiftRange(pendingCancel.start_time, pendingCancel.end_time)} will be cancelled and removed from the feed. You'll be refunded what you paid, minus Paystack's fees.`
            : ''
        }
        confirmLabel="Cancel shift"
        isDestructive
        busy={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </PageContainer>
  );
}

export default MyShifts;
