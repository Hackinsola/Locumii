import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarClock,
  Lock,
  Search,
  Star,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/layout/Logo';
import Reveal from '@/components/layout/Reveal';
import StatusBadge from '@/components/shifts/StatusBadge';

// Public marketing landing for signed-out visitors at "/". Dark hero + CTA wrap their
// content in `.dark` so the semantic tokens render on pure-black surfaces (and the
// primary Button auto-inverts to white-on-black, per ui-context.md). Light sections
// use the default tokens. Teal accents use `text-brand-primary*` (stable on dark).

function ValueCard({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-foreground/20">
      <Icon className="size-5 text-brand-primary" aria-hidden="true" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-sm font-semibold text-brand-primary">{number}</span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Dark hero region (nav + hero) ─────────────────────────────── */}
      <div className="dark relative overflow-hidden bg-background text-foreground">
        {/* Faint grid texture + a soft teal glow so the dark surface has depth. */}
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
          className="pointer-events-none absolute -top-40 right-[-10%] h-[28rem] w-[28rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(11,110,110,0.22), transparent 70%)' }}
        />
        <header className="relative sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Logo />
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth/register">Get started</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-6 duration-700 animate-in fade-in slide-in-from-bottom-4">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Locum staffing · Abuja FCT
              </span>
              <h1 className="text-4xl font-bold leading-[1.03] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
                Healthcare shifts filled in{' '}
                <span className="text-brand-primary-muted">hours</span>, not WhatsApp threads.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                Locumii connects verified Nigerian doctors, nurses, pharmacists and lab scientists
                with the clinics and hospitals that need them — credentials, escrow payments and
                ratings built in.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth/register">
                    Get started
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/auth/login">I already have an account</Link>
                </Button>
              </div>
            </div>

            {/* Hero visual — a sample shift card with a soft teal glow. */}
            <div className="relative hidden delay-150 duration-700 animate-in fade-in slide-in-from-bottom-6 lg:block">
              <div
                className="absolute inset-0 -z-10 rounded-full"
                style={{ boxShadow: '0 0 80px 16px rgba(11,110,110,0.18)' }}
                aria-hidden="true"
              />
              <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">Locum Doctor — GP</h3>
                    <StatusBadge status="open" />
                  </div>
                  <span className="font-mono text-sm font-semibold text-foreground">₦45,000</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Garki Hospital · Abuja</p>
                <p className="text-sm text-muted-foreground">Sat, 8:00 AM – 8:00 PM</p>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <BadgeCheck className="size-4 text-brand-primary" aria-hidden="true" />
                  Verified facility · pays into escrow
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Trust / stats strip ───────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
          {[
            { value: '4', label: 'Professions covered' },
            { value: 'FCT', label: 'Launching in Abuja' },
            { value: '10%', label: 'Flat platform fee' },
            { value: '24h', label: 'Payout after confirmation' },
          ].map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={index * 90}
              className={`flex flex-col gap-1 py-8 ${index % 2 === 0 ? 'pr-4' : 'pl-4'} sm:items-center sm:px-4 sm:text-center`}
            >
              <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Light: value for each side ────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                For professionals
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get verified once. Bid in taps. Get paid on time.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ValueCard icon={Search} title="Browse real shifts">
                Filter open shifts by city, role, date and minimum pay — no group chats to scroll.
              </ValueCard>
              <ValueCard icon={Wallet} title="Paid to your bank">
                Funds land in your linked account within 24 hours of confirmation — a flat 10% fee,
                no surprises.
              </ValueCard>
              <ValueCard icon={BadgeCheck} title="A verified badge">
                Upload your council licence, NYSC cert and ID once; approved in about 48 hours.
              </ValueCard>
              <ValueCard icon={Star} title="Ratings that travel">
                Build a public track record facilities can trust, shift after shift.
              </ValueCard>
            </div>
          </Reveal>

          <Reveal delay={120} className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                For facilities
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Post a shift. Get qualified bids. Confirm and done.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ValueCard icon={CalendarClock} title="Post in minutes">
                Set the role, time and pay rate; reach verified professionals across the FCT.
              </ValueCard>
              <ValueCard icon={BadgeCheck} title="See real credentials">
                Every bidder is admin-verified, with licences and ratings on their profile.
              </ValueCard>
              <ValueCard icon={Lock} title="Escrow protection">
                Pay upfront into escrow; funds release to the professional only after both sides
                confirm completion.
              </ValueCard>
              <ValueCard icon={Star} title="No more no-shows">
                Check-in and dual confirmation keep every shift accountable.
              </ValueCard>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Dark: product snapshot ────────────────────────────────────── */}
      <div className="dark relative overflow-hidden border-t border-border bg-background text-foreground">
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
          className="pointer-events-none absolute -top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(11,110,110,0.18), transparent 70%)' }}
        />
        <section className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              A peek inside
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From posted shift to payout — all in one place.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              Browse and bid, track your work, and watch the money land. The whole lifecycle lives
              in one clean dashboard.
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-12 grid gap-4 lg:grid-cols-5">
            {/* Shift feed mock */}
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Open shifts</span>
                <span className="text-xs text-muted-foreground">Abuja · FCT</span>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { role: 'Locum Doctor — GP', place: 'Garki Hospital', pay: '₦45,000' },
                  { role: 'Registered Nurse', place: 'Wuse Clinic', pay: '₦28,000' },
                  { role: 'Medical Lab Scientist', place: 'Maitama Diagnostics', pay: '₦32,500' },
                ].map((shift) => (
                  <div
                    key={shift.role}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{shift.role}</span>
                        <StatusBadge status="open" />
                      </div>
                      <span className="text-xs text-muted-foreground">{shift.place}</span>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold">{shift.pay}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: earnings + verified profile */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total earned
                </span>
                <div className="mt-1 font-mono text-3xl font-bold text-brand-accent">₦128,500</div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">GP shift · paid out</span>
                  <span className="font-mono font-semibold text-brand-accent">₦40,500</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-primary/15 text-sm font-semibold text-brand-primary">
                    AN
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">Dr. Amara N.</span>
                      <BadgeCheck className="size-4 text-status-success" aria-hidden="true" />
                    </div>
                    <div className="flex items-center gap-1 text-sm text-brand-accent">
                      <Star className="size-3.5 fill-current" aria-hidden="true" />
                      <span className="font-medium">4.9</span>
                      <span className="text-xs text-muted-foreground">· 32 shifts</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2.5 text-xs text-muted-foreground">
                  <Bell className="size-4 shrink-0 text-brand-primary" aria-hidden="true" />
                  Your bid was accepted — check in on Saturday.
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* ── Light: how it works ───────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              {
                number: '01',
                title: 'Create a verified profile',
                body: 'Sign up as a professional or facility and get approved — usually within 48 hours.',
              },
              {
                number: '02',
                title: 'Post or bid on shifts',
                body: 'Facilities post and pay into escrow; professionals browse and bid in a single tap.',
              },
              {
                number: '03',
                title: 'Confirm and get paid',
                body: 'Both sides confirm the shift is done, and Locumii releases payment to the bank.',
              },
            ].map((step, index) => (
              <Reveal key={step.number} delay={index * 120}>
                <Step number={step.number} title={step.title}>
                  {step.body}
                </Step>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dark: closing CTA + footer ────────────────────────────────── */}
      <div className="dark bg-background text-foreground">
        <Reveal as="section" className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Staff smarter, starting in Abuja.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Join the professionals and facilities replacing informal locum recruitment with one
            verified, accountable marketplace.
          </p>
          <div className="mt-7 flex justify-center">
            <Button asChild size="lg">
              <Link to="/auth/register">
                Create your account
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Reveal>

        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
            <Logo />
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <Link to="/auth/login" className="hover:text-foreground">
                Sign in
              </Link>
              <Link to="/auth/register" className="hover:text-foreground">
                Get started
              </Link>
            </div>
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Locumii · Abuja, Nigeria
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Landing;
