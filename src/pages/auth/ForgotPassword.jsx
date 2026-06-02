import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(event) {
    setEmail(event.target.value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError(null);
    if (!EMAIL_PATTERN.test(email)) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setFieldError(null);
    const { error } = await resetPassword(email.trim());
    if (error) {
      setSubmitError('Could not send the reset email. Please try again.');
      return;
    }
    // Always show the same confirmation, whether or not the account exists.
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            {submitted
              ? 'Check your inbox for the next step.'
              : 'Enter your email and we’ll send you a reset link.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="text-foreground">{email}</span>, a password
              reset link is on its way. The link expires shortly, so use it soon.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldError)}
                />
                {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/auth/login" className="text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPassword;
