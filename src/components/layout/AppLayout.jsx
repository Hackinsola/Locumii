import { Outlet, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  CalendarCheck,
  FileCheck,
  LayoutDashboard,
  Plus,
  Receipt,
  Search,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import AppNav from './AppNav';
import BottomNav from './BottomNav';

// Nav links per role. The "Dashboard" entry points at the role's actual dashboard
// path (not "/") so the NavLink active state highlights correctly. `icon` is used by
// the mobile bottom nav.
const LINKS_BY_ROLE = {
  professional: [
    { to: '/professional/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/professional/shifts', label: 'Find shifts', icon: Search },
    { to: '/professional/my-shifts', label: 'My shifts', icon: CalendarCheck },
    { to: '/professional/earnings', label: 'Earnings', icon: Wallet },
    { to: '/professional/profile', label: 'Profile', icon: User },
  ],
  facility: [
    { to: '/facility/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/facility/post-shift', label: 'Post shift', icon: Plus },
    { to: '/facility/shifts', label: 'My shifts', icon: Briefcase },
    { to: '/facility/transactions', label: 'Transactions', icon: Receipt },
    { to: '/facility/profile', label: 'Profile', icon: Building2 },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/credentials', label: 'Credentials', icon: FileCheck },
    { to: '/admin/facilities', label: 'Facilities', icon: Building2 },
    { to: '/admin/users', label: 'Users', icon: Users },
  ],
};

// Layout route wrapping every authenticated page: renders the shared nav above the
// routed page. Auth + role gating still lives on each child route (ProtectedRoute),
// so this only adds chrome — and only once the user is signed in. Mounting
// useNotifications here gives the app its single realtime subscription.
function AppLayout() {
  const navigate = useNavigate();
  const { isInitialized, isAuthenticated, role, logout } = useAuth();
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

  return (
    <div
      className="min-h-screen bg-muted/40"
      style={{
        backgroundImage: 'radial-gradient(rgba(11,110,110,0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <AppNav
        links={links}
        notifications={notifications}
        unreadCount={unreadCount}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={markAllAsRead}
        onSignOut={handleSignOut}
      />
      {/* Extra bottom padding on mobile so the fixed bottom nav never covers content. */}
      <div className="pb-16 md:pb-0">
        <Outlet />
      </div>
      <BottomNav links={links} />
    </div>
  );
}

export default AppLayout;
