# Spec 07 — Shift Marketplace (Feed, Post, Detail)

## Goal

Allow facilities to post shifts with full details and upfront Paystack payment, and allow verified professionals to browse, filter, and view shift details in a paginated feed.

-----

## Design

### Pages

- `/professional/shifts` — shift feed with filters
- `/professional/shifts/:id` — shift detail page
- `/facility/shifts/post` — post a shift form
- `/facility/shifts` — facility’s posted shifts list

### Visual — Shift Feed

- Filter bar at top: City (select), Role (select), Date (date picker), Min Pay (number input). “Clear filters” link.
- Shift cards below, stacked vertically on mobile, max-width `680px` centred
- Each card: `background #FFFFFF`, `border: 1px solid #E5E5E5`, `border-radius: 12px`, `padding: 16px 18px`
- Card hover: `border-color: #D1D5DB`, subtle shadow
- Card content: role name (bold, 14px), facility name + city (grey, 12px), date + time row, pay amount in JetBrains Mono (teal accent), status pill, “View Shift” button
- Empty state: illustration placeholder + “No open shifts in Abuja right now. Check back soon.”
- Loading: 3 skeleton cards

### Visual — Shift Detail

- Back link at top
- Facility info card (name, type, city, rating)
- Shift info: role, date, start/end time, pay rate, requirements
- Pay breakdown: Gross ₦X → Your earnings after platform fee: ₦Y (note: 10% goes to platform)
- “Place Bid” button — disabled with tooltip if not verified
- Bid count: “N professionals have bid on this shift”

### Visual — Post Shift Form

- White card, max-width `560px`
- Fields stacked vertically
- Pay rate field shows live commission calculation below: “You pay: ₦X + ₦Y platform fee = ₦Z total”
- “Review & Pay” button opens payment summary modal before Paystack popup

-----

## Implementation

### 1. Database Migration — `006_create_shifts.sql`

```sql
create table public.shifts (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references public.users(id) on delete cascade not null,
  role_required text not null check (role_required in ('doctor', 'nurse', 'pharmacist', 'medical_lab_scientist')),
  role_label text not null, -- human-readable e.g. "Locum Doctor — General Practice"
  start_time timestamptz not null,
  end_time timestamptz not null,
  pay_rate_kobo bigint not null check (pay_rate_kobo > 0), -- stored in kobo
  requirements text,
  city text not null default 'Abuja',
  status text not null default 'open'
    check (status in ('open', 'filled', 'in_progress', 'completed', 'cancelled')),
  paystack_reference text,
  created_at timestamptz default now(),
  constraint end_after_start check (end_time > start_time)
);

-- Status transition trigger
create or replace function check_shift_status_transition()
returns trigger as $$
begin
  if old.status = 'completed' then
    raise exception 'Cannot change status of a completed shift';
  end if;
  if old.status = 'cancelled' then
    raise exception 'Cannot change status of a cancelled shift';
  end if;
  if old.status = 'in_progress' and new.status not in ('completed', 'cancelled') then
    raise exception 'Invalid status transition from in_progress';
  end if;
  if old.status = 'filled' and new.status not in ('in_progress', 'cancelled', 'open') then
    raise exception 'Invalid status transition from filled';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger shift_status_guard
  before update on public.shifts
  for each row execute function check_shift_status_transition();

alter table public.shifts enable row level security;

-- Anyone authenticated can read open shifts
create policy "shifts_read_open"
  on public.shifts for select
  using (auth.role() = 'authenticated');

-- Only facilities can insert their own shifts
create policy "shifts_insert_facility"
  on public.shifts for insert
  with check (
    auth.uid() = facility_id and
    exists (select 1 from public.users where id = auth.uid() and role = 'facility')
  );

-- Facility can update own shift status (open→cancelled only from frontend)
create policy "shifts_update_facility_own"
  on public.shifts for update
  using (auth.uid() = facility_id);
```

### 2. `src/utils/money.js`

```js
export const koboToNaira = (kobo) => kobo / 100
export const nairaToKobo = (naira) => Math.round(naira * 100)
export const formatNaira = (kobo) => {
  const naira = koboToNaira(kobo)
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(naira)
}
export const calculateCommission = (grossKobo) => Math.round(grossKobo * 0.10)
export const calculateNet = (grossKobo) => grossKobo - calculateCommission(grossKobo)
// Total facility pays = gross + commission
export const calculateFacilityTotal = (grossKobo) => grossKobo + calculateCommission(grossKobo)
```

### 3. `src/utils/dateTime.js`

```js
// All times stored as UTC in DB, displayed in WAT (UTC+1)
export const toWAT = (utcString) => {
  return new Date(utcString).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
}
export const formatShiftTime = (start, end) => {
  const s = new Date(start).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Lagos' })
  const e = new Date(end).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Lagos' })
  return `${s} – ${e}`
}
export const formatShiftDate = (start) => {
  return new Date(start).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
}
export const shiftsOverlap = (start1, end1, start2, end2) => {
  return new Date(start1) < new Date(end2) && new Date(end1) > new Date(start2)
}
```

### 4. `src/hooks/useShifts.js`

Exports:

- `getOpenShifts({ city, role, dateFrom, dateTo, minPayKobo, page })` — paginated, 20 per page, `status = 'open'` only
- `getShiftById(shiftId)` — full shift detail with facility profile joined
- `getFacilityShifts()` — all shifts posted by current facility user
- `postShift({ roleRequired, roleLabel, startTime, endTime, payRateKobo, requirements, city })` — inserts shift with `status = 'open'`, stores `paystack_reference` returned from payment flow
- `cancelShift(shiftId)` — updates `status = 'cancelled'` (only if `status = 'open'`)
- `getBidCountForShift(shiftId)` — count of `pending` bids on a shift
- `loading`, `error`

### 5. Pages

**`src/pages/professional/ShiftFeed.jsx`**

- Fetch shifts on mount with `getOpenShifts()`
- Filter state: `city`, `role`, `dateFrom`, `dateTo`, `minPay` — all in local state
- On filter change: re-fetch with new params
- Renders `ShiftCard` for each result
- Infinite scroll or “Load More” button for pagination
- Shows skeleton cards during loading
- Empty state component when no results

**`src/pages/professional/ShiftDetail.jsx`**

- Fetches shift by `id` from URL params
- Shows full shift info, facility card, pay breakdown
- Shows bid count
- `BidButton` component — disabled if professional `is_verified = false`, disabled if shift not `open`, disabled if professional already has a bid on this shift

**`src/pages/facility/PostShift.jsx`**

- Form fields:
  - Role required (select: Doctor | Nurse | Pharmacist | Medical Lab Scientist)
  - Role label (text — specific description e.g. “Locum Doctor — Emergency”)
  - Date (date picker — cannot be in the past)
  - Start time (time picker)
  - End time (time picker — must be after start)
  - Pay rate in Naira (number input, converted to kobo on submit)
  - Special requirements (textarea, optional)
  - City (locked to Abuja for MVP)
- Live commission preview below pay rate field
- “Review & Pay” button → opens `PaymentSummaryModal`
- `PaymentSummaryModal`: shows gross, commission, total, “Confirm & Pay” button
- “Confirm & Pay” → opens Paystack inline popup
- On Paystack success: call `postShift()` with `paystack_reference`
- On Paystack close without payment: show “Payment cancelled” toast, do not post shift

**`src/pages/facility/FacilityShifts.jsx`**

- Tabs: Open | Filled | Completed | Cancelled
- Lists facility’s own shifts with status badges
- “View Bids” button on each open/filled shift

### 6. Components

**`src/components/shifts/ShiftCard.jsx`**
Props: `shift`, `onView`
Renders the card as described in Design.

**`src/components/shifts/StatusBadge.jsx`**
Props: `status`
Maps status to colour pill from ui-context.

**`src/components/shifts/ShiftDetail.jsx` (component, not page)**
Reusable shift info display used on both professional and facility views.

-----

## Dependencies

```
# Paystack inline script — loaded via CDN in index.html
# No npm package needed for Paystack inline
```

Add to `index.html`:

```html
<script src="https://js.paystack.co/v1/inline.js"></script>
```

-----

## Verification Checklist

- [ ] Shift feed shows only `status = 'open'` shifts
- [ ] Filters correctly narrow results — role filter, city filter, date filter each work independently
- [ ] Pagination loads next 20 shifts on “Load More”
- [ ] Pay amount displays in JetBrains Mono, formatted as ₦35,000 (not 3500000)
- [ ] All amounts stored in kobo in the database — verify with a direct DB query
- [ ] `end_time` must be after `start_time` — form blocks submission if not
- [ ] Past dates cannot be selected for shift posting
- [ ] Commission preview updates live as pay rate is typed
- [ ] Paystack popup opens with correct amount (gross + 10%)
- [ ] Shift is only inserted into DB AFTER Paystack success callback fires
- [ ] `paystack_reference` is stored on the shift row
- [ ] Shift status transition trigger blocks `completed → open` transition
- [ ] Empty state renders when no shifts match filters
- [ ] Skeleton cards show during loading
- [ ] Shift detail shows correct bid count
- [ ] `BidButton` is disabled for unverified professionals with tooltip explanation