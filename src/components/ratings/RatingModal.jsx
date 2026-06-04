import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import RatingForm from '@/components/ratings/RatingForm';
import { formatShiftRange } from '@/utils/dateTime';

// Post-shift rating modal. Dumb component: the parent (RatingPromptBanner) owns the
// open state and the submit/skip handlers. Reuses RatingForm for the star + comment
// input rather than duplicating it. Heading is role-aware.
function RatingModal({ isOpen, shift, rateeName, raterRole, onSubmit, onSkip, submitting }) {
  // A facility rates the professional it hired; a professional rates the facility.
  const heading =
    raterRole === 'facility' ? `How did ${rateeName} perform?` : 'How was your experience?';

  function handleOpenChange(open) {
    if (!open) {
      onSkip();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{heading}</DialogTitle>
          {shift && (
            <DialogDescription>
              {shift.role_required} · {formatShiftRange(shift.start_time, shift.end_time)}
            </DialogDescription>
          )}
        </DialogHeader>
        <RatingForm onSubmit={onSubmit} submitting={submitting} />
        <button
          type="button"
          onClick={onSkip}
          className="self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Skip for now
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default RatingModal;
