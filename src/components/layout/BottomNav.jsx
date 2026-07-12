import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Mobile-only bottom tab bar (hidden at md+). Renders the same role link set as the
// top nav as icon + label tabs, with the teal active treatment from ui-context.md
// (active = teal icon/label + 2px teal top border).
// Fixed h-16 so pages with their own sticky bottom bar (PostShift's publish bar)
// can stack flush above it with `bottom-16` — keep the two in sync.
function BottomNav({ links }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 border-t border-border bg-background md:hidden">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 py-2 text-[10px] font-medium',
                isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              )
            }
          >
            {Icon && <Icon className="size-5" aria-hidden="true" />}
            <span className="max-w-full truncate px-1">{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default BottomNav;
