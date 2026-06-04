import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { useAcceptBid, useShiftBids } from '@/hooks/useBids';
import { useShift } from '@/hooks/useShifts';
import { useConfirmCompletion, useShiftConfirmation } from '@/hooks/useShiftConfirmation';
import { useShiftRating, useSubmitRating } from '@/hooks/useRatings';
import { useReleasePayment } from '@/hooks/usePayments';
import RatingForm from '@/components/ratings/RatingForm';
import StatusBadge from '@/components/shifts/StatusBadge';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';
import PageContainer from '@/components/layout/PageContainer';

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
  const { rating, refetch: refetchRating } = useShiftRating(shiftId);
  const { submitRating, loading: ratingSubmitting } = useSubmitRating();
  const { releasePayment } = useReleasePayment();
  const [actionError, setActionError] = useState(null);
  const [ratingError, setRatingError] = useState(null);
  const [payoutNote, setPayoutNote] = useState(null);
  const [pendingAccept, setPendingAccept] = useState(null);

  const shiftOpen = shift?.status === 'open';
  const acceptedProfessionalId = bids.find((bid) => bid.status === 'accepted')?.professional_id ?? null;

  async function handleSubmitRating(score, comment) {
    setRatingError(null);
    const { error: submitError } = await submitRating({
      shiftId,
      rateeUserId: acceptedProfessionalId,
      score,
      comment,
    });
    if (submitError) {
      setRatingError(submitError.message ?? 'Could not submit your rating.');
      return;
    }
    refetchRating();
  }

  async function handleConfirmAccept() {
    setActionError(null);
    const { error: acceptError } = await acceptBid(pendingAccept.id);
    if (acceptError) {
      setActionError(acceptError.message ?? 'Could not accept this bid. Please try again.');
      setPendingAccept(null);
      return;
    }
    setPendingAccept(null);
    refetchBids();
    refetchShift();
  }

  function professionalName(bid) {
    const professional = Array.isArray(bid.professional_profiles)
      ? bid.professional_profiles[0]
      : bid.professional_profiles;
    return professional?.full_name ?? 'this professional';
  }

  async function handleConfirm() {
    setActionError(null);
    setPayoutNote(null);
    const { error: confirmError } = await confirm(shiftId);
    if (confirmError) {
      setActionError(confirmError.message ?? 'Could not confirm completion. Please try again.');
      return;
    }
    refetchConfirmation();
    refetchShift();
    // Second confirmation triggers the payout (idempotent no-op otherwise).
    const { result } = await releasePayment(shiftId);
    if (result?.released || result?.alreadyReleased) {
      setPayoutNote('Shift complete — payment released to the professional.');
    } else if (result?.needsBank) {
      setPayoutNote(
        'Shift complete. The professional will be paid once they link their bank account.'
      );
    }
  }

  return (
    <PageContainer>
        <Button variant="outline" className="self-start" onClick={() => navigate('/facility/shifts')}>
          Back to your shifts
        </Button>

        {shift && (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium text-foreground">{shift.role_required}</h1>
              <StatusBadge status={shift.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatShiftRange(shift.start_time, shift.end_time)} ·{' '}
              <span className="font-mono">{formatNaira(shift.pay_rate_naira)}</span>
            </p>
          </div>
        )}

        {!loading && !error && bids.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {bids.length} {bids.length === 1 ? 'professional has' : 'professionals have'} bid on this
            shift.
          </p>
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
        {payoutNote && <p className="text-sm text-muted-foreground">{payoutNote}</p>}

        {shift?.status === 'completed' && acceptedProfessionalId && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Rate the professional</span>
            {rating ? (
              <p className="text-sm text-muted-foreground">
                You rated this professional {rating.score}/5.
              </p>
            ) : (
              <RatingForm onSubmit={handleSubmitRating} submitting={ratingSubmitting} />
            )}
            {ratingError && <p className="text-sm text-destructive">{ratingError}</p>}
          </div>
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
                    <button
                      type="button"
                      onClick={() => navigate(`/professionals/${bid.professional_id}`)}
                      className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {professional?.full_name ?? 'Professional'}
                      {professional?.is_verified ? ' · Verified' : ''}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {professional?.specialty
                        ? SPECIALTY_LABELS[professional.specialty] ?? professional.specialty
                        : 'Professional'}{' '}
                      · {BID_STATUS_LABELS[bid.status] ?? bid.status}
                    </p>
                  </div>
                  {shiftOpen && bid.status === 'pending' && (
                    <Button size="sm" onClick={() => setPendingAccept(bid)} disabled={accepting}>
                      Accept
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

      <ConfirmModal
        isOpen={Boolean(pendingAccept)}
        title="Accept this bid?"
        message={
          pendingAccept
            ? `Accepting ${professionalName(pendingAccept)} will decline all other bids on this shift.`
            : ''
        }
        confirmLabel="Accept bid"
        busy={accepting}
        onConfirm={handleConfirmAccept}
        onCancel={() => setPendingAccept(null)}
      />
    </PageContainer>
  );
}

export default ManageBids;
