import { cn } from '@/lib/utils';

// Colored welcome banner at the top of each dashboard (the modern admin-dashboard
// pattern). Vibrant-green brand surface with dark text, an optional role badge, a
// heading + subtitle, and an optional action node (e.g. a white CTA button) pinned right.
function DashboardHero({ badge, title, subtitle, action, className }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-primary px-5 py-5 text-primary-foreground sm:px-6 sm:py-6',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          {badge && (
            <span className="w-fit rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-semibold capitalize">
              {badge}
            </span>
          )}
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle && (
            <p className="max-w-xl text-sm leading-snug text-primary-foreground/80">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export default DashboardHero;
