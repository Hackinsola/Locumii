import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, FileClock, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardHero from '@/components/dashboard/DashboardHero';
import PageContainer from '@/components/layout/PageContainer';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { formatNaira } from '@/utils/money';

function StatCard({ label, value, mono = false, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span className={`text-2xl font-semibold text-foreground${mono ? ' font-mono' : ''}`}>
            {value}
          </span>
        </div>
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { counts, loading, error } = useAdminDashboard();

  return (
    <PageContainer>
        <DashboardHero
          badge="Admin"
          title="Welcome back"
          subtitle="Platform overview — review credentials, verify facilities, and manage users."
        />

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load the dashboard.</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Pending credentials"
                value={counts.pendingCredentials}
                icon={FileClock}
              />
              <StatCard
                label="Pending facilities"
                value={counts.pendingFacilities}
                icon={Building2}
              />
              <StatCard label="Total users" value={counts.totalUsers} icon={Users} />
              <StatCard
                label="Total revenue"
                value={formatNaira(counts.totalRevenue)}
                mono
                icon={Wallet}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review queues</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/admin/credentials')}>
                  Credential queue
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/facilities')}>
                  Facility queue
                </Button>
                <Button variant="outline" onClick={() => navigate('/admin/users')}>
                  Manage users
                </Button>
              </CardContent>
            </Card>
          </>
        )}
    </PageContainer>
  );
}

export default Dashboard;
