-- 018_shift_completion.sql
-- Advances a shift through the back half of its lifecycle (INV-07):
--   filled --check_in_shift--> in_progress --both confirm--> completed
--
-- check_in_shift(): the accepted professional checks in. They can't UPDATE shifts
-- under RLS, so this SECURITY DEFINER RPC authorizes (caller is the accepted
-- professional, shift is 'filled') and moves the shift to 'in_progress'.
--
-- complete_shift_on_dual_confirm(): a trigger on shift_confirmations. Once BOTH
-- professional_confirmed_at and facility_confirmed_at are set, it moves an
-- in_progress shift to 'completed'. (Payment release on completion is deferred to
-- the Paystack unit.) Each party still writes only its own timestamp — enforced by
-- the existing guard_shift_confirmation_columns trigger.

create or replace function public.check_in_shift(p_shift_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status shift_status;
begin
  select status into v_status from public.shifts where id = p_shift_id;
  if not found then
    raise exception 'Shift not found';
  end if;

  if not exists (
    select 1 from public.bids
    where shift_id = p_shift_id and professional_id = auth.uid() and status = 'accepted'
  ) then
    raise exception 'Only the accepted professional can check in to this shift';
  end if;

  if v_status <> 'filled' then
    raise exception 'A shift can only be checked in to while it is filled';
  end if;

  update public.shifts set status = 'in_progress' where id = p_shift_id;
end;
$$;

revoke all on function public.check_in_shift(uuid) from public;
grant execute on function public.check_in_shift(uuid) to authenticated;

create or replace function public.complete_shift_on_dual_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.professional_confirmed_at is not null and new.facility_confirmed_at is not null then
    update public.shifts
      set status = 'completed'
      where id = new.shift_id and status = 'in_progress';
  end if;
  return new;
end;
$$;

create trigger shift_confirmations_complete_on_dual
  after insert or update on public.shift_confirmations
  for each row execute function public.complete_shift_on_dual_confirm();
