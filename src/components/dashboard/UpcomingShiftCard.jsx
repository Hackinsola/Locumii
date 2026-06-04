import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { formatShiftRange, formatCountdown } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';

// The professional's next confirmed shift, with a countdown. Dumb component — the
// parent passes the already-embedded shift + facility.
function UpcomingShiftCard({ shift, facility }) {
  if (!shift) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">{shift.role_required}</h3>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatNaira(shift.pay_rate_naira)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {facility?.facility_name ?? 'Facility'} · {shift.city}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatShiftRange(shift.start_time, shift.end_time)}
        </p>
        <p className="text-sm font-medium text-primary">{formatCountdown(shift.start_time)}</p>
        <Link
          to={`/professional/shifts/${shift.id}`}
          className="mt-1 self-start text-sm text-primary underline-offset-4 hover:underline"
        >
          View details
        </Link>
      </CardContent>
    </Card>
  );
}

export default UpcomingShiftCard;
