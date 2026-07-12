import { cn } from '@/lib/utils';

// Derives up to two uppercase initials from a name or label. "Alpro Clinic" → "AC",
// "123 Child Specialist" → "1C", falling back to a neutral dash when empty.
function initialsFrom(name) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '–';
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Circular initials badge — the recurring "clinic mark" from the LAI interface, used
// on job cards, the profile header, and the shift-detail facility header. Tinted with
// the brand surface by default; pass `tone="accent"` for the amber payout context.
// Pass `src` (e.g. a professional's profile photo URL) to show the image instead;
// initials remain the fallback whenever src is absent.
function InitialsAvatar({ name, src, size = 'md', tone = 'brand', className }) {
  const sizes = {
    sm: 'size-9 text-xs',
    md: 'size-11 text-sm',
    lg: 'size-14 text-base',
    xl: 'size-20 text-2xl',
  };
  const tones = {
    brand: 'bg-primary/15 text-primary',
    accent: 'bg-brand-accent/15 text-brand-accent',
    neutral: 'bg-muted text-muted-foreground',
  };
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `Photo of ${name}` : 'Profile photo'}
        loading="lazy"
        decoding="async"
        className={cn('shrink-0 rounded-full object-cover', sizes[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizes[size],
        tones[tone],
        className
      )}
    >
      {initialsFrom(name)}
    </span>
  );
}

export default InitialsAvatar;
export { initialsFrom };
