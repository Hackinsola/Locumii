import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/components/layout/AuthLayout';
import FacilityReferralForm from '@/components/waitlist/FacilityReferralForm';
import { useWaitlist } from '@/hooks/useWaitlist';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pre-launch "Get started" destination. Captures early-access interest (email + role +
// optional name) into the Supabase waitlist table — NOT the real account/password
// signup, which lives at /auth/register and goes live at launch. Reuses AuthLayout so
// it shares the branded split-screen with the auth pages. After joining, professionals
// are prompted to nominate facilities they know (Spec 13), which moves them up the line.
function Waitlist() {
  const { join, status, position, setPosition } = useWaitlist();
  const [form, setForm] = useState({ role: '', email: '', fullName: '' });
  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    const next = {};
    if (form.role !== 'professional' && form.role !== 'facility') {
      next.role = 'Tell us whether you are a professional or a facility.';
    }
    if (!EMAIL_PATTERN.test(form.email)) {
      next.email = 'Enter a valid email address.';
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    await join({ email: form.email, fullName: form.fullName, role: form.role });
  }

  if (status === 'success') {
    return (
      <AuthLayout
        title="You're on the list"
        description="Thanks for your interest in Locumii."
        footer={
          <Link to="/" className="text-primary underline-offset-4 hover:underline">
            Back to home
          </Link>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6 text-center">
            <CheckCircle2 className="size-9 text-primary" aria-hidden="true" />
            {position !== null && (
              <p className="font-mono text-3xl font-bold tracking-tight text-foreground">
                You&rsquo;re #{position} in line
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              We&rsquo;ll email{' '}
              <span className="font-medium text-foreground">{form.email.trim()}</span> the moment
              early access opens in Abuja. No spam — just the launch.
            </p>
          </div>

          {/* Spec 13 — supply-side referral: nominate facilities to move up the line. */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/50 p-5">
            <h3 className="text-base font-semibold text-foreground">
              Know a clinic that needs locum staff?
            </h3>
            <p className="text-sm text-muted-foreground">
              Professionals like you know which clinics hire locums. Tell us about them — we&rsquo;ll
              reach out on your behalf, and you&rsquo;ll move up the waitlist for every facility you
              nominate.
            </p>
            <div className="mt-2">
              <FacilityReferralForm
                refereeEmail={form.email.trim().toLowerCase()}
                onPositionChange={setPosition}
              />
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const submitting = status === 'submitting';

  return (
    <AuthLayout
      title="Get early access"
      description="Locumii is launching soon in Abuja. Join the waitlist and we'll let you know the moment it's live."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">I am a&hellip;</span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={form.role === 'professional' ? 'default' : 'outline'}
              onClick={() => setForm((prev) => ({ ...prev, role: 'professional' }))}
            >
              Professional
            </Button>
            <Button
              type="button"
              variant={form.role === 'facility' ? 'default' : 'outline'}
              onClick={() => setForm((prev) => ({ ...prev, role: 'facility' }))}
            >
              Facility
            </Button>
          </div>
          {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Dr. Amara Okoye"
            value={form.fullName}
            onChange={handleChange}
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        )}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join the waitlist'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Waitlist;
