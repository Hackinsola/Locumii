import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// A selectable pill (the LAI onboarding "Special Interest" / area chips). Shows a
// brand-green outline + check when selected, with a subtle press animation.
function SelectChip({ selected = false, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-95',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        className
      )}
    >
      {selected && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default SelectChip;
