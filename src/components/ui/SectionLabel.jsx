import { cn } from '@/lib/utils';

// Small uppercase, letter-spaced grey label that heads a section (the Uvodo / Origin
// "PRODUCT", "MEDIA", "PRICING" pattern). Replaces ad-hoc bold sub-headings.
function SectionLabel({ children, className }) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className
      )}
    >
      {children}
    </p>
  );
}

export default SectionLabel;
