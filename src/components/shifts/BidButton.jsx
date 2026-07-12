import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const BID_STATUS_LABELS = {
  pending: 'Bid submitted — awaiting the facility’s decision',
  accepted: 'Your bid was accepted',
  rejected: 'Your bid was not selected',
  cancelled: 'Your bid was cancelled',
};

// Dumb bid control. The parent (ShiftDetail) owns the data and passes state +
// an onSubmit callback; this only decides which affordance to show.
function BidButton({ isVerified, shiftOpen, existingBidStatus, submitting, onSubmit }) {
  if (existingBidStatus) {
    return (
      <p className="text-sm font-medium text-foreground">
        {BID_STATUS_LABELS[existingBidStatus] ?? 'Bid submitted'}
      </p>
    );
  }
  if (!shiftOpen) {
    return <p className="text-sm text-muted-foreground">This shift is no longer open for bids.</p>;
  }
  if (!isVerified) {
    return (
      <div className="flex flex-col gap-1">
        <Button disabled>Submit bid</Button>
        <p className="text-sm text-muted-foreground">
          Your account must be verified before you can bid —{' '}
          <Link
            to="/professional/documents"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            check your documents
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <Button onClick={onSubmit} disabled={submitting}>
      {submitting ? 'Submitting…' : 'Submit bid'}
    </Button>
  );
}

export default BidButton;
