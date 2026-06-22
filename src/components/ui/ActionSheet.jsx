import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// iOS-style action sheet (the LAI "Help & Support" contact picker). A dimmed backdrop
// plus a bottom-anchored panel of choices that slides up. `actions` is a list of
// { label, icon?, onSelect?, href?, tone? }. Renders nothing when closed.
function ActionSheet({ open, onClose, title, description, actions = [] }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    if (dialogRef.current) {
      const firstButton = dialogRef.current.querySelector('button, a');
      if (firstButton) {
        firstButton.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }
  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 duration-200 animate-in fade-in"
      />
      <div className="relative z-10 m-3 w-full max-w-sm overflow-hidden rounded-2xl bg-card shadow-xl duration-300 animate-in slide-in-from-bottom-4">
        {(title || description) && (
          <div className="px-5 py-4 text-center">
            {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className="flex flex-col">
          {actions.map((action) => {
            const Icon = action.icon;
            const cls = cn(
              'flex items-center justify-center gap-2 border-t border-border px-5 py-3.5 text-sm font-medium transition-colors hover:bg-muted',
              action.tone === 'danger' ? 'text-destructive' : 'text-primary'
            );
            const inner = (
              <>
                {Icon && <Icon className="size-4" aria-hidden="true" />}
                {action.label}
              </>
            );
            return action.href ? (
              <a
                key={action.label}
                href={action.href}
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className={cls}
              >
                {inner}
              </a>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  action.onSelect?.();
                  onClose();
                }}
                className={cls}
              >
                {inner}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center border-t-8 border-muted px-5 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ActionSheet;
