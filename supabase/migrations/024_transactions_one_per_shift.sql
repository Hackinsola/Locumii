-- 024_transactions_one_per_shift.sql
-- A shift is disbursed at most once. This unique constraint is the concurrency
-- lock for the release-payment Edge Function: the first caller inserts the
-- (escrow) transaction row and "owns" the payout; a concurrent caller's insert
-- fails the constraint and backs off, so no double transfer can occur.
alter table public.transactions
  add constraint transactions_one_per_shift unique (shift_id);
