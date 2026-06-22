import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import StatusBadge from '@/components/shifts/StatusBadge';
import { formatShiftDate, formatTimeRange } from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';
import { cn } from '@/lib/utils';

// A job the facility posted (its own shift — no embedded facility). Mirrors the
// professional ShiftCard but oriented around managing the post: role, location, when,
// pay, status, and an optional footer (e.g. a pending-applicants line + actions).
function FacilityShiftCard({ shift, footer, className }) {
  return (
    <Card className={cn('gap-0 py-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-md', className)}>
      <CardContent className="flex gap-3 p-4">
        <InitialsAvatar name={shift.role_required} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{shift.role_required}</h3>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {shift.city}
              </p>
            </div>
            <StatusBadge status={shift.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatShiftDate(shift.start_time)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {formatTimeRange(shift.start_time, shift.end_time)}
            </span>
          </div>

          <span className="text-base font-bold text-primary">{formatNaira(shift.pay_rate_naira)}</span>

          {footer}
        </div>
      </CardContent>
    </Card>
  );
}

export default FacilityShiftCard;
