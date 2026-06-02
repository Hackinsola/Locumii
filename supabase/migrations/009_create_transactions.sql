-- 009_create_transactions.sql
-- Immutable financial ledger. INV-04: once a row's status = 'released', no column
-- on that row may ever change. Disputes create new rows; they never mutate
-- existing ones. Insert/update is performed only by the release-payment Edge
-- Function (service_role); there are no client write policies.
--
-- Money note: gross/commission/net_amount_naira hold INTEGER amounts in KOBO
-- (1 Naira = 100 kobo), per code-standards.md. The _naira column names keep the
-- architecture.md spelling; the stored unit is kobo.

create table public.transactions (
  id                     uuid primary key default gen_random_uuid(),
  shift_id               uuid not null references public.shifts (id),
  gross_amount_naira     integer not null check (gross_amount_naira >= 0),
  commission_naira       integer not null check (commission_naira >= 0),
  net_amount_naira       integer not null check (net_amount_naira >= 0),
  paystack_transfer_code text,
  status                 transaction_status not null default 'escrow',
  released_at            timestamptz,
  created_at             timestamptz not null default now()
);

comment on column public.transactions.gross_amount_naira is
  'Gross amount stored as an integer in kobo (1 Naira = 100 kobo), despite the _naira name.';

create index transactions_shift_id_idx on public.transactions (shift_id);

-- INV-04: a row whose status is already 'released' is frozen.
create or replace function public.enforce_released_transaction_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'released' then
    raise exception 'A released transaction is immutable and cannot be updated (INV-04)';
  end if;
  return new;
end;
$$;

create trigger transactions_enforce_immutable
  before update on public.transactions
  for each row execute function public.enforce_released_transaction_immutable();

alter table public.transactions enable row level security;

-- Read: a professional reads transactions for shifts they worked (accepted bid);
-- a facility reads transactions for its own shifts; admins read all.
create policy transactions_select_parties
  on public.transactions for select
  to authenticated
  using (
    public.is_shift_facility(shift_id)
    or public.is_accepted_shift_professional(shift_id)
    or public.is_admin()
  );

-- No client INSERT/UPDATE policy: only the release-payment Edge Function
-- (service_role) writes this ledger (INV-01, INV-04).
