import {
  normalizeSchedule,
  dayKeyOf,
  dateKey,
  startOfWeekMonday,
  WEEK_DAYS,
} from '@/utils/availability';
import { cn } from '@/lib/utils';

// "My Availability" calendar from the LAI profile: a four-week Mon→Sun grid where each
// upcoming day is coloured by status — Free (open per the weekly schedule), Booked (an
// accepted shift that day), or Pending (a bid awaiting a decision). Past days are muted.
// Display-only: pass the schedule + the booked/pending date-key sets.
function AvailabilityCalendar({
  availability,
  availableForLocum = true,
  bookedDates = new Set(),
  pendingDates = new Set(),
  weeks = 4,
}) {
  const schedule = normalizeSchedule(availability);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startOfWeekMonday(today);

  const cells = Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();
    const open = availableForLocum && schedule[dayKeyOf(date)].on;
    let status = 'off';
    if (isPast) status = 'past';
    else if (bookedDates.has(key)) status = 'booked';
    else if (pendingDates.has(key)) status = 'pending';
    else if (open) status = 'free';
    return { date, key, isToday, status };
  });

  const dot = 'inline-block size-2 rounded-full';
  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn(dot, 'bg-primary')} /> Free
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn(dot, 'bg-brand-accent')} /> Booked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={cn(dot, 'border border-brand-accent bg-transparent')} /> Pending
        </span>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
        {WEEK_DAYS.map((day) => (
          <span key={day.key}>{day.short}</span>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => (
          <div key={cell.key} className="flex items-center justify-center">
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-full text-sm',
                cell.status === 'past' && 'text-muted-foreground/40',
                cell.status === 'off' && 'text-muted-foreground',
                cell.status === 'free' && 'bg-primary/15 font-medium text-foreground',
                cell.status === 'booked' && 'bg-brand-accent/20 font-semibold text-brand-accent',
                cell.status === 'pending' && 'border border-brand-accent font-medium text-foreground',
                cell.isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-card'
              )}
            >
              {cell.date.getDate()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
