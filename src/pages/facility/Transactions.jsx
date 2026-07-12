import { BarChart3, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import StatTile from '@/components/ui/StatTile';
import { useFacilityTransactions } from '@/hooks/usePayments';
import { formatNaira, formatNairaCompact } from '@/utils/money';
import { formatDate } from '@/utils/dateTime';
import { cn } from '@/lib/utils';

const STATUS_LABELS = {
  escrow: 'In escrow',
  released: 'Paid out',
  failed: 'Failed',
};
const STATUS_STYLES = {
  escrow: 'bg-status-warning-bg text-status-warning',
  released: 'bg-status-success-bg text-status-success',
  failed: 'bg-muted text-muted-foreground',
};

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}


function Transactions() {
  const { transactions, summary, loading, error } = useFacilityTransactions();

  return (
    <PageContainer>
      <PageHeader title="Payments" subtitle="Payments for your posted jobs." />

      <Card>
        <CardContent className="grid grid-cols-3 divide-x divide-border">
          <StatTile icon={Wallet} value={formatNairaCompact(summary.totalSpentKobo)} label="Total spent" accent />
          <StatTile icon={CheckCircle2} value={summary.completedCount} label="Completed" />
          <StatTile icon={BarChart3} value={formatNairaCompact(summary.avgKobo)} label="Avg / job" />
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Could not load your payments.</p>}
      {!loading && !error && transactions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No payments yet. They appear once a job is completed and the professional is paid.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {transactions.map((txn) => {
          const shift = single(txn.shifts);
          return (
            <Card key={txn.shift_id}>
              <CardContent className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    {shift?.role_required ?? 'Job'}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatNaira(txn.gross_amount_naira)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fee {formatNaira(txn.commission_naira)} · paid out {formatNaira(txn.net_amount_naira)}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_STYLES[txn.status] ?? 'bg-muted text-muted-foreground'
                    )}
                  >
                    {STATUS_LABELS[txn.status] ?? txn.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(txn.released_at ?? txn.created_at)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-status-success-bg px-4 py-3 text-sm text-status-success">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          All payments are processed securely. Professionals are paid once both sides confirm the
          job is complete.
        </span>
      </div>
    </PageContainer>
  );
}

export default Transactions;
