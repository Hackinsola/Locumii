import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/dateTime';

// Emoji per notification type (SVG-free, matches the spec's icon set). Falls back to
// a bell for any type not listed.
const ICONS = {
  credential_approved: '✅',
  credential_rejected: '📋',
  bid_accepted: '🤝',
  bid_declined: '📋',
  facility_verified: '✅',
  payment_released: '💳',
  shift_reminder: '⏰',
};

// One row in the notification dropdown. Presentational: the parent passes the
// notification and an onClick that marks it read + navigates.
function NotificationItem({ notification, onClick }) {
  const { type, title, body, is_read, created_at } = notification;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-accent',
        is_read ? 'bg-muted' : 'bg-card'
      )}
    >
      <span className="text-lg leading-none" aria-hidden="true">
        {ICONS[type] ?? '🔔'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(created_at)}
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
      </span>
    </button>
  );
}

export default NotificationItem;
