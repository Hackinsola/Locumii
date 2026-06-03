import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { useAcceptBid, useShiftBids } from '@/hooks/useBids';
import { useShift } from '@/hooks/useShifts';
import { useConfirmCompletion, useShiftConfirmation } from '@/hooks/useShiftConfirmation';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';

const SPECIALTY_LABELS = Object.fromEntries(
  PROFESSIONAL_SPECIALTIES.map((item) => [item.value, item.label])
);
const BID_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function ManageBids() {
  const { shiftId } = useParams();
  const navigate = useNavigate();
  const { shift, refetch: refetchShift } = useShift(shiftId);
  const { bids, loading, error, refetch: refetchBids } = useShiftBids(shiftId);
  const { acceptBid, loading: accepting } = useAcceptBid();
  const { confirmation, refetch: refetchConfirmation } = useShiftConfirmation(shiftId);
  const { confirm, loading: confirming } = useConfirmCompletion();
  const [actionError, setActionError] = useState(null);

  const shiftOpen = shift?.status === 'open';

  async function handleAccept(bidId) {
    setActionError(null);
    const { error: acceptError } = await acceptBid(bidId);
    if (acceptError) {
      setActionError(acceptError.message ?? 'Could not accept this bid. Please try again.');
      return;
    }
    refetchBids();
    refetchShift();
  }

  async function handleConfirm() {
    setActionError(null);
    const { error: confirmError } = await confirm(shiftId);
    if (confirmError) {
      setActionError(confirmError.message ?? 'Could not confirm completion. Please try again.');
      return;
    }
    refetchConfirmation();
    refetchShift();
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Button variant="outline" className="self-start" onClick={() => navigate('/facility/shifts')}>
          Back to your shifts
        </Button>

        {shift && (
          <div>
            <h1 className="text-xl font-medium text-foreground">{shift.role_required}</h1>
            <p className="text-sm text-muted-foreground">
              {formatShiftRange(shift.start_time, shift.end_time)} ·{' '}
              <span className="font-mono">{formatNaira(shift.pay_rate_naira)}</span> ·{' '}
              <span className="capitalize">{shift.status}</span>
            </p>
          </div>
        )}

        {shift?.status === 'in_progress' &&
          (confirmation?.facility_confirmed_at ? (
            <p className="text-sm text-muted-foreground">
              You confirmed completion — awaiting the professional.
            </p>
          ) : (
            <Button className="self-start" onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Confirming…' : 'Confirm completion'}
            </Button>
          ))}
        {shift?.status === 'completed' && (
          <p className="text-sm font-medium text-foreground">Shift completed.</p>
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading bids…</p>}
        {error && <p className="text-sm text-destructive">Could not load bids.</p>}
        {!loading && !error && bids.length === 0 && (
          <p className="text-sm text-muted-foreground">No bids on this shift yet.</p>
        )}
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        <div className="flex flex-col gap-3">
          {bids.map((bid) => {
            const professional = Array.isArray(bid.professional_profiles)
              ? bid.professional_profiles[0]
              : bid.professional_profiles;
            return (
              <Card key={bid.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {professional?.full_name ?? 'Professional'}
                      {professional?.is_verified ? ' · Verified' : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {professional?.specialty
                        ? SPECIALTY_LABELS[professional.specialty] ?? professional.specialty
                        : 'Professional'}{' '}
                      · {BID_STATUS_LABELS[bid.status] ?? bid.status}
                    </p>
                  </div>
                  {shiftOpen && bid.status === 'pending' && (
                    <Button size="sm" onClick={() => handleAccept(bid.id)} disabled={accepting}>
                      Accept
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ManageBids;
