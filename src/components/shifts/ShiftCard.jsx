import { CalendarDays, Clock, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import InitialsAvatar from '@/components/ui/InitialsAvatar';
import StatusBadge from '@/components/shifts/StatusBadge';
import {
  formatShiftDate,
  formatTimeRange,
  shiftDurationHours,
  formatDurationHours,
} from '@/utils/dateTime';
import { formatNaira } from '@/utils/money';
import { cn } from '@/lib/utils';

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

// One job in a list — the LAI "clinic card": a circular facility mark, the facility
// name over the role, a calendar/clock meta row, and the pay in brand green with the
// per-hour breakdown beside it. Dumb presentational component: pass an embedded shift.
//   `urgent`  — red top ribbon + ring (e.g. shifts starting very soon)
//   `badge`   — show the shift StatusBadge (used in My Jobs, hidden in the open feed)
//   `footer`  — extra trailing node under the card body (e.g. a bid-status line)
function ShiftCard({ shift, urgent = false, badge = false, footer }) {
  const facility = single(shift.facility_profiles);
  const facilityName = facility?.facility_name ?? 'Facility';
  const hours = shiftDurationHours(shift.start_time, shift.end_time);
  const hourly = hours > 0 ? formatNaira(Math.round(shift.pay_rate_naira / hours)) : null;

  return (
    <Card
      className={cn(
        // Hover lift is desktop-only: on touch screens the tap-triggered hover
        // state made cards jump under the finger.
        'gap-0 py-0 transition duration-200 md:hover:-translate-y-0.5 md:hover:shadow-md',
        urgent && 'ring-2 ring-destructive/60'
      )}
    >
      {urgent && (
        <div className="flex items-center gap-1 bg-destructive px-4 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
          <Zap className="size-3" aria-hidden="true" />
          Urgent
        </div>
      )}
      <CardContent className="flex gap-3 p-4">
        <InitialsAvatar name={facilityName} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{facilityName}</h3>
              <p className="truncate text-xs text-muted-foreground">
                {shift.role_required} ·{' '}
                {facility?.address ? `${facility.address}, ${shift.city}` : shift.city}
              </p>
            </div>
            {badge && <StatusBadge status={shift.status} />}
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

          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-primary">
              {formatNaira(shift.pay_rate_naira)}
            </span>
            {hourly && (
              <span className="text-xs text-muted-foreground">
                ({formatDurationHours(shift.start_time, shift.end_time)} · {hourly}/hr)
              </span>
            )}
          </div>

          {footer}
        </div>
      </CardContent>
    </Card>
  );
}

export default ShiftCard;
