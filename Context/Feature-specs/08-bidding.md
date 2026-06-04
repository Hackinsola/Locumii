# Spec 08 — Bidding System

## Goal

Allow verified professionals to submit, track, and manage bids on open shifts, while facilities can view all bids on their shifts, accept one, and have all competing bids automatically cancelled with SMS notifications sent to declined professionals.

-----

## Design

### Pages

- `/professional/bids` — professional’s bid history (tabs: Pending | Accepted | Rejected | Completed)
- `/facility/shifts/:id/bids` — facility views all bids on a specific shift

### Visual — Bid History (Professional)

- Tab bar at top: Pending | Accepted | Rejected | Completed
- Each bid shown as a card: shift role, facility name, date/time, pay, bid status pill, submitted date
- Accepted bids show: “Your shift is confirmed. Check in on the day.”
- Rejected bids show rejection is passive — just a “Not selected” label, no reason shown

### Visual — Bid Management (Facility)

- List of bidders on a shift
- Each bidder card: professional name, specialty, verified badge, years experience, avg rating, “View Profile” link, “Accept” button
- Accepted state: one card shows green “Accepted” badge, all others show grey “Declined”
- Once one bid accepted, all Accept buttons disabled on remaining cards
- Confirmation modal before accepting: “Accepting this bid will decline all other bids. Are you sure?”

### Visual — Bid Button

- On shift detail page: large teal “Place Bid” button
- After bidding: button changes to “Bid Submitted” state (grey, disabled)
- Bid submitted state shows submitted timestamp

-----

## Implementation

### 1. Database Migration — `007_create_bids.sql`

```sql
create table public.bids (
  id uuid default gen_random_uuid() primary key,
  shift_id uuid references public.shifts(id) on delete cascade not null,
  professional_id uuid references public.users(id) on delete cascade not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  submitted_at timestamptz default now(),
  unique(shift_id, professional_id) -- one bid per professional per shift
);

-- Double booking prevention constraint
create or replace function check_no_double_booking()
returns trigger as $$
declare
  new_shift_start timestamptz;
  new_shift_end   timestamptz;
begin
  -- Only check when a bid is being accepted
  if new.status != 'accepted' then
    return new;
  end if;

  select start_time, end_time
    into new_shift_start, new_shift_end
    from public.shifts where id = new.shift_id;

  if exists (
    select 1
    from public.bids b
    join public.shifts s on s.id = b.shift_id
    where b.professional_id = new.professional_id
      and b.status = 'accepted'
      and b.id != new.id
      and s.start_time < new_shift_end
      and s.end_time > new_shift_start
  ) then
    raise exception 'Professional already has an accepted shift overlapping this time';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger bids_no_double_booking
  before insert or update on public.bids
  for each row execute function check_no_double_booking();

-- Verify professional is verified before bid insert
create or replace function check_professional_verified()
returns trigger as $$
begin
  if not exists (
    select 1 from public.professional_profiles
    where user_id = new.professional_id and is_verified = true
  ) then
    raise exception 'Professional is not verified';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger bids_require_verified
  before insert on public.bids
  for each row execute function check_professional_verified();

alter table public.bids enable row level security;

-- Professional sees own bids
create policy "bids_read_own_professional"
  on public.bids for select
  using (auth.uid() = professional_id);

-- Facility sees bids on their shifts
create policy "bids_read_facility_own_shifts"
  on public.bids for select
  using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.facility_id = auth.uid()
    )
  );

-- Professional inserts own bids only
create policy "bids_insert_professional"
  on public.bids for insert
  with check (
    auth.uid() = professional_id and
    exists (select 1 from public.users where id = auth.uid() and role = 'professional')
  );

-- Only Edge Functions (service_role) update bid status
-- No update policy for normal authenticated users
-- Exception: facility can accept a bid (triggers auto-cancel Edge Function)
create policy "bids_accept_facility"
  on public.bids for update
  using (
    exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.facility_id = auth.uid()
    )
  );
```

### 2. `src/hooks/useBids.js`

Exports:

- `submitBid(shiftId)` — inserts bid with `status = 'pending'`. Returns error if professional not verified, shift not open, or already bid on this shift.
- `getMyBids({ status })` — fetches professional’s own bids, filtered by status, joined with shift and facility data
- `getBidsForShift(shiftId)` — fetches all bids on a facility’s shift, joined with professional profile
- `acceptBid(bidId, shiftId)` — sets `bids.status = 'accepted'` for this bid, sets `shifts.status = 'filled'`. The `auto-cancel-bids` Edge Function fires via DB webhook.
- `getMyBidForShift(shiftId)` — returns the professional’s own bid for a specific shift (used to show “Bid Submitted” state on shift detail)
- `loading`, `error`

### 3. `src/components/shifts/BidButton.jsx`

Props: `shiftId`, `isVerified`, `shiftStatus`, `existingBid`

- If `!isVerified`: render disabled button with tooltip “Complete profile verification to bid”
- If `shiftStatus !== 'open'`: render disabled button “Shift no longer available”
- If `existingBid`: render grey “Bid Submitted” with submitted timestamp
- Otherwise: render teal “Place Bid” button, onClick calls `submitBid(shiftId)`, shows loading state during submission

### 4. Pages

**`src/pages/professional/BidHistory.jsx`**

- Four tabs: Pending | Accepted | Rejected | Completed
- Each tab fetches `getMyBids({ status: tabValue })`
- Renders bid cards with ShiftCard-style layout
- Empty state per tab: e.g. “No pending bids. Browse open shifts to get started.”
- Accepted bids card shows: green confirmation banner + shift date/time + “Add to Calendar” link (generates .ics file)

**`src/pages/facility/ManageBids.jsx`**

- Fetches shift details + all bids via `getBidsForShift(shiftId)`
- Shift summary at top (role, date, time, pay)
- Bid count: “X professionals have bid”
- Each bidder card:
  - Professional name, specialty, verified badge, years experience, avg rating (stars)
  - “View Profile” button (opens profile in a slide-over panel)
  - “Accept” button — triggers confirmation modal
- After acceptance: all cards re-render, accepted card shows green badge, others show “Declined”
- “Accept” button only visible when shift `status = 'open'`

### 5. Edge Function — `supabase/functions/auto-cancel-bids/index.ts`

Triggered by: DB webhook on `bids` table UPDATE where `status` changes to `accepted`

```typescript
// Pseudocode
const { shift_id, professional_id, id: accepted_bid_id } = payload.record

// 1. Get all other pending bids for this shift
const pendingBids = await db.from('bids')
  .select('id, professional_id')
  .eq('shift_id', shift_id)
  .eq('status', 'pending')
  .neq('id', accepted_bid_id)

// 2. Set all to 'cancelled'
await db.from('bids')
  .update({ status: 'cancelled' })
  .in('id', pendingBids.map(b => b.id))

// 3. Get phone numbers of declined professionals
// 4. Call send-sms for each: "Your bid for [shift role] on [date] was not selected. Keep browsing for new shifts."

// 5. Send SMS to accepted professional:
// "Your bid was accepted! [Facility name] confirmed your shift on [date] at [time]. See you there."
```

### 6. Notifications in DB

After auto-cancel-bids runs, insert notification rows for each affected professional:

```sql
insert into notifications (user_id, type, body)
values (professional_id, 'bid_declined', 'Your bid for [role] on [date] was not selected.')
```

-----

## Dependencies

No new dependencies.

-----

## Verification Checklist

- [ ] Verified professional can submit a bid — `bids` row created with `status = 'pending'`
- [ ] Unverified professional cannot submit bid — DB trigger raises exception AND frontend disables button
- [ ] Professional cannot bid on same shift twice — unique constraint blocks second insert
- [ ] Professional cannot have two accepted bids for overlapping shifts — double-booking trigger fires
- [ ] Bid button shows “Bid Submitted” after successful bid on that shift
- [ ] `getBidsForShift` returns only bids for the authenticated facility’s own shifts
- [ ] Facility accept triggers `auto-cancel-bids` Edge Function — all other pending bids on same shift set to `cancelled`
- [ ] SMS fires to all declined professionals (test with real numbers)
- [ ] SMS fires to accepted professional (test with real number)
- [ ] Shift status updates to `filled` when a bid is accepted
- [ ] Declined professionals see their bid status change to `cancelled` in bid history tab
- [ ] Accepted professional sees green confirmation in bid history
- [ ] Confirmation modal appears before facility accepts a bid
- [ ] Once a bid is accepted, remaining Accept buttons on that shift are disabled
- [ ] Notification rows created in `notifications` table for each declined professional