import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Account settings for any signed-in user (all roles): change login email and
// password in-app. Reuses useAuth().updateEmail / updatePassword (both call
// supabase.auth.updateUser on the live session). Each section tracks its own busy
// state so submitting one doesn't disable the other.
function Settings() {
  const { email, updateEmail, updatePassword } = useAuth();

  // Change email.
  const [newEmail, setNewEmail] = useState('');
  const [emailFieldError, setEmailFieldError] = useState(null);
  const [emailError, setEmailError] = useState(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Change password.
  const [pw, setPw] = useState({ password: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwError, setPwError] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setEmailFieldError(null);
    setEmailError(null);
    setEmailSent(false);
    const trimmed = newEmail.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailFieldError('Enter a valid email address.');
      return;
    }
    if (trimmed.toLowerCase() === (email ?? '').toLowerCase()) {
      setEmailFieldError('That is already your email.');
      return;
    }
    setEmailBusy(true);
    const { error } = await updateEmail(trimmed);
    setEmailBusy(false);
    if (error) {
      setEmailError(error.message ?? 'Could not start the email change. Please try again.');
      return;
    }
    setEmailSent(true);
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPwError(null);
    setPwDone(false);
    const errs = {};
    if (pw.password.length < MIN_PASSWORD_LENGTH) {
      errs.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (pw.confirmPassword !== pw.password) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) {
      return;
    }
    setPwBusy(true);
    const { error } = await updatePassword(pw.password);
    setPwBusy(false);
    if (error) {
      setPwError(error.message ?? 'Could not update your password. Please try again.');
      return;
    }
    setPw({ password: '', confirmPassword: '' });
    setPwErrors({});
    setPwDone(true);
  }

  return (
    <PageContainer>
      <PageHeader title="Account settings" subtitle="Manage your login and security." />

      {/* Change email */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Email</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          You currently sign in with{' '}
          <span className="font-medium text-foreground">{email ?? '—'}</span>.
        </p>
        <form onSubmit={handleEmailSubmit} className="mt-4 flex max-w-sm flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="newEmail" className="text-sm font-medium text-foreground">
              New email
            </label>
            <Input
              id="newEmail"
              name="newEmail"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => {
                setNewEmail(event.target.value);
                setEmailSent(false);
              }}
              aria-invalid={Boolean(emailFieldError)}
            />
            {emailFieldError && <p className="text-sm text-destructive">{emailFieldError}</p>}
          </div>
          {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          {emailSent && (
            <p className="text-sm text-status-success">
              Confirmation link sent. Open it from {newEmail.trim()} (check your current inbox too)
              to finish the change.
            </p>
          )}
          <Button type="submit" variant="outline" className="w-fit" disabled={emailBusy}>
            {emailBusy ? 'Sending…' : 'Change email'}
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-foreground">Change password</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Use at least {MIN_PASSWORD_LENGTH} characters.
        </p>
        <form onSubmit={handlePasswordSubmit} className="mt-4 flex max-w-sm flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              New password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={pw.password}
              onChange={(event) => setPw((prev) => ({ ...prev, password: event.target.value }))}
              aria-invalid={Boolean(pwErrors.password)}
            />
            {pwErrors.password && <p className="text-sm text-destructive">{pwErrors.password}</p>}
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
              value={pw.confirmPassword}
              onChange={(event) =>
                setPw((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              aria-invalid={Boolean(pwErrors.confirmPassword)}
            />
            {pwErrors.confirmPassword && (
              <p className="text-sm text-destructive">{pwErrors.confirmPassword}</p>
            )}
          </div>

          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          {pwDone && <p className="text-sm text-status-success">Password updated.</p>}

          <Button type="submit" className="w-fit" disabled={pwBusy}>
            {pwBusy ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </PageContainer>
  );
}

export default Settings;
