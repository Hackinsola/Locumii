import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

// Fixed left sidebar — the primary desktop navigation (hidden below md, where the
// BottomNav takes over). Logo at the top, role nav links with a tinted teal active
// state, and a sign-out action pinned to the bottom.
function Sidebar({ links, roleLabel, onSignOut }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background md:flex">
      <div className="flex h-14 items-center gap-2 px-6">
        <NavLink to="/" aria-label="Locumii home">
          <Logo />
        </NavLink>
      </div>

      {roleLabel && (
        <div className="px-6 pb-2">
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
            {roleLabel}
          </span>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              {Icon && <Icon className="size-5 shrink-0" aria-hidden="true" />}
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
