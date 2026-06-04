import { Info } from 'lucide-react';

// Soft informational banner (e.g. the "account under review" notice). Neutral
// semantic styling — not a hard block, and not the rejected pending/48h status
// gating (see auth-status-model decision). Dumb component.
function NoticeBanner({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export default NoticeBanner;
