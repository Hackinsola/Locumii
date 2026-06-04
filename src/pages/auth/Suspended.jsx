import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

// Shown when a signed-in user's account status is 'suspended'. The only action is
// to sign out; the route guard keeps them off the rest of the app.
function Suspended() {
  const navigate = useNavigate();
  const { logout, loading } = useAuth();

  async function handleLogout() {
    const { error } = await logout();
    if (!error) {
      navigate('/auth/login');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Account suspended</CardTitle>
          <CardDescription>
            Your account has been suspended. If you think this is a mistake, contact Locumii support.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleLogout} disabled={loading}>
            {loading ? 'Signing out…' : 'Sign out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Suspended;
