import { Building2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useFacilityReferrals, useUpdateReferralStatus } from '@/hooks/useAdmin';
import { formatDate } from '@/utils/dateTime';

// Admin view of facility nominations (Spec 13) — the warm-lead pipeline. Each lead
// carries the nominating professional's email and their relationship to the facility,
// so outreach starts with a warm intro. Status moves pending → contacted → signed_up
// / not_interested. Admin-gated by RLS + the route guard.

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'signed_up', label: 'Signed up' },
  { value: 'not_interested', label: 'Not interested' },
];

const selectClass =
  'h-7 rounded-lg border border-input bg-transparent px-2 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function toCsv(rows) {
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = [
    'Facility',
    'City',
    'Type',
    'Contact',
    'Contact info',
    'Relationship',
    'Nominated by',
    'Status',
    'Date',
  ];
  const lines = rows.map((row) =>
    [
      row.facility_name,
      row.city,
      row.facility_type ?? '',
      row.contact_name ?? '',
      row.contact_info ?? '',
      row.relationship ?? '',
      row.referee_email,
      row.status,
      row.created_at,
    ]
      .map(escape)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

function downloadCsv(rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `locumii-facility-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FacilityReferrals() {
  const { referrals, loading, error, refetch } = useFacilityReferrals();
  const { setStatus } = useUpdateReferralStatus();

  const subtitle = loading
    ? 'Loading…'
    : `${referrals.length} ${referrals.length === 1 ? 'lead' : 'leads'}`;

  async function handleStatusChange(id, status) {
    const { error: updateError } = await setStatus(id, status);
    if (!updateError) {
      refetch();
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Facility leads"
        subtitle={subtitle}
        actions={
          <Button
            variant="outline"
            onClick={() => downloadCsv(referrals)}
            disabled={loading || referrals.length === 0}
          >
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      {error && (
        <p className="text-sm text-destructive">Could not load leads. {error.message ?? ''}</p>
      )}

      {!loading && !error && referrals.length === 0 && (
        <EmptyState icon={Building2}>
          No facility nominations yet. When professionals nominate clinics from the waitlist,
          they&rsquo;ll appear here as warm leads.
        </EmptyState>
      )}

      {referrals.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Relationship</th>
                <th className="px-4 py-3 font-medium">Nominated by</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{row.facility_name}</div>
                    {row.facility_type && (
                      <div className="text-xs text-muted-foreground">{row.facility_type}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.contact_name || row.contact_info ? (
                      <>
                        <div className="text-foreground">{row.contact_name || '—'}</div>
                        {row.contact_info && (
                          <div className="text-xs text-muted-foreground">{row.contact_info}</div>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-xs text-muted-foreground">
                    {row.relationship || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.referee_email}</td>
                  <td className="px-4 py-3">
                    <select
                      className={selectClass}
                      value={row.status}
                      onChange={(event) => handleStatusChange(row.id, event.target.value)}
                      aria-label={`Status for ${row.facility_name}`}
                    >
                      {STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(row.created_at)}
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

export default FacilityReferrals;
