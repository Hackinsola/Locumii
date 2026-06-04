import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Reveals its children with a fade + slide-up the first time they scroll into view
// (Clerk/ShiftKey-style section entrances). Falls back to visible immediately where
// IntersectionObserver isn't available. `delay` (ms) staggers grouped items.
function Reveal({ children, className, delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={cn(
        'transition-all duration-700 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        className
      )}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
