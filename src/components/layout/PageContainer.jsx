import { cn } from '@/lib/utils';

// Shared content container for every authenticated app page. ONE fixed max-width plus
// responsive side gutters (16 → 24 → 32px), so every screen lines up at exactly the
// same width — uniform, intentional whitespace instead of per-page column widths.
function PageContainer({ gap = 'gap-4', className, children }) {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div
        className={cn(
          'mx-auto flex w-full max-w-4xl flex-col duration-500 animate-in fade-in',
          gap,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default PageContainer;
