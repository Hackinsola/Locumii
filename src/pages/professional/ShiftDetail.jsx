import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BidButton from '@/components/shifts/BidButton';
import StatusBadge from '@/components/shifts/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useShiftBid, useSubmitBid } from '@/hooks/useBids';
import { useShift } from '@/hooks/useShifts';
import {
  useCheckInShift,
  useConfirmCompletion,
  useShiftConfirmation,
} from '@/hooks/useShiftConfirmation';
import { useShiftRating, useSubmitRating } from '@/hooks/useRatings';
import { useReleasePayment } from '@/hooks/usePayments';
import RatingForm from '@/components/ratings/RatingForm';
import { formatShiftRange } from '@/utils/dateTime';
import { calculateNet, formatNaira } from '@/utils/money';
import { COMMISSION_RATE } from '@/constants/fees';
import PageContainer from '@/components/layout/PageContainer';

function DetailRow({ label, value, mono = false, accent = false }) {
  const valueClass = [
    'text-sm',
    mono ? 'font-mono font-semibold' : '',
    accent ? 'text-brand-accent' : 'text-foreground',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function ShiftDetail() {
  const { shiftId } = useParams();
  const navigate = useNavigate();
  const { shift, loading, error, refetch: refetchShift } = useShift(shiftId);
  const { isVerified } = useAuth();
  const { bid, refetch: refetchBid } = useShiftBid(shiftId);
  const { submitBid, loading: submitting } = useSubmitBid();
  const { confirmation, refetch: refetchConfirmation } = useShiftConfirmation(shiftId);
  const { checkIn, loading: checkingIn } = useCheckInShift();
  const { confirm, loading: confirming } = useConfirmCompletion();
  const { rating, refetch: refetchRating } = useShiftRating(shiftId);
  const { submitRating, loading: ratingSubmitting } = useSubmitRating();
  const { releasePayment, loading: releasing } = useReleasePayment();
  const [bidError, setBidError] = useState(null);
  const [completionError, setCompletionError] = useState(null);
  const [payoutNote, setPayoutNote] = useState(null);
  const [ratingError, setRatingError] = useState(null);

  async function handleSubmitRating(score, comment) {
    setRatingError(null);
    const { error: submitError } = await submitRating({
      shiftId,
      rateeUserId: shift.facility_id,
      score,
      comment,
    });
    if (submitError) {
      setRatingError(submitError.message ?? 'Could not submit your rating.');
      return;
    }
    refetchRating();
  }

  async function handleSubmitBid() {
    setBidError(null);
    const { error: submitError } = await submitBid(shiftId);
    if (submitError) {
      setBidError('Could not submit your bid. Please try again.');
      return;
    }
    refetchBid();
  }

  async function handleCheckIn() {
    setCompletionError(null);
    const { error: checkInError } = await checkIn(shiftId);
    if (checkInError) {
      setCompletionError(checkInError.message ?? 'Could not check in. Please try again.');
      return;
    }
    refetchShift();
  }

  async function handleRetryPayout() {
    setPayoutNote(null);
    const { result } = await releasePayment(shiftId);
    if (result?.released || result?.alreadyReleased) {
      setPayoutNote('Your payment is on its way.');
    } else if (result?.needsBank) {
      setPayoutNote('Link your bank account below to receive payment.');
    } else if (result?.ready === false) {
      setPayoutNote('Waiting for both parties to confirm before payout.');
    } else {
      setPayoutNote('Could not process the payout yet. Please try again shortly.');
    }
  }

  async function handleConfirm() {
    setCompletionError(null);
    setPayoutNote(null);
    const { error: confirmError } = await confirm(shiftId);
    if (confirmError) {
      setCompletionError(confirmError.message ?? 'Could not confirm. Please try again.');
      return;
    }
    refetchConfirmation();
    refetchShift();
    // If this was the second confirmation, the payout runs now (idempotent no-op
    // otherwise). needsBank means this professional must link their bank to be paid.
    const { result } = await releasePayment(shiftId);
    if (result?.released || result?.alreadyReleased) {
      setPayoutNote('Shift complete — your payment is on its way.');
    } else if (result?.needsBank) {
      setPayoutNote('Shift complete. Link your bank account on the Earnings page to receive payment.');
    }
  }

  const facility = shift
    ? Array.isArray(shift.facility_profiles)
      ? shift.facility_profiles[0]
      : shift.facility_profiles
    : null;

  return (
    <PageContainer>
        <Button variant="outline" className="self-start" onClick={() => navigate('/professional/shifts')}>
          Back to shifts
        </Button>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load this shift.</p>}
        {!loading && !error && !shift && (
          <p className="text-sm text-muted-foreground">This shift is no longer available.</p>
        )}

        {shift && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{shift.role_required}</CardTitle>
                <StatusBadge status={shift.status} />
              </div>
              <CardDescription>
                <button
                  type="button"
                  onClick={() => navigate(`/facilities/${shift.facility_id}`)}
                  className="underline-offset-2 hover:underline"
                >
                  {facility?.facility_name ?? 'Facility'}
                </button>{' '}
                · {shift.city}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <DetailRow label="When" value={formatShiftRange(shift.start_time, shift.end_time)} />
              <DetailRow label="Pay" value={formatNaira(shift.pay_rate_naira)} mono />
              <DetailRow
                label={`You earn (after ${COMMISSION_RATE * 100}% platform fee)`}
                value={formatNaira(calculateNet(shift.pay_rate_naira))}
                mono
                accent
              />
              {shift.requirements && (
                <DetailRow label="Requirements" value={shift.requirements} />
              )}
              <div className="flex flex-col gap-2 border-t pt-4">
                <BidButton
                  isVerified={isVerified}
                  shiftOpen={shift.status === 'open'}
                  existingBidStatus={bid?.status ?? null}
                  submitting={submitting}
                  onSubmit={handleSubmitBid}
                />
                {bidError && <p className="text-sm text-destructive">{bidError}</p>}
              </div>

              {bid?.status === 'accepted' && (
                <div className="flex flex-col gap-2 border-t pt-4">
                  {shift.status === 'filled' && (
                    <Button onClick={handleCheckIn} disabled={checkingIn}>
                      {checkingIn ? 'Checking in…' : 'Check in'}
                    </Button>
                  )}
                  {shift.status === 'in_progress' &&
                    (confirmation?.professional_confirmed_at ? (
                      <p className="text-sm text-muted-foreground">
                        You confirmed completion — awaiting the facility.
                      </p>
                    ) : (
                      <Button onClick={handleConfirm} disabled={confirming}>
                        {confirming ? 'Confirming…' : 'Confirm completion'}
                      </Button>
                    ))}
                  {shift.status === 'completed' && (
                    <>
                      <p className="text-sm font-medium text-foreground">Shift completed.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="self-start"
                        onClick={handleRetryPayout}
                        disabled={releasing}
                      >
                        {releasing ? 'Checking…' : 'Check payout status'}
                      </Button>
                    </>
                  )}
                  {completionError && (
                    <p className="text-sm text-destructive">{completionError}</p>
                  )}
                  {payoutNote && <p className="text-sm text-muted-foreground">{payoutNote}</p>}
                </div>
              )}

              {shift.status === 'completed' && bid?.status === 'accepted' && (
                <div className="flex flex-col gap-2 border-t pt-4">
                  <span className="text-sm font-medium text-foreground">Rate the facility</span>
                  {rating ? (
                    <p className="text-sm text-muted-foreground">
                      You rated this facility {rating.score}/5.
                    </p>
                  ) : (
                    <RatingForm onSubmit={handleSubmitRating} submitting={ratingSubmitting} />
                  )}
                  {ratingError && <p className="text-sm text-destructive">{ratingError}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </PageContainer>
  );
}

export default ShiftDetail;
