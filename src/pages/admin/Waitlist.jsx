import { ClipboardList, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useWaitlistSignups } from '@/hooks/useAdmin';
import { formatDate } from '@/utils/dateTime';

// Admin view of pre-launch waitlist signups, with a one-click CSV export. Read-only;
// the table is admin-gated by RLS (waitlist_select_admin) and the route guard.

// Build a CSV string, quoting any field that contains a comma, quote, or newline.
function toCsv(rows) {
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ['Email', 'Name', 'Role', 'Joined'];
  const lines = rows.map((row) =>
    [row.email, row.full_name ?? '', row.role ?? '', row.created_at].map(escape).join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `locumii-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Waitlist() {
  const { signups, loading, error } = useWaitlistSignups();

  const subtitle = loading
    ? 'Loading…'
    : `${signups.length} ${signups.length === 1 ? 'signup' : 'signups'}`;

  return (
    <PageContainer>
      <PageHeader
        title="Waitlist"
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            onClick={() => downloadCsv(signups)}
            disabled={loading || signups.length === 0}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      {error && (
        <p className="text-sm text-destructive">
          Could not load the waitlist. {error.message ?? ''}
        </p>
      )}

      {!loading && !error && signups.length === 0 && (
        <EmptyState icon={ClipboardList}>
          No signups yet. When visitors join the waitlist on the landing page, they’ll appear here.
        </EmptyState>
      )}

      {signups.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((signup) => (
                <tr key={signup.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{signup.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{signup.full_name || '—'}</td>
                  <td className="px-4 py-3">
                    {signup.role ? (
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-foreground">
                        {signup.role}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(signup.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}

export default Waitlist;
