import { BadgeCheck, Clock } from 'lucide-react';

// Small verification indicator. Shows "Verified" when verified; otherwise shows
// "Pending review" when `pending` (e.g. credentials submitted but not yet
// approved); renders nothing when neither, so callers can drop it inline without
// conditionals. Dumb component — props only.
function VerifiedBadge({ verified, pending = false }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        <BadgeCheck className="size-3.5" />
        Verified
      </span>
    );
  }

  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <Clock className="size-3.5" />
        Pending review
      </span>
    );
  }

  return null;
}

export default VerifiedBadge;
