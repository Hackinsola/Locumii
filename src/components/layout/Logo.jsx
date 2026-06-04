import { cn } from '@/lib/utils';

// Locumii wordmark — the "shift bars" mark (Concept B) + lowercase "locumii".
// The two bars are a shift metaphor: full bar = filled, shorter bar = in progress.
// Bars are always brand teal; the wordmark uses the surface foreground so it reads
// on both light (#111) and dark (#fff) surfaces. Lowercase only — never "Locumii".
function Logo({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 select-none', className)}>
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none" aria-hidden="true">
        <rect x="0" y="4" width="22" height="9" rx="3" fill="#0B6E6E" />
        <rect x="0" y="15" width="15" height="9" rx="3" fill="#0B6E6E" opacity="0.28" />
      </svg>
      <span className="text-lg font-extrabold lowercase tracking-tight text-foreground">
        locumii
      </span>
    </span>
  );
}

export default Logo;
