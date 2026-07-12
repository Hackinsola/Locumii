import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationItem from '@/components/ui/NotificationItem';

// Bell + dropdown feed. Presentational: data and the read/navigate callbacks come
// from props (useNotifications owns the store/Supabase). Only the open/closed state
// is local UI state.
function NotificationBell({ notifications, unreadCount, onItemClick, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside the bell/panel.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function handleItemClick(notification) {
    setOpen(false);
    onItemClick(notification);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-4 text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        /* Mobile: full-width fixed sheet under the header (an absolute w-80
           dropdown anchored to the bell ran off the left edge of the screen).
           sm+: the usual anchored dropdown. */
        <div className="fixed inset-x-4 top-16 z-50 overflow-hidden rounded-md border border-border bg-card shadow-md sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-sm font-medium text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleItemClick(notification)}
                />
              ))}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
