import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  Hourglass,
  Info,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import BidButton from '@/components/shifts/BidButton';
import { useAuth } from '@/hooks/useAuth';
import { useShiftBid, useSubmitBid } from '@/hooks/useBids';
import { useShift } from '@/hooks/useShifts';
import {
  useCheckInShift,
  useConfirmCompletion,
  useShiftConfirmation,
} from '@/hooks/useShiftConfirmation';
import { useShiftRating, useSubmitRating } from '@/hooks/useRatings';
import { useReleasePayment, useShiftTransaction } from '@/hooks/usePayments';
import RatingForm from '@/components/ratings/RatingForm';
import {
  formatLongDate,
  formatTimeRange,
  formatDurationHours,
  shiftDurationHours,
} from '@/utils/dateTime';
import { calculateNet, formatNaira } from '@/utils/money';
import { COMMISSION_RATE } from '@/constants/fees';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';

// Coloured status strip at the top of the detail, mirroring the LAI "Application
// pending review" banner. Tone picks the text + tinted surface.
function Banner({ tone, icon: Icon, children }) {
  const tones = {
    warning: 'bg-status-warning-bg text-status-warning',
    success: 'bg-status-success-bg text-status-success',
    info: 'bg-status-info-bg text-status-info',
    neutral: 'bg-muted text-muted-foreground',
  };
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium',
        tones[tone] ?? tones.neutral
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

// One cell of the 2×2 facts grid (Date / Time / Duration / Rate).
function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted px-4 py-3">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

// Picks the contextual banner for the current bid/shift state.
function statusBanner(bid, shiftStatus) {
  if (bid?.status === 'pending') {
    return { tone: 'warning', icon: Clock, text: 'Application pending review' };
  }
  if (bid?.status === 'accepted') {
    if (shiftStatus === 'filled') {
      return { tone: 'success', icon: CheckCircle2, text: "You're booked — check in when you arrive" };
    }
    if (shiftStatus === 'in_progress') {
      return { tone: 'info', icon: Clock, text: 'Shift in progress' };
    }
    if (shiftStatus === 'completed') {
      return { tone: 'success', icon: CheckCircle2, text: 'Shift completed' };
    }
    return { tone: 'success', icon: CheckCircle2, text: 'Your bid was accepted' };
  }
  if (bid?.status === 'rejected' || bid?.status === 'cancelled') {
    return { tone: 'neutral', icon: Info, text: "This bid wasn't selected" };
  }
  if (shiftStatus && shiftStatus !== 'open') {
    return { tone: 'neutral', icon: Info, text: 'This shift is no longer open for bids' };
  }
  return null;
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
  const { transaction, refetch: refetchTransaction } = useShiftTransaction(shiftId);
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
    refetchTransaction();
    if (result?.released || result?.alreadyReleased) {
      setPayoutNote('Your payment is on its way.');
    } else if (result?.needsBank) {
      setPayoutNote('Link your bank account on the Earnings page to receive payment.');
    } else if (result?.processing) {
      setPayoutNote('Your payout is processing.');
    } else if (result?.ready === false) {
      setPayoutNote('Waiting for both parties to confirm before payout.');
    } else {
      setPayoutNote(result?.error ?? 'Could not process the payout yet. Please try again shortly.');
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
    refetchTransaction();
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
  const facilityName = facility?.facility_name ?? 'Facility';
  const banner = shift ? statusBanner(bid, shift.status) : null;
  const hours = shift ? shiftDurationHours(shift.start_time, shift.end_time) : 0;
  const hourly = hours > 0 ? formatNaira(Math.round(shift.pay_rate_naira / hours)) : '—';

  return (
    <PageContainer>
      <button
        type="button"
        onClick={() => navigate('/professional/dashboard')}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to shifts
      </button>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load this shift.</p>}
      {!loading && !error && !shift && (
        <p className="text-sm text-muted-foreground">This shift is no longer available.</p>
      )}

      {shift && (
        <>
          {banner && (
            <Banner tone={banner.tone} icon={banner.icon}>
              {banner.text}
            </Banner>
          )}

          {/* Facility header */}
          <Card>
            <CardContent className="flex items-center gap-3">
              <InitialsAvatar name={facilityName} size="lg" />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/facilities/${shift.facility_id}`)}
                  className="truncate text-left text-base font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {facilityName}
                </button>
                <p className="flex items-start gap-1 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {facility?.address ? `${facility.address}, ${shift.city}` : shift.city}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Facts + estimated pay */}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-foreground">{shift.role_required}</h2>
              <div className="grid grid-cols-2 gap-3">
                <InfoTile icon={CalendarDays} label="Date" value={formatLongDate(shift.start_time)} />
                <InfoTile
                  icon={Clock}
                  label="Time"
                  value={formatTimeRange(shift.start_time, shift.end_time)}
                />
                <InfoTile
                  icon={Hourglass}
                  label="Duration"
                  value={formatDurationHours(shift.start_time, shift.end_time)}
                />
                <InfoTile icon={Banknote} label="Rate" value={`${hourly}/hr`} />
              </div>

              <div className="rounded-xl bg-primary/10 px-4 py-3 text-center">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Estimated total pay
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatNaira(shift.pay_rate_naira)}
                </p>
                <p className="text-xs text-muted-foreground">
                  You earn {formatNaira(calculateNet(shift.pay_rate_naira))} after the{' '}
                  {COMMISSION_RATE * 100}% platform fee
                </p>
              </div>

              {shift.requirements && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Requirements
                  </span>
                  <p className="text-sm text-foreground">{shift.requirements}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Primary action */}
          <Card>
            <CardContent className="flex flex-col gap-2">
              <BidButton
                isVerified={isVerified}
                shiftOpen={shift.status === 'open'}
                existingBidStatus={bid?.status ?? null}
                submitting={submitting}
                onSubmit={handleSubmitBid}
              />
              {bidError && <p className="text-sm text-destructive">{bidError}</p>}
            </CardContent>
          </Card>

          {/* Accepted-shift lifecycle actions */}
          {bid?.status === 'accepted' && (
            <Card>
              <CardContent className="flex flex-col gap-2">
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
                    {/* Payout status from the ledger, with a retry when it didn't go through. */}
                    {transaction?.status === 'released' && (
                      <p className="text-sm text-muted-foreground">
                        You were paid {formatNaira(transaction.net_amount_naira)}
                        {transaction.released_at
                          ? ` on ${formatLongDate(transaction.released_at)}`
                          : ''}
                        .
                      </p>
                    )}
                    {transaction?.status === 'escrow' && (
                      <p className="text-sm text-muted-foreground">Your payout is processing…</p>
                    )}
                    {transaction?.status === 'failed' && (
                      <p className="text-sm text-destructive">
                        Your last payout attempt did not go through.
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
                          ? 'Checking…'
                          : transaction?.status === 'failed'
                            ? 'Retry payout'
                            : 'Check payout status'}
                      </Button>
                    )}
                  </>
                )}
                {completionError && <p className="text-sm text-destructive">{completionError}</p>}
                {payoutNote && <p className="text-sm text-muted-foreground">{payoutNote}</p>}
              </CardContent>
            </Card>
          )}

          {/* Rate the facility after completion */}
          {shift.status === 'completed' && bid?.status === 'accepted' && (
            <Card>
              <CardContent className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">Rate the facility</span>
                {rating ? (
                  <p className="text-sm text-muted-foreground">
                    You rated this facility {rating.score}/5.
                  </p>
                ) : (
                  <RatingForm onSubmit={handleSubmitRating} submitting={ratingSubmitting} />
                )}
                {ratingError && <p className="text-sm text-destructive">{ratingError}</p>}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
}

export default ShiftDetail;
