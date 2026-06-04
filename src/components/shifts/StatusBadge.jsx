import { cn } from '@/lib/utils';

// Shift status badge — colour-coded per Context/ui-context.md. Always paired with a
// text label (never colour alone, per the accessibility notes). Dumb: takes a shift
// status string and renders the matching pill.
const STATUS = {
  open: { label: 'Open', className: 'bg-status-success-bg text-status-success' },
  filled: { label: 'Filled', className: 'bg-status-info-bg text-status-info' },
  in_progress: { label: 'In progress', className: 'bg-status-warning-bg text-status-warning' },
  completed: { label: 'Completed', className: 'bg-status-success-bg text-status-success' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status, className }) {
  const config = STATUS[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
