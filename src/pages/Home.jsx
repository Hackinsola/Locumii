import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// Temporary authenticated landing. Confirms the auth loop works end-to-end and
// offers a way to sign out. Replaced by the role dashboards once they are built.
function Home() {
  const navigate = useNavigate();
  const { email, role, logout, loading } = useAuth();

  async function handleLogout() {
    const { error } = await logout();
    if (!error) {
      navigate('/auth/login');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div>
        <h1 className="text-xl font-medium text-foreground">You’re signed in to Locumii</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {email} · <span className="capitalize">{role}</span>
        </p>
      </div>
      {role === 'professional' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => navigate('/professional/onboarding')}>
            Complete your profile
          </Button>
          <Button variant="outline" onClick={() => navigate('/professional/documents')}>
            Upload documents
          </Button>
        </div>
      )}
      {role === 'facility' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => navigate('/facility/onboarding')}>
            Complete your facility profile
          </Button>
          <Button variant="outline" onClick={() => navigate('/facility/post-shift')}>
            Post a shift
          </Button>
        </div>
      )}
      {role === 'admin' && (
        <Button onClick={() => navigate('/admin/credentials')}>Review credentials</Button>
      )}
      <Button variant="outline" onClick={handleLogout} disabled={loading}>
        {loading ? 'Signing out…' : 'Sign out'}
      </Button>
      <p className="max-w-sm text-sm text-muted-foreground">
        This is a temporary home — your {role} dashboard will live here once it’s built.
      </p>
    </div>
  );
}

export default Home;
