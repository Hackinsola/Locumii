import { Outlet, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  ClipboardList,
  Compass,
  FileCheck,
  Home,
  LayoutDashboard,
  LogOut,
  Plus,
  Sparkles,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from '@/components/ui/NotificationBell';
import Logo from '@/components/layout/Logo';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

// Nav links per role. The "Dashboard" entry points at the role's actual dashboard
// path (not "/") so the NavLink active state highlights correctly. `icon` is used by
// the mobile bottom nav.
const LINKS_BY_ROLE = {
  professional: [
    { to: '/professional/dashboard', label: 'Explore', icon: Compass },
    { to: '/professional/my-shifts', label: 'My Jobs', icon: Briefcase },
    { to: '/professional/earnings', label: 'Earnings', icon: Wallet },
    { to: '/professional/profile', label: 'Profile', icon: User },
  ],
  facility: [
    { to: '/facility/dashboard', label: 'Home', icon: Home },
    { to: '/facility/shifts', label: 'Jobs', icon: Briefcase },
    { to: '/facility/post-shift', label: 'Post', icon: Plus },
    { to: '/facility/transactions', label: 'Payments', icon: Wallet },
    { to: '/facility/profile', label: 'Profile', icon: Building2 },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/credentials', label: 'Credentials', icon: FileCheck },
    { to: '/admin/facilities', label: 'Facilities', icon: Building2 },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/waitlist', label: 'Waitlist', icon: ClipboardList },
    { to: '/admin/referrals', label: 'Leads', icon: Sparkles },
  ],
};

// Layout route wrapping every authenticated page: renders the shared nav above the
// routed page. Auth + role gating still lives on each child route (ProtectedRoute),
// so this only adds chrome — and only once the user is signed in. Mounting
// useNotifications here gives the app its single realtime subscription.
function AppLayout() {
  const navigate = useNavigate();
  const { isInitialized, isAuthenticated, role, email, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!isInitialized) {
    return null;
  }

  // Signed out: render the routed child (its ProtectedRoute redirects to login).
  // No chrome until authenticated.
  if (!isAuthenticated) {
    return <Outlet />;
  }

  async function handleSignOut() {
    const { error } = await logout();
    if (!error) {
      navigate('/auth/login');
    }
  }

  async function handleNotificationClick(notification) {
    await markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  }

  const links = LINKS_BY_ROLE[role] ?? [];
  const displayName = email ? email.split('@')[0] : 'Account';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">

      <Sidebar links={links} roleLabel={role} onSignOut={handleSignOut} />

      {/* Main column — offset for the fixed sidebar on desktop. */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8">
          {/* Logo shows on mobile where the sidebar is hidden. */}
          <NavLink to="/" className="md:hidden" aria-label="Locumii home">
            <Logo />
          </NavLink>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onItemClick={handleNotificationClick}
              onMarkAllRead={markAllAsRead}
            />
            <NavLink
              to="/settings"
              aria-label="Account settings"
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-muted sm:border sm:border-border sm:pr-3"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </span>
              <div className="hidden flex-col leading-tight sm:flex">
                <span className="max-w-[10rem] truncate text-xs font-medium capitalize text-foreground">
                  {displayName}
                </span>
                <span className="text-[10px] capitalize text-muted-foreground">{role}</span>
              </div>
            </NavLink>
            {/* Sign out — mobile only (the desktop sidebar carries its own). */}
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Extra bottom padding on mobile so the fixed bottom nav never covers content. */}
        <div className="pb-16 md:pb-0">
          <Outlet />
        </div>
      </div>

      <BottomNav links={links} />
    </div>
  );
}

export default AppLayout;
