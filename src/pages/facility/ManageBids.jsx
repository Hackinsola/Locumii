import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ConfirmModal from '@/components/ui/ConfirmModal';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import RatingStars from '@/components/profile/RatingStars';
import FacilityShiftCard from '@/components/shifts/FacilityShiftCard';
import EmptyState from '@/components/ui/EmptyState';
import { PROFESSIONAL_SPECIALTIES } from '@/constants/options';
import { useAcceptBid, useShiftBids } from '@/hooks/useBids';
import { useShift } from '@/hooks/useShifts';
import { useConfirmCompletion, useShiftConfirmation } from '@/hooks/useShiftConfirmation';
import { useShiftRating, useSubmitRating } from '@/hooks/useRatings';
import { useReleasePayment, useShiftTransaction } from '@/hooks/usePayments';
import RatingForm from '@/components/ratings/RatingForm';
import { formatNaira } from '@/utils/money';
import { formatLongDate } from '@/utils/dateTime';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';

const SPECIALTY_LABELS = Object.fromEntries(
  PROFESSIONAL_SPECIALTIES.map((item) => [item.value, item.label])
);
const BID_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Not selected',
  cancelled: 'Cancelled',
};

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

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
  const { releasePayment, loading: releasing } = useReleasePayment();
  const { transaction, refetch: refetchTransaction } = useShiftTransaction(shiftId);
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
      setActionError(acceptError.message ?? 'Could not accept this application. Please try again.');
      setPendingAccept(null);
      return;
    }
    setPendingAccept(null);
    refetchBids();
    refetchShift();
  }

  function professionalName(bid) {
    return single(bid.professional_profiles)?.full_name ?? 'this professional';
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
    refetchTransaction();
    if (result?.released || result?.alreadyReleased) {
      setPayoutNote('Job complete — payment released to the professional.');
    } else if (result?.needsBank) {
      setPayoutNote('Job complete. The professional will be paid once they link their bank account.');
    }
  }

  // Re-invokes release-payment for a completed shift whose payout didn't go
  // through (failed transfer, or the professional had no bank linked). The Edge
  // Function is idempotent, so this can never double-pay.
  async function handleRetryPayout() {
    setActionError(null);
    setPayoutNote(null);
    const { result } = await releasePayment(shiftId);
    refetchTransaction();
    if (result?.released || result?.alreadyReleased) {
      setPayoutNote('Payment released to the professional.');
    } else if (result?.needsBank) {
      setPayoutNote(
        'The professional has not linked their bank account yet — the payout will run once they do.'
      );
    } else if (result?.processing) {
      setPayoutNote('The payout is already processing.');
    } else if (result?.ready === false) {
      setPayoutNote('Waiting for both parties to confirm completion.');
    } else {
      setPayoutNote(result?.error ?? 'The payout could not be completed. Please try again.');
    }
  }

  return (
    <PageContainer>
      <button
        type="button"
        onClick={() => navigate('/facility/shifts')}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Jobs
      </button>

      {shift && <FacilityShiftCard shift={shift} />}

      {/* Completion / rating lifecycle */}
      {shift?.status === 'in_progress' && (
        <Card>
          <CardContent>
            {confirmation?.facility_confirmed_at ? (
              <p className="text-sm text-muted-foreground">
                You confirmed completion — awaiting the professional.
              </p>
            ) : (
              <Button onClick={handleConfirm} disabled={confirming}>
                {confirming ? 'Confirming…' : 'Confirm completion'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {shift?.status === 'completed' && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-status-success">
              <CheckCircle2 className="size-4" aria-hidden="true" /> Job completed.
            </p>
            {/* Payout status from the ledger, with a retry when it didn't go through. */}
            {transaction?.status === 'released' && (
              <p className="text-sm text-muted-foreground">
                {formatNaira(transaction.net_amount_naira)} was released to the professional
                {transaction.released_at ? ` on ${formatLongDate(transaction.released_at)}` : ''}.
              </p>
            )}
            {transaction?.status === 'escrow' && (
              <p className="text-sm text-muted-foreground">The payout is processing…</p>
            )}
            {transaction?.status === 'failed' && (
              <p className="text-sm text-destructive">
                The payout to the professional did not go through.
              </p>
            )}
            {transaction?.status !== 'released' && transaction?.status !== 'escrow' && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={handleRetryPayout}
                disabled={releasing}
              >
                {releasing
                  ? 'Processing…'
                  : transaction?.status === 'failed'
                    ? 'Retry payout'
                    : 'Run payout'}
              </Button>
            )}
            {acceptedProfessionalId && (
              <>
                <span className="text-sm font-medium text-foreground">Rate the professional</span>
                {rating ? (
                  <p className="text-sm text-muted-foreground">
                    You rated this professional {rating.score}/5.
                  </p>
                ) : (
                  <RatingForm onSubmit={handleSubmitRating} submitting={ratingSubmitting} />
                )}
                {ratingError && <p className="text-sm text-destructive">{ratingError}</p>}
              </>
            )}
          </CardContent>
        </Card>
      )}
      {payoutNote && <p className="text-sm text-muted-foreground">{payoutNote}</p>}

      {/* Applicants */}
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground">
          {bids.length} application{bids.length === 1 ? '' : 's'}
        </h2>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading applications…</p>}
      {error && <p className="text-sm text-destructive">Could not load applications.</p>}
      {!loading && !error && bids.length === 0 && (
        <EmptyState icon={Users}>No applications on this job yet.</EmptyState>
      )}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="flex flex-col gap-3">
        {bids.map((bid) => {
          const professional = single(bid.professional_profiles);
          return (
            <Card key={bid.id}>
              <CardContent className="flex items-center gap-3">
                <InitialsAvatar name={professional?.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/professionals/${bid.professional_id}`)}
                    className="block truncate text-left text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                  >
                    {professional?.full_name ?? 'Professional'}
                  </button>
                  <p className="truncate text-xs text-muted-foreground">
                    {professional?.specialty
                      ? SPECIALTY_LABELS[professional.specialty] ?? professional.specialty
                      : 'Professional'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <VerifiedBadge verified={professional?.is_verified} />
                    {professional?.avg_rating != null && (
                      <RatingStars value={professional.avg_rating} showNumber />
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {shiftOpen && bid.status === 'pending' ? (
                    <Button size="sm" onClick={() => setPendingAccept(bid)} disabled={accepting}>
                      Accept
                    </Button>
                  ) : (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        bid.status === 'accepted'
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {BID_STATUS_LABELS[bid.status] ?? bid.status}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingAccept)}
        title="Accept this application?"
        message={
          pendingAccept
            ? `Accepting ${professionalName(pendingAccept)} will decline all other applications on this job.`
            : ''
        }
        confirmLabel="Accept"
        busy={accepting}
        onConfirm={handleConfirmAccept}
        onCancel={() => setPendingAccept(null)}
      />
    </PageContainer>
  );
}

export default ManageBids;
