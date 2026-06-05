import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
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

// Marketing landing — a SINGLE light surface the whole way down (datafa.st / Podia /
// June / Uvodo style): floating pill nav, a centered hero with one highlighted word +
// social proof, a browser-framed product preview, value columns, how-it-works, a
// contained CTA card, and a light footer. Matte-black system with Premium Green as a
// subtle signature accent (eyebrow pill, the highlighted word, step markers).

const AVATARS = [
  'linear-gradient(135deg,#1a1a1a,#4b5563)',
  'linear-gradient(135deg,#0a3d2d,#16604a)',
  'linear-gradient(135deg,#D4900A,#E8B24A)',
  'linear-gradient(135deg,#374151,#1a1a1a)',
  'linear-gradient(135deg,#52525b,#18181b)',
];

function ValueCard({ icon: Icon, title, children }) {
  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-green/30 hover:shadow-md">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-1 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex size-9 items-center justify-center rounded-full bg-brand-green/10 font-mono text-sm font-bold text-brand-green">
        {number}
      </span>
      <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function MockStat({ label, value, icon: Icon, accent = false }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span
            className={`font-mono text-sm font-bold sm:text-base ${accent ? 'text-brand-accent' : 'text-foreground'}`}
          >
            {value}
          </span>
        </div>
        <span
          className={`flex size-6 shrink-0 items-center justify-center rounded-md ${accent ? 'bg-brand-accent/10 text-brand-accent' : 'bg-primary/10 text-primary'}`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

const MOCK_SHIFTS = [
  { role: 'Locum Doctor — GP', place: 'Garki Hospital', pay: '₦45,000' },
  { role: 'Registered Nurse', place: 'Wuse Clinic', pay: '₦28,000' },
];

function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip scroll-smooth bg-secondary text-foreground">
      {/* ── Floating pill nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        <div className="mx-auto flex h-14 w-full max-w-5xl animate-in items-center justify-between rounded-full border border-border bg-card/80 pl-5 pr-2 backdrop-blur duration-700 fade-in slide-in-from-top-2">
          <Link to="/" aria-label="Locumii home">
            <Logo />
          </Link>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {[
              { href: '#how', label: 'How it works' },
              { href: '#professionals', label: 'For professionals' },
              { href: '#facilities', label: 'For facilities' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/waitlist">Join the waitlist</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative isolate mx-auto w-full max-w-4xl px-4 pb-10 pt-16 text-center sm:pt-20">
        {/* Ambient breathing glow — atmosphere/depth behind the hero. */}
        <div
          aria-hidden="true"
          className="animate-breathe pointer-events-none absolute left-1/2 top-[-5rem] -z-10 h-[30rem] w-[42rem] max-w-[92vw] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in oklab, var(--brand-green) 32%, transparent), transparent)',
          }}
        />

        <Reveal
          as="span"
          className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 bg-brand-green/5 px-3 py-1 text-xs font-semibold text-brand-green"
        >
          {/* Live pulse — signals an active, launching marketplace. */}
          <span className="relative flex size-1.5">
            <span
              className="animate-pulse-ring absolute inline-flex size-full rounded-full bg-brand-green"
              aria-hidden="true"
            />
            <span className="relative inline-flex size-1.5 rounded-full bg-brand-green" />
          </span>
          Locum staffing · Abuja FCT
        </Reveal>

        <Reveal
          as="h1"
          delay={80}
          className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl"
        >
          Healthcare shifts, staffed and{' '}
          <span className="text-brand-green">paid</span> in one place.
        </Reveal>

        <Reveal
          as="p"
          delay={160}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Locumii connects verified Nigerian doctors, nurses, pharmacists and lab scientists with
          the clinics that need them — credentials, escrow payments and ratings built in.
        </Reveal>

        <Reveal delay={240} className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/waitlist">
              Join the waitlist
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </Reveal>

        <Reveal delay={320} className="mt-7 flex items-center justify-center gap-3">
          <div className="flex -space-x-2">
            {AVATARS.map((bg, index) => (
              <span
                key={index}
                className="size-7 rounded-full border-2 border-secondary"
                style={{ background: bg }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            Built for verified clinics &amp; locums across the FCT
          </span>
        </Reveal>

        {/* Product preview — a browser-framed snapshot of the real app, gently floating. */}
        <Reveal delay={400} className="mt-14">
          <div className="animate-float-y mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/10">
            <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
              <span className="size-3 rounded-full bg-muted-foreground/25" aria-hidden="true" />
              <span className="size-3 rounded-full bg-muted-foreground/25" aria-hidden="true" />
              <span className="size-3 rounded-full bg-muted-foreground/25" aria-hidden="true" />
              <span className="ml-3 hidden rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground sm:block">
                app.locumii.com
              </span>
            </div>
            <div className="flex flex-col gap-4 bg-secondary/60 p-4 text-left sm:p-5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-foreground/70">
                    Professional
                  </span>
                  <p className="text-sm font-bold sm:text-base">Welcome back, Amara</p>
                </div>
                <span className="hidden rounded-md bg-foreground/10 px-3 py-1.5 text-xs font-semibold sm:block">
                  Find shifts
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MockStat label="Active bids" value="3" icon={Search} />
                <MockStat label="Upcoming" value="2" icon={CalendarClock} />
                <MockStat label="Earned" value="₦128,500" icon={Wallet} accent />
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Open shifts
                </p>
                <div className="flex flex-col gap-2">
                  {MOCK_SHIFTS.map((shift) => (
                    <div
                      key={shift.role}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"
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
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Value: two audiences ──────────────────────────────────────── */}
      <section id="professionals" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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
                Funds land within 24 hours of confirmation — a flat 10% fee, no surprises.
              </ValueCard>
              <ValueCard icon={BadgeCheck} title="A verified badge">
                Upload your council licence, NYSC cert and ID once; approved in about 48 hours.
              </ValueCard>
              <ValueCard icon={Star} title="Ratings that travel">
                Build a public track record facilities can trust, shift after shift.
              </ValueCard>
            </div>
          </Reveal>

          <Reveal id="facilities" delay={120} className="flex scroll-mt-24 flex-col gap-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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
                Pay upfront into escrow; funds release only after both sides confirm completion.
              </ValueCard>
              <ValueCard icon={Star} title="No more no-shows">
                Check-in and dual confirmation keep every shift accountable.
              </ValueCard>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How it works
          </h2>
        </Reveal>
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
      </section>

      {/* ── Contained CTA card ────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:py-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Staff smarter, starting in Abuja.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-primary-foreground/80">
            Join the professionals and facilities replacing informal locum recruitment with one
            verified, accountable marketplace.
          </p>
          <div className="mt-7 flex justify-center">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/waitlist">
                Join the waitlist
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/waitlist" className="hover:text-foreground">
              Join the waitlist
            </Link>
          </div>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Locumii · Abuja, Nigeria
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
