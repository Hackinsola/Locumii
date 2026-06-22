import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, FileClock, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardHero from '@/components/dashboard/DashboardHero';
import PageContainer from '@/components/layout/PageContainer';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { formatNaira } from '@/utils/money';
import { cn } from '@/lib/utils';

function StatCard({ label, value, icon: Icon, accent = false }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span className={cn('text-2xl font-bold', accent ? 'text-brand-accent' : 'text-foreground')}>
            {value}
          </span>
        </div>
        {Icon && (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              accent ? 'bg-brand-accent/15 text-brand-accent' : 'bg-primary/15 text-primary'
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function QueueRow({ icon: Icon, label, description, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:opacity-80"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      {count > 0 && (
        <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs font-semibold text-brand-accent">
          {count}
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { counts, loading, error } = useAdminDashboard();

  return (
    <PageContainer>
      <DashboardHero
        badge="Admin"
        title="Platform overview"
        subtitle="Review credentials, verify facilities, and manage users."
      />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load the dashboard.</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Pending credentials" value={counts.pendingCredentials} icon={FileClock} />
            <StatCard label="Pending facilities" value={counts.pendingFacilities} icon={Building2} />
            <StatCard label="Total users" value={counts.totalUsers} icon={Users} />
            <StatCard label="Total revenue" value={formatNaira(counts.totalRevenue)} icon={Wallet} accent />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Review queues
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              <QueueRow
                icon={FileClock}
                label="Credential queue"
                description="Documents awaiting approval"
                count={counts.pendingCredentials}
                onClick={() => navigate('/admin/credentials')}
              />
              <QueueRow
                icon={Building2}
                label="Facility queue"
                description="Clinics awaiting verification"
                count={counts.pendingFacilities}
                onClick={() => navigate('/admin/facilities')}
              />
              <QueueRow
                icon={Users}
                label="Manage users"
                description="Search, filter, and manage accounts"
                onClick={() => navigate('/admin/users')}
              />
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}

export default Dashboard;
