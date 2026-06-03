-- 015_accept_bid.sql
-- accept_bid(): the facility-side accept action. bids has no client UPDATE policy
-- (bid writes are server-side only), so this SECURITY DEFINER function performs the
-- privileged, atomic transition that the architecture's accept/auto-cancel flow
-- requires:
--   1. authorize: caller (auth.uid()) must own the shift the bid is on
--   2. accept the chosen bid  (fires INV-03 overlap check)
--   3. cancel every other pending bid on the shift  (the "auto-cancel" step)
--   4. move the shift open -> filled  (fires INV-07 state-machine check)
-- All four happen in one transaction (one function call), so a failure at any step
-- rolls the whole accept back. SMS-on-decline is deferred (needs send-sms + Termii).

create or replace function public.accept_bid(p_bid_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_id     uuid;
  v_facility_id  uuid;
  v_bid_status   bid_status;
  v_shift_status shift_status;
begin
  select b.shift_id, b.status, s.facility_id, s.status
    into v_shift_id, v_bid_status, v_facility_id, v_shift_status
  from public.bids b
  join public.shifts s on s.id = b.shift_id
  where b.id = p_bid_id;

  if not found then
    raise exception 'Bid not found';
  end if;

  if v_facility_id is distinct from auth.uid() then
    raise exception 'Only the facility that posted the shift may accept a bid';
  end if;

  if v_bid_status <> 'pending' then
    raise exception 'Only a pending bid can be accepted';
  end if;

  if v_shift_status <> 'open' then
    raise exception 'Bids can only be accepted while the shift is open';
  end if;

  update public.bids set status = 'accepted' where id = p_bid_id;

  update public.bids
    set status = 'cancelled'
    where shift_id = v_shift_id and id <> p_bid_id and status = 'pending';

  update public.shifts set status = 'filled' where id = v_shift_id;
end;
$$;

-- Callable only by signed-in users; the function authorizes ownership internally.
revoke all on function public.accept_bid(uuid) from public;
grant execute on function public.accept_bid(uuid) to authenticated;
