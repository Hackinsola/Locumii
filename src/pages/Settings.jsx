import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';

const MIN_PASSWORD_LENGTH = 8;

// Account settings for any signed-in user (all roles). For now: the current email
// (read-only — login is by email) and an in-app change-password form. Reuses
// useAuth().updatePassword, which calls supabase.auth.updateUser on the live session.
function Settings() {
  const { email, updatePassword, loading } = useAuth();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setDone(false);
  }

  function validate() {
    const next = {};
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
    setDone(false);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const { error } = await updatePassword(form.password);
    if (error) {
      setSubmitError(error.message ?? 'Could not update your password. Please try again.');
      return;
    }
    setForm({ password: '', confirmPassword: '' });
    setErrors({});
    setDone(true);
  }

  return (
    <PageContainer>
      <PageHeader title="Account settings" subtitle="Manage your login and security." />

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Email</span>
          <span className="text-sm text-muted-foreground">{email ?? '—'}</span>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-foreground">Change password</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Use at least {MIN_PASSWORD_LENGTH} characters.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 flex max-w-sm flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                New password
              </label>
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
                Confirm new password
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
            {done && <p className="text-sm text-status-success">Password updated.</p>}

            <Button type="submit" className="w-fit" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}

export default Settings;
