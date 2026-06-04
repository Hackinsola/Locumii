-- 023_gate_shift_insert_to_payment.sql
-- Shifts may now only be created by the verify-payment Edge Function (service_role),
-- which inserts a shift after confirming a Paystack charge. Removing the client
-- INSERT policy closes the bypass where a facility could post a shift via the raw
-- API without paying. service_role bypasses RLS, so the Edge Function still inserts.
drop policy if exists shifts_insert_own on public.shifts;
