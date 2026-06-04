import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import NotificationBell from '@/components/ui/NotificationBell';
import Logo from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

// Shared top navigation for every authenticated app page. Presentational: the link
// set, notification feed, and sign-out handler all come from AppLayout (which owns
// the auth/notification hooks). Light nav per Context/ui-context.md — logo #111,
// muted links, teal active state.
function AppNav({
  links,
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAllRead,
  onSignOut,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <NavLink to="/" aria-label="Locumii home">
          <Logo />
        </NavLink>

        {/* Hidden on mobile — the bottom nav carries these links there. */}
        <nav className="hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onItemClick={onNotificationClick}
            onMarkAllRead={onMarkAllRead}
          />
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppNav;
