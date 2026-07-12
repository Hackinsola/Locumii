import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import FacilityShiftCard from '@/components/shifts/FacilityShiftCard';
import PageHeader from '@/components/layout/PageHeader';
import PageContainer from '@/components/layout/PageContainer';
import { useCancelShift, useFacilityShifts } from '@/hooks/useShifts';
import { formatShiftRange } from '@/utils/dateTime';
import { cn } from '@/lib/utils';

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
      setCancelError(cancelErr.message ?? 'Could not cancel this job.');
      setPendingCancel(null);
      return;
    }
    setPendingCancel(null);
    refetch();
  }

  return (
    <PageContainer>
      <PageHeader
        title="Jobs"
        subtitle="Manage applications on the jobs you’ve posted."
        actions={
          <Button onClick={() => navigate('/facility/post-shift')}>
            <Plus className="size-4" aria-hidden="true" />
            New job
          </Button>
        }
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {STATUS_TABS.map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load your jobs.</p>}
      {!loading && !error && visibleShifts.length === 0 && (
        <EmptyState icon={Briefcase}>No {activeLabel.toLowerCase()} jobs.</EmptyState>
      )}
      {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {visibleShifts.map((shift) => (
          <FacilityShiftCard
            key={shift.id}
            shift={shift}
            footer={
              <div className="mt-1 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/facility/shifts/${shift.id}/bids`)}
                >
                  Applications
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
            }
          />
        ))}
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingCancel)}
        title="Cancel this job?"
        message={
          pendingCancel
            ? `${pendingCancel.role_required} on ${formatShiftRange(pendingCancel.start_time, pendingCancel.end_time)} will be cancelled and removed from the feed. You'll be refunded what you paid, minus Paystack's fees.`
            : ''
        }
        confirmLabel="Cancel job"
        isDestructive
        busy={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </PageContainer>
  );
}

export default MyShifts;
