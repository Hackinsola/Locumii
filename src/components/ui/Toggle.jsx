import { cn } from '@/lib/utils';

// Accessible on/off switch with the brand-green track (the LAI "Available for Locum"
// control). Controlled: pass `checked` and an `onChange(next)` handler.
function Toggle({ checked, onChange, label, disabled = false, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        checked ? 'bg-primary' : 'bg-input',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span
        className={cn(
          'inline-block size-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export default Toggle;
