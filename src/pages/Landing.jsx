import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  Lock,
  Search,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/layout/Logo';
import Reveal from '@/components/layout/Reveal';
import StatusBadge from '@/components/shifts/StatusBadge';
import { useWaitlistCount } from '@/hooks/useWaitlist';

// Only surface the live waitlist count once it's a confident number; below this we
// keep the qualitative line so a tiny early list never reads as weak social proof.
const WAITLIST_PROOF_THRESHOLD = 25;

// ── Motion helpers ───────────────────────────────────────────────────────────
// Honour the OS "reduce motion" setting so the animated counters and the live
// product preview fall back to their final/static state.
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    if (typeof matchMedia === 'undefined') {
      return undefined;
    }
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Fires once when the element first scrolls into view (used to start counters /
// the live preview only when they're actually on screen).
function useInView() {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
}

// Eases a number from 0 to `target` once `active` is true (easeOutCubic). Returns
// the final value immediately under reduced motion.
function useCountUp(target, active, durationMs = 1300) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    // Reduced motion / inactive: no animation; the value is returned directly below.
    if (!active || reduced) {
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, reduced, durationMs]);
  // Under reduced motion, skip straight to the final figure.
  return reduced ? target : value;
}

// True once the page has scrolled past `threshold` px — used to settle the
// floating nav onto a more solid background as the user leaves the hero.
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > threshold
  );
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

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

// A small pool the preview cycles through so the "Open shifts" feed reads as a
// live, working marketplace rather than a frozen screenshot.
const SHIFT_POOL = [
  { role: 'Locum Doctor — GP', place: 'Garki Hospital', pay: '₦45,000' },
  { role: 'Registered Nurse', place: 'Wuse Clinic', pay: '₦28,000' },
  { role: 'Pharmacist', place: 'Gwarinpa Pharmacy', pay: '₦32,000' },
  { role: 'Lab Scientist', place: 'Maitama Diagnostics', pay: '₦38,000' },
];

// Browser-framed snapshot of the real app. The earnings figure counts up and the
// open-shifts feed slowly rotates once the card is on screen — both static under
// reduced motion.
function ProductPreview() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const earned = useCountUp(128500, inView);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (reduced || !inView) {
      return undefined;
    }
    const id = setInterval(() => setOffset((o) => (o + 1) % SHIFT_POOL.length), 3400);
    return () => clearInterval(id);
  }, [reduced, inView]);

  const visible = [0, 1].map((i) => SHIFT_POOL[(offset + i) % SHIFT_POOL.length]);

  return (
    <div
      ref={ref}
      className="animate-float-y mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/10"
    >
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
          <MockStat label="Earned" value={`₦${earned.toLocaleString('en-NG')}`} icon={Wallet} accent />
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Open shifts
            </p>
            {/* Live pulse — the feed is updating in front of you. */}
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-green">
              <span className="relative flex size-1.5">
                <span
                  className="animate-pulse-ring absolute inline-flex size-full rounded-full bg-brand-green"
                  aria-hidden="true"
                />
                <span className="relative inline-flex size-1.5 rounded-full bg-brand-green" />
              </span>
              Live
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {visible.map((shift) => (
              <div
                key={shift.role}
                className="flex animate-in items-center justify-between gap-3 rounded-lg border border-border p-2.5 duration-500 fade-in slide-in-from-bottom-1"
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
  );
}

// A single count-up KPI in the proof band. `value` is the number to ease to;
// `prefix`/`suffix` wrap it (e.g. ₦, h, %).
function CountStat({ value, prefix = '', suffix = '', label }) {
  const [ref, inView] = useInView();
  const n = useCountUp(value, inView);
  return (
    <div ref={ref} className="flex flex-col items-center gap-1 text-center">
      <span className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {prefix}
        {n}
        {suffix}
      </span>
      <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
    </div>
  );
}

// Honest capability stats (not user counts) — confident, concrete, and true today.
const PROOF_STATS = [
  { value: 24, suffix: 'h', label: 'Typical payout' },
  { value: 10, suffix: '%', label: 'Flat platform fee' },
  { value: 48, suffix: 'h', label: 'Credential review' },
  { value: 4, suffix: '', label: 'Specialties covered' },
];

// Regulatory / payment trust — the credibility signals that matter most for a
// healthcare marketplace handling licences and money.
const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Payments secured by Paystack' },
  { icon: BadgeCheck, label: 'Credentials checked: MDCN · NYSC · CAC' },
  { icon: Lock, label: 'Funds held in escrow until confirmed' },
];

function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"
        >
          <Icon className="size-4 text-brand-green" aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

// Objection-killers, answered with concrete specifics (real councils, licence
// bodies, timeframes and fee mechanics) rather than vague reassurance.
const FAQ_ITEMS = [
  {
    q: 'How fast do I get paid?',
    a: 'Funds are released to your bank within 24 hours of both sides confirming the shift is done. A flat 10% platform fee is deducted at payout — no hidden charges, no waiting weeks for an invoice.',
  },
  {
    q: 'How are professionals verified?',
    a: 'Every professional uploads their council licence (MDCN for doctors, PCN for pharmacists, NMCN for nurses, or MLSCN for lab scientists), their NYSC certificate and a government ID. Our team reviews each one — usually within 48 hours — before they can bid on a single shift.',
  },
  {
    q: 'Is my payment protected?',
    a: 'Yes. Facilities pay the posted rate upfront into escrow the moment a shift goes live. The money is only released to the professional after both parties confirm the shift was completed — so no one ever pays for work that did not happen.',
  },
  {
    q: 'What does the 10% fee cover?',
    a: 'Credential verification, escrow handling, Paystack processing and dispute support. The facility pays the rate it posts; the professional receives that rate minus the flat 10%. No subscriptions, no per-post charges, no card on file.',
  },
  {
    q: 'Where is Locumii available?',
    a: 'We are launching in Abuja (FCT) first, across all six area councils — AMAC, Bwari, Gwagwalada, Kuje, Kwali and Abaji — covering doctors, nurses, pharmacists and medical lab scientists. Lagos and other states follow in Phase 2.',
  },
];

// Single-open accordion item with a smooth grid-rows expand (no max-height guess).
function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-semibold text-foreground">{item.q}</span>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none ${
            open ? 'rotate-180 text-brand-green' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] pb-5 opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="mx-auto max-w-3xl">
      {FAQ_ITEMS.map((item, index) => (
        <FaqItem
          key={item.q}
          item={item}
          open={openIndex === index}
          onToggle={() => setOpenIndex((current) => (current === index ? -1 : index))}
        />
      ))}
    </div>
  );
}

function Landing() {
  const scrolled = useScrolled();
  const waitlistCount = useWaitlistCount();
  // Floor to the nearest 10 so the "+" reads honestly (e.g. 47 → "40+ on the waitlist").
  const showCount = waitlistCount !== null && waitlistCount >= WAITLIST_PROOF_THRESHOLD;
  const flooredCount = showCount ? Math.floor(waitlistCount / 10) * 10 : 0;
  return (
    <div className="min-h-screen overflow-x-clip scroll-smooth bg-secondary text-foreground">
      {/* ── Floating pill nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 px-4 pt-4">
        {/* Settles onto a more solid, shadowed background once the user scrolls
            past the hero — a small premium detail. */}
        <div
          className={`mx-auto flex h-14 w-full max-w-5xl animate-in items-center justify-between rounded-full border pl-5 pr-2 backdrop-blur transition-[background-color,border-color,box-shadow] duration-500 fade-in slide-in-from-top-2 ${
            scrolled
              ? 'border-border bg-card/95 shadow-lg shadow-foreground/5'
              : 'border-border/60 bg-card/70'
          }`}
        >
          <Link to="/" aria-label="Locumii home">
            <Logo />
          </Link>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {[
              { href: '#how', label: 'How it works' },
              { href: '#professionals', label: 'For professionals' },
              { href: '#facilities', label: 'For facilities' },
              { href: '#faq', label: 'FAQ' },
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
              className="cta-sheen rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/waitlist">Join the waitlist</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative isolate mx-auto w-full max-w-4xl px-4 pb-10 pt-16 text-center sm:pt-20">
        {/* Fine dot-grid texture — quiet depth behind the hero, masked to fade out
            toward the edges so it never competes with the headline. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20"
          style={{
            backgroundImage:
              'radial-gradient(color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage:
              'radial-gradient(ellipse 58% 52% at 50% 32%, #000 25%, transparent 72%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 58% 52% at 50% 32%, #000 25%, transparent 72%)',
          }}
        />
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
          <span className="relative inline-block whitespace-nowrap text-brand-green">
            paid
            <span
              aria-hidden="true"
              className="animate-draw-underline absolute -bottom-0.5 left-0 h-[0.12em] w-full rounded-full bg-brand-green/60"
            />
          </span>{' '}
          in one place.
        </Reveal>

        <Reveal
          as="p"
          delay={160}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Locumii connects verified Nigerian doctors, nurses, pharmacists and lab scientists with
          the clinics that need them — credentials, escrow payments and ratings built in.
        </Reveal>

        <Reveal delay={240} className="mt-7 flex flex-col items-center gap-2.5">
          <Button
            asChild
            size="lg"
            className="cta-sheen bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/waitlist">
              Join the waitlist
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Free to join · Launching in Abuja, FCT first · No card required
          </p>
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
            {showCount
              ? `Join ${flooredCount.toLocaleString('en-NG')}+ professionals & clinics on the waitlist`
              : 'Built for verified clinics & locums across the FCT'}
          </span>
        </Reveal>

        {/* Product preview — a browser-framed snapshot of the real app, gently floating. */}
        <Reveal delay={400} className="relative mt-14">
          {/* Soft green glow grounding the floating card — reads as a cast light. */}
          <div
            aria-hidden="true"
            className="animate-breathe pointer-events-none absolute inset-x-8 bottom-2 top-10 -z-10 rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, color-mix(in oklab, var(--brand-green) 22%, transparent), transparent)',
            }}
          />
          <ProductPreview />
        </Reveal>

        {/* Proof band — honest, concrete capability stats that count up on view. */}
        <Reveal delay={120} className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
          {PROOF_STATS.map((stat) => (
            <CountStat
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </Reveal>

        {/* Trust strip — payment + regulatory credibility. */}
        <Reveal delay={200} className="mt-10">
          <TrustStrip />
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
                Upload your MDCN, PCN, NMCN or MLSCN licence, NYSC cert and ID once — approved in
                about 48 hours.
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
                Set the role, time and pay rate; reach verified professionals across all six FCT
                area councils.
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

      {/* ── Mission note ──────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <Reveal className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-12 sm:py-14">
          {/* Soft brand glow behind the statement. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-40 w-80 max-w-[90%] -translate-x-1/2 rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, color-mix(in oklab, var(--brand-green) 16%, transparent), transparent)',
            }}
          />
          <span
            aria-hidden="true"
            className="font-mono text-5xl leading-none text-brand-green/40"
          >
            &ldquo;
          </span>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-xl font-medium leading-relaxed tracking-tight text-foreground sm:text-2xl">
            Locum staffing in Nigeria still runs on WhatsApp groups and trust-me promises — and the
            people doing the work too often get paid late, or not at all. We&rsquo;re building
            Locumii so every professional is verified once, every shift is backed by escrow, and
            payment lands within 24 hours of the job being done. No group chats. No chasing.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-green/10 text-sm font-bold text-brand-green">
              L
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">The Locumii team</p>
              <p className="text-xs text-muted-foreground">Building locum staffing for Nigeria</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Questions, answered
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The things professionals and facilities ask us most.
          </p>
        </Reveal>
        <Reveal delay={100} className="mt-8">
          <FaqSection />
        </Reveal>
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
          <div className="mt-7 flex flex-col items-center gap-2.5">
            <Button asChild size="lg" className="cta-sheen bg-foreground text-background hover:bg-foreground/90">
              <Link to="/waitlist">
                Join the waitlist
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover/button:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
            <p className="text-xs text-primary-foreground/70">
              Be first when we launch · No card required
            </p>
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
