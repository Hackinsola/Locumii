import { cn } from '@/lib/utils';

// One stat in a 3-4 column stats row (Shifts / Earned / Rating …) — the single
// shared implementation for every stats row in the app (was copied per-page).
// Centered icon circle, bold value, muted label. `accent` paints the value brand
// amber — reserved for money, per ui-context.md. Values must arrive already
// display-formatted; use formatNairaCompact for money so tiles never overflow
// on narrow phones (the truncate is a last-resort safety net).
function StatTile({ icon: Icon, value, label, accent = false }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 py-1 text-center">
      {Icon && (
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            accent ? 'bg-brand-accent/15 text-brand-accent' : 'bg-primary/15 text-primary'
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      )}
      <span
        className={cn(
          'max-w-full truncate text-base font-bold sm:text-lg',
          accent ? 'text-brand-accent' : 'text-foreground'
        )}
      >
        {value}
      </span>
      <span className="max-w-full truncate text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default StatTile;
