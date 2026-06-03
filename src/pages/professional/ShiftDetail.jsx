import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BidButton from '@/components/shifts/BidButton';
import { useAuth } from '@/hooks/useAuth';
import { useShiftBid, useSubmitBid } from '@/hooks/useBids';
import { useShift } from '@/hooks/useShifts';
import { formatShiftRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className={`text-sm text-foreground${mono ? ' font-mono font-semibold' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ShiftDetail() {
  const { shiftId } = useParams();
  const navigate = useNavigate();
  const { shift, loading, error } = useShift(shiftId);
  const { isVerified } = useAuth();
  const { bid, refetch: refetchBid } = useShiftBid(shiftId);
  const { submitBid, loading: submitting } = useSubmitBid();
  const [bidError, setBidError] = useState(null);

  async function handleSubmitBid() {
    setBidError(null);
    const { error: submitError } = await submitBid(shiftId);
    if (submitError) {
      setBidError('Could not submit your bid. Please try again.');
      return;
    }
    refetchBid();
  }

  const facility = shift
    ? Array.isArray(shift.facility_profiles)
      ? shift.facility_profiles[0]
      : shift.facility_profiles
    : null;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
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
              <CardTitle className="text-xl">{shift.role_required}</CardTitle>
              <CardDescription>
                {facility?.facility_name ?? 'Facility'} · {shift.city}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <DetailRow label="When" value={formatShiftRange(shift.start_time, shift.end_time)} />
              <DetailRow label="Pay" value={formatNaira(shift.pay_rate_naira)} mono />
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ShiftDetail;
