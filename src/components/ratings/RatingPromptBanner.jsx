import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import RatingModal from '@/components/ratings/RatingModal';
import { useSubmitRating } from '@/hooks/useRatings';

// Proactive "you have shifts to rate" prompt for the dashboard (Home). Steps the
// user through their pending ratings one modal at a time. Submitting inserts the
// rating; skipping just dismisses that shift for this session (no row written) — the
// shift stays rateable inline later. `pending` comes from usePendingRatings; onRefetch
// re-pulls it from the server after a successful submit.
function RatingPromptBanner({ pending, onRefetch }) {
  const { submitRating, loading } = useSubmitRating();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [submitError, setSubmitError] = useState(null);

  // Items still worth showing this session (not skipped).
  const visible = pending.filter((item) => !dismissed.has(item.shift.id));
  const active = visible[0] ?? null;

  if (visible.length === 0) {
    return null;
  }

  function dismiss(shiftId) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(shiftId);
      return next;
    });
  }

  async function handleSubmit(score, comment) {
    if (!active) {
      return;
    }
    setSubmitError(null);
    const { error } = await submitRating({
      shiftId: active.shift.id,
      rateeUserId: active.rateeUserId,
      score,
      comment,
    });
    if (error) {
      setSubmitError(error.message ?? 'Could not submit your rating.');
      return;
    }
    // Drop the rated shift locally, then re-sync from the server. Close the modal
    // when nothing is left to rate.
    dismiss(active.shift.id);
    if (visible.length <= 1) {
      setOpen(false);
    }
    onRefetch?.();
  }

  function handleSkip() {
    if (active) {
      dismiss(active.shift.id);
    }
    if (visible.length <= 1) {
      setOpen(false);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              You have {visible.length} shift{visible.length > 1 ? 's' : ''} to rate
            </span>
            <span className="text-sm text-muted-foreground">
              Your feedback helps the community.
            </span>
            {submitError && <span className="text-sm text-destructive">{submitError}</span>}
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            Rate now
          </Button>
        </CardContent>
      </Card>

      <RatingModal
        isOpen={open && Boolean(active)}
        shift={active?.shift}
        rateeName={active?.rateeName}
        raterRole={active?.raterRole}
        submitting={loading}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
      />
    </>
  );
}

export default RatingPromptBanner;
