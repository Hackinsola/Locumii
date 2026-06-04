import { Link } from 'react-router-dom';
import { BadgeCheck, Lock, Wallet } from 'lucide-react';
import Logo from '@/components/layout/Logo';

// Branded split layout for every auth page (login / register / forgot / reset), so
// they share the landing's dark aesthetic instead of a bare card on white. Left = a
// dark brand panel (logo + value props + grid texture + teal glow), hidden on mobile.
// Right = the form, with a mobile-only logo and a subtle entrance animation.
const POINTS = [
  { icon: BadgeCheck, text: 'Verified professionals and facilities only.' },
  { icon: Lock, text: 'Payments held in escrow until both sides confirm.' },
  { icon: Wallet, text: 'Paid to your bank within 24 hours — a flat 10%.' },
];

function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — dark, desktop only. */}
      <div className="dark relative hidden overflow-hidden bg-background p-10 text-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-20 h-[28rem] w-[28rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07), transparent 70%)' }}
        />

        <Link to="/" className="relative" aria-label="Locumii home">
          <Logo />
        </Link>

        <div className="relative flex flex-col gap-6">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            The marketplace for Nigerian locum healthcare.
          </h2>
          <ul className="flex flex-col gap-4">
            {POINTS.map((point) => (
              <li key={point.text} className="flex items-start gap-3">
                <point.icon className="mt-0.5 size-5 shrink-0 text-foreground" aria-hidden="true" />
                <span className="text-sm text-muted-foreground">{point.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} Locumii · Abuja, Nigeria
        </p>
      </div>

      {/* Form panel. */}
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link to="/" aria-label="Locumii home">
              <Logo />
            </Link>
          </div>

          <div className="mb-6 flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
