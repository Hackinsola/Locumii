import { useState } from 'react';
import { CheckCircle2, Clock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useLinkBankAccount,
  useOwnBankAccount,
  useProfessionalEarnings,
  useResolveBankAccount,
  useSupportedBanks,
} from '@/hooks/usePayments';
import { formatNaira } from '@/utils/money';
import { formatDate } from '@/utils/dateTime';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';

const selectClasses =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function single(embedded) {
  return Array.isArray(embedded) ? embedded[0] : embedded;
}

function StatCard({ label, value, accent = false, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span
            className={cn(
              'font-mono text-xl font-semibold',
              accent ? 'text-brand-accent' : 'text-foreground'
            )}
          >
            {value}
          </span>
        </div>
        {Icon && (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-lg',
              accent ? 'bg-brand-accent/10 text-brand-accent' : 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function Earnings() {
  const { bank, loading: bankLoading, refetch } = useOwnBankAccount();
  const { banks, loading: banksLoading } = useSupportedBanks();
  const { resolveAccount, loading: resolving } = useResolveBankAccount();
  const { linkBankAccount, loading: saving } = useLinkBankAccount();
  const { earnings, loading: earningsLoading } = useProfessionalEarnings();

  const [editing, setEditing] = useState(false);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState(null);
  const [formError, setFormError] = useState(null);

  function bankName(code) {
    return banks.find((item) => item.code === code)?.name ?? code;
  }

  function startEditing() {
    setBankCode('');
    setAccountNumber('');
    setResolvedName(null);
    setFormError(null);
    setEditing(true);
  }

  function handleBankChange(event) {
    setBankCode(event.target.value);
    setResolvedName(null);
  }

  function handleNumberChange(event) {
    setAccountNumber(event.target.value);
    setResolvedName(null);
  }

  async function handleVerify() {
    setFormError(null);
    if (!/^\d{10}$/.test(accountNumber)) {
      setFormError('Enter a valid 10-digit account number.');
      return;
    }
    if (!bankCode) {
      setFormError('Select your bank.');
      return;
    }
    const { accountName, error } = await resolveAccount({ accountNumber, bankCode });
    if (error) {
      setFormError(error.message ?? 'Could not verify the account.');
      return;
    }
    setResolvedName(accountName);
  }

  async function handleSave() {
    setFormError(null);
    const { error } = await linkBankAccount({ accountNumber, bankCode });
    if (error) {
      setFormError(error.message ?? 'Could not save your account.');
      return;
    }
    setEditing(false);
    refetch();
  }

  return (
    <PageContainer>
        <div>
          <h1 className="text-xl font-medium text-foreground">Earnings</h1>
          <p className="text-sm text-muted-foreground">Your payout account and earnings.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Total earned"
            value={formatNaira(earnings.totalEarnedKobo)}
            accent
            icon={Wallet}
          />
          <StatCard label="Pending" value={formatNaira(earnings.pendingKobo)} icon={Clock} />
          <StatCard label="Completed" value={earnings.completedCount} icon={CheckCircle2} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bank account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {bankLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

            {!bankLoading && !editing && (
              <>
                {bank?.linked ? (
                  <p className="text-sm text-foreground">
                    Payouts go to{' '}
                    <span className="font-medium">•••• {bank.accountLast4}</span> ·{' '}
                    {bankName(bank.bankCode)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Link your bank account to receive payments for completed shifts.
                  </p>
                )}
                <Button className="self-start" onClick={startEditing}>
                  {bank?.linked ? 'Update bank account' : 'Link bank account'}
                </Button>
              </>
            )}

            {!bankLoading && editing && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bankCode" className="text-sm font-medium text-foreground">
                    Bank
                  </label>
                  <select
                    id="bankCode"
                    value={bankCode}
                    onChange={handleBankChange}
                    className={selectClasses}
                    disabled={banksLoading}
                  >
                    <option value="" disabled>
                      {banksLoading ? 'Loading banks…' : 'Select your bank'}
                    </option>
                    {banks.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="accountNumber" className="text-sm font-medium text-foreground">
                    Account number
                  </label>
                  <Input
                    id="accountNumber"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={handleNumberChange}
                    placeholder="10-digit NUBAN"
                  />
                </div>

                {resolvedName && (
                  <p className="text-sm text-foreground">
                    Account name: <span className="font-medium">{resolvedName}</span>
                  </p>
                )}
                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <div className="flex gap-2">
                  {!resolvedName ? (
                    <Button onClick={handleVerify} disabled={resolving}>
                      {resolving ? 'Verifying…' : 'Verify account'}
                    </Button>
                  ) : (
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving…' : 'Save account'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payout history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {earningsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!earningsLoading && earnings.transactions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No payouts yet. Earnings show here once your shifts are completed and paid.
              </p>
            )}
            {earnings.transactions.map((txn) => {
              const shift = single(txn.shifts);
              const facility = single(shift?.facility_profiles);
              return (
                <div
                  key={txn.shift_id}
                  className="flex items-center justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">{shift?.role_required ?? 'Shift'}</span>
                    <span className="text-xs text-muted-foreground">
                      {facility?.facility_name ?? 'Facility'} · {formatDate(txn.released_at)}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-brand-accent">
                    {formatNaira(txn.net_amount_naira)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
    </PageContainer>
  );
}

export default Earnings;
