import { BarChart3, CheckCircle2, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PageContainer from '@/components/layout/PageContainer';
import PageHeader from '@/components/layout/PageHeader';
import { useFacilityTransactions } from '@/hooks/usePayments';
import { formatNaira } from '@/utils/money';
import { formatDate } from '@/utils/dateTime';

const STATUS_LABELS = {
  escrow: 'In escrow',
  released: 'Paid out',
  failed: 'Failed',
};

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span className="font-mono text-xl font-semibold text-foreground">{value}</span>
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

function Transactions() {
  const { transactions, summary, loading, error } = useFacilityTransactions();

  return (
    <PageContainer>
        <PageHeader title="Transactions" subtitle="Payments for your completed shifts." />

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total spent" value={formatNaira(summary.totalSpentKobo)} icon={Wallet} />
          <StatCard label="Completed" value={summary.completedCount} icon={CheckCircle2} />
          <StatCard label="Avg / shift" value={formatNaira(summary.avgKobo)} icon={BarChart3} />
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Could not load your transactions.</p>}
        {!loading && !error && transactions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No transactions yet. They appear once a shift is completed and the professional is paid.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {transactions.map((txn) => {
            const shift = single(txn.shifts);
            return (
              <Card key={txn.shift_id}>
                <CardContent className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {shift?.role_required ?? 'Shift'}
                    </span>
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {formatNaira(txn.gross_amount_naira)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fee <span className="font-mono">{formatNaira(txn.commission_naira)}</span> · paid
                    out <span className="font-mono">{formatNaira(txn.net_amount_naira)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_LABELS[txn.status] ?? txn.status} ·{' '}
                    {formatDate(txn.released_at ?? txn.created_at)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
    </PageContainer>
  );
}

export default Transactions;
