import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AuthLayout from '@/components/layout/AuthLayout';
import { useAuth } from '@/hooks/useAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Nigerian mobile number: local 11-digit form (0 then 7/8/9, e.g. 08012345678)
// or the +234 international equivalent (e.g. +2348012345678).
const PHONE_PATTERN = /^(0[789]\d{9}|\+234[789]\d{9})$/;
const MIN_PASSWORD_LENGTH = 8;

function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    role: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function selectRole(role) {
    setForm((prev) => ({ ...prev, role }));
  }

  function validate() {
    const next = {};
    if (form.role !== 'professional' && form.role !== 'facility') {
      next.role = 'Select whether you are a professional or a facility.';
    }
    if (!EMAIL_PATTERN.test(form.email)) {
      next.email = 'Enter a valid email address.';
    }
    if (!PHONE_PATTERN.test(form.phone.trim())) {
      next.phone = 'Enter a valid Nigerian phone number, e.g. 08012345678 or +2348012345678.';
    }
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Passwords do not match.';
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const { error } = await register({
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      phone: form.phone.trim(),
    });
    if (error) {
      setSubmitError(error.message ?? 'Could not create your account. Please try again.');
      return;
    }
    navigate('/');
  }

  return (
    <AuthLayout
      title="Create your Locumii account"
      description="Join as a healthcare professional or a facility."
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
                  onClick={() => selectRole('professional')}
                >
                  Professional
                </Button>
                <Button
                  type="button"
                  variant={form.role === 'facility' ? 'default' : 'outline'}
                  onClick={() => selectRole('facility')}
                >
                  Facility
                </Button>
              </div>
              {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">Phone number</label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+2348012345678"
                value={form.phone}
                onChange={handleChange}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Register;
