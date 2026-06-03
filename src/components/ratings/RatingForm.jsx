import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// Dumb 1–5 star rating form. Local UI state only; the parent passes onSubmit.
function RatingForm({ onSubmit, submitting }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);

  function handleChangeComment(event) {
    setComment(event.target.value);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (score < 1) {
      setError('Pick a star rating.');
      return;
    }
    setError(null);
    onSubmit(score, comment.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScore(value)}
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
            className="rounded-sm p-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Star
              className={
                value <= score ? 'size-6 fill-current text-foreground' : 'size-6 text-muted-foreground'
              }
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={handleChangeComment}
        placeholder="Optional comment"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="self-start" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit rating'}
      </Button>
    </form>
  );
}

export default RatingForm;
