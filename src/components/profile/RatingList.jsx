import { formatDate } from '@/utils/dateTime';
import RatingStars from '@/components/profile/RatingStars';

// Renders a user's received-ratings history. Dumb component — the parent passes
// the already-fetched `ratings` array; this only formats and lays them out.
function RatingList({ ratings }) {
  if (!ratings || ratings.length === 0) {
    return <p className="text-sm text-muted-foreground">No ratings yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {ratings.map((rating) => (
        <li key={rating.id} className="flex flex-col gap-1 border-b pb-4 last:border-b-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <RatingStars value={rating.score} showNumber={false} />
            <span className="text-xs text-muted-foreground">{formatDate(rating.created_at)}</span>
          </div>
          {rating.comment && <p className="text-sm text-foreground">{rating.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

export default RatingList;
