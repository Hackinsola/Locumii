import { Star } from 'lucide-react';

// Read-only 1–5 star display. `value` is the average (or a single score); it is
// rounded to the nearest whole star for the icons. Renders an "unrated" hint when
// value is null/undefined. Pass `reviewCount` to append "· N reviews" (Spec 11).
// Dumb component — no data fetching, no state.
function RatingStars({ value, showNumber = true, reviewCount }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted-foreground">Not yet rated</span>;
  }

  const rounded = Math.round(value);

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((position) => (
          <Star
            key={position}
            className={
              position <= rounded
                ? 'size-4 fill-current text-foreground'
                : 'size-4 text-muted-foreground'
            }
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-sm font-medium text-foreground">{Number(value).toFixed(1)}</span>
      )}
      {reviewCount > 0 && (
        <span className="text-sm text-muted-foreground">
          · {reviewCount} review{reviewCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}

export default RatingStars;
