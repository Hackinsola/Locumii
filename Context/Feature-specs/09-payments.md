# Spec 09 — Payments (Paystack Escrow & Disbursement)

## Goal

Collect the full shift payment plus 10% commission from facilities upfront via Paystack at the time of shift posting, hold funds in escrow, and automatically disburse the net amount to the professional’s linked bank account within 24 hours of both parties confirming shift completion.

-----

## Design

### Pages

- `/professional/earnings` — earnings dashboard
- `/facility/transactions` — facility transaction history

### Visual — Earnings Dashboard

- Three summary cards at top:
  - Total Earned (sum of all released net payments) — JetBrains Mono, large
  - Pending (sum of escrow amounts for filled/in-progress shifts)
  - Completed Shifts (count)
- Transaction list below: date, shift role, facility name, gross, platform fee, your earnings, status badge
- “Link Bank Account” card if no bank account linked yet — prominent CTA

### Visual — Facility Transactions

- Summary: Total Spent, Shifts Completed, Avg Cost Per Shift
- Table: date, shift role, professional name, amount paid, commission, status

### Visual — Payment Summary Modal (on Post Shift)

- Shows breakdown:
  - Shift pay: ₦35,000
  - Platform fee (10%): ₦3,500
  - Total charged today: ₦38,500
- “Confirm & Pay” button opens Paystack

-----

## Implementation

### 1. Database Migration — `008_create_transactions.sql`

```sql
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  shift_id uuid references public.shifts(id) not null,
  facility_id uuid references public.users(id) not null,
  professional_id uuid references public.users(id) not null,
  gross_amount_kobo bigint not null,       -- what facility paid for the shift
  commission_kobo bigint not null,          -- 10% platform fee
  net_amount_kobo bigint not null,          -- disbursed to professional
  paystack_reference text not null,         -- from facility payment
  paystack_transfer_code text,              -- from disbursement transfer
  status text not null default 'escrow'
    check (status in ('escrow', 'released', 'failed')),
  released_at timestamptz,
  created_at timestamptz default now()
);

-- Immutability trigger — released rows cannot be updated
create or replace function lock_released_transaction()
returns trigger as $$
begin
  if old.status = 'released' then
    raise exception 'Cannot modify a released transaction';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger transactions_immutable
  before update on public.transactions
  for each row execute function lock_released_transaction();

alter table public.transactions enable row level security;

create policy "transactions_read_professional_own"
  on public.transactions for select
  using (auth.uid() = professional_id);

create policy "transactions_read_facility_own"
  on public.transactions for select
  using (auth.uid() = facility_id);

-- Only Edge Functions insert/update transactions
```

### 2. Database Migration — `009_create_shift_confirmations.sql`

```sql
create table public.shift_confirmations (
  shift_id uuid references public.shifts(id) primary key,
  professional_confirmed_at timestamptz,
  facility_confirmed_at timestamptz
);

alter table public.shift_confirmations enable row level security;

-- Professional can update their confirmation column
create policy "confirm_professional"
  on public.shift_confirmations for update
  using (
    exists (
      select 1 from public.bids b
      where b.shift_id = shift_confirmations.shift_id
        and b.professional_id = auth.uid()
        and b.status = 'accepted'
    )
  );

-- Facility can update their confirmation column
create policy "confirm_facility"
  on public.shift_confirmations for update
  using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_confirmations.shift_id
        and s.facility_id = auth.uid()
    )
  );

-- Both parties can read their shift confirmation
create policy "confirm_read"
  on public.shift_confirmations for select
  using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_confirmations.shift_id
        and (s.facility_id = auth.uid()
          or exists (select 1 from public.bids b where b.shift_id = s.id and b.professional_id = auth.uid() and b.status = 'accepted'))
    )
  );
```

### 3. `src/lib/paystack.js`

```js
// Initialises Paystack inline popup
// Called only from facility PostShift page
export const openPaystackPopup = ({ email, amountKobo, reference, onSuccess, onClose }) => {
  const handler = window.PaystackPop.setup({
    key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    email,
    amount: amountKobo, // Paystack accepts kobo
    ref: reference,
    currency: 'NGN',
    callback: (response) => onSuccess(response),
    onClose: () => onClose(),
  })
  handler.openIframe()
}
```

### 4. `src/hooks/usePayments.js`

Exports:

- `getEarnings()` — fetches professional’s transactions: total released, pending escrow, completed count
- `getFacilityTransactions()` — fetches facility’s transactions with pagination
- `confirmShiftCompletion(shiftId, role)` — updates `shift_confirmations.professional_confirmed_at` or `facility_confirmed_at` based on `role`
- `linkBankAccount({ accountNumber, bankCode, accountName })` — updates `professional_profiles` bank fields. Validates account via Paystack Resolve Account API first.
- `validateBankAccount({ accountNumber, bankCode })` — calls Supabase Edge Function that proxies Paystack’s resolve account endpoint. Returns account name for confirmation.
- `getSupportedBanks()` — calls Edge Function that fetches bank list from Paystack API
- `loading`, `error`

### 5. Pages

**`src/pages/professional/Earnings.jsx`**

- If no bank account linked: show banner “Link your bank account to receive payments” with CTA
- Summary cards: Total Earned, Pending, Shifts Completed
- Transaction list with pagination
- “Link Bank Account” modal:
  - Bank select (fetched from `getSupportedBanks()`)
  - Account number input
  - “Verify Account” button — calls `validateBankAccount()`, shows account name returned
  - “Save Account” button — only enabled after successful verification
  - Shows verified account name as confirmation

**`src/pages/facility/Transactions.jsx`**

- Summary row at top
- Paginated table, 20 per page
- Export to CSV button (client-side, using data already fetched)

**`src/pages/professional/ConfirmShift.jsx` and `src/pages/facility/ConfirmShift.jsx`**

- Accessed from shift detail or bid accepted card
- Shows shift summary
- “Confirm Shift Completed” button — large, teal
- After confirmation: shows “Waiting for [Facility/Professional] to confirm” state
- When both confirmed: shows “Payment is being processed. Your funds will arrive within 24 hours.”

### 6. Edge Function — `supabase/functions/release-payment/index.ts`

Triggered by: DB webhook on `shift_confirmations` table INSERT or UPDATE

```typescript
// Pseudocode
const { shift_id, professional_confirmed_at, facility_confirmed_at } = payload.record

// Only proceed if both confirmed
if (!professional_confirmed_at || !facility_confirmed_at) return

// 1. Get shift details
const shift = await db.from('shifts').select('*').eq('id', shift_id).single()

// 2. Get accepted bid to find professional
const bid = await db.from('bids').select('professional_id').eq('shift_id', shift_id).eq('status', 'accepted').single()

// 3. Get professional bank details
const prof = await db.from('professional_profiles').select('bank_account_number, bank_code').eq('user_id', bid.professional_id).single()

// 4. Calculate amounts
const grossKobo = shift.pay_rate_kobo
const commissionKobo = Math.round(grossKobo * 0.10)
const netKobo = grossKobo - commissionKobo

// 5. Create Paystack transfer recipient
const recipient = await paystack.createTransferRecipient({
  type: 'nuban',
  account_number: prof.bank_account_number,
  bank_code: prof.bank_code,
  currency: 'NGN'
})

// 6. Initiate transfer
const transfer = await paystack.initiateTransfer({
  source: 'balance',
  amount: netKobo,
  recipient: recipient.recipient_code,
  reason: `Locumii shift payment — ${shift.role_label}`
})

// 7. Insert transaction row
await db.from('transactions').insert({
  shift_id, facility_id: shift.facility_id,
  professional_id: bid.professional_id,
  gross_amount_kobo: grossKobo,
  commission_kobo: commissionKobo,
  net_amount_kobo: netKobo,
  paystack_reference: shift.paystack_reference,
  paystack_transfer_code: transfer.transfer_code,
  status: 'released',
  released_at: new Date().toISOString()
})

// 8. Update shift status to completed
await db.from('shifts').update({ status: 'completed' }).eq('id', shift_id)

// 9. Send SMS to professional
await sendSMS(professionalPhone, `Your payment of ₦${formatNaira(netKobo)} has been sent to your bank account.`)
```

### 7. `.env` Variables Required

```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
# In Edge Functions only:
PAYSTACK_SECRET_KEY=sk_live_...
```

-----

## Dependencies

```
# Paystack inline JS — already added in Spec 05 via CDN script tag
# No npm packages needed
```

-----

## Verification Checklist

- [ ] Paystack popup opens with correct total amount (gross + 10% in kobo)
- [ ] Shift is only inserted AFTER Paystack `callback` fires with `reference`
- [ ] `paystack_reference` is stored on the `shifts` row
- [ ] `shift_confirmations` row is created when a bid is accepted (with both timestamps null)
- [ ] Professional confirm button updates `professional_confirmed_at`
- [ ] Facility confirm button updates `facility_confirmed_at`
- [ ] `release-payment` Edge Function fires only when BOTH timestamps are non-null
- [ ] Transaction row is inserted with correct kobo amounts — verify: `net = gross - commission`, `commission = gross * 0.10`
- [ ] `transactions` row with `status = 'released'` cannot be updated — trigger blocks it
- [ ] Bank account validation confirms account name before saving
- [ ] Earnings dashboard shows correct total (sum of `net_amount_kobo` for released transactions, converted to Naira)
- [ ] Pending amount shows sum of escrow transactions for active shifts
- [ ] `PAYSTACK_SECRET_KEY` does not appear in any file under `src/`
- [ ] Amounts display in Naira on screen, stored in kobo in DB — verify both
- [ ] SMS fires to professional on payment release
- [ ] Shift status transitions to `completed` after release