import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// One quick-stat tile for the dashboards. Dumb component: the parent passes an
// already-formatted value (e.g. formatNaira(kobo) for money, a number for counts).
// `mono` renders the value in the monospace face, matching how pay is shown elsewhere.
// `accent` paints the value brand amber — reserved for the professional's earnings
// (money they receive), per ui-context.md. `icon` is a lucide component shown in a
// tinted chip for visual interest.
function StatCard({ label, value, mono = false, accent = false, icon: Icon }) {
  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start justify-between gap-2 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <span
            className={cn(
              'text-lg font-semibold',
              mono && 'font-mono',
              accent ? 'text-brand-accent' : 'text-foreground'
            )}
          >
            {value}
          </span>
        </div>
        {Icon && (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              accent ? 'bg-brand-accent/10 text-brand-accent' : 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
