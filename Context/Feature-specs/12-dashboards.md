# Spec 12 — Dashboards (Professional & Facility)

## Goal

Give both professionals and facilities a clear home screen after login that surfaces their most important information — pending actions, upcoming shifts, recent activity — and routes them to the right next step without requiring navigation.

-----

## Design

### Professional Dashboard — `/professional/dashboard`

Layout (top to bottom on mobile):

1. Rating prompt banner (if pending ratings) — from Spec 11
1. Welcome card: “Good morning, [name]” + verified badge or pending warning
1. Quick stats row: Active Bids | Upcoming Shifts | Total Earned
1. Upcoming confirmed shift card (if any) — date, time, facility, countdown
1. “Browse Shifts” CTA button — large, teal, full width on mobile
1. Recent bids list (last 5) with status pills

### Facility Dashboard — `/facility/dashboard`

Layout:

1. Rating prompt banner (if pending ratings)
1. Welcome card: facility name + verified badge or pending warning
1. Quick stats row: Open Shifts | Filled Shifts | Total Spent
1. Active shifts needing action (shifts with pending bids) — each with “View Bids” button
1. “Post a Shift” CTA — large, teal
1. Recent shift history (last 5)

### Visual

- Dashboard background: `#FAFAFA`
- Cards: `background #FFFFFF`, `border: 1px solid #E5E5E5`, `border-radius: 12px`
- Quick stats: three equal-width cards in a row, number in JetBrains Mono
- Welcome card: name in `--text-heading-1` (28px, weight 700)
- Pending/unverified state: amber banner “Your account is pending approval. You’ll be notified within 48 hours.”
- CTA button: full width on mobile, `max-width: 360px` on desktop

-----

## Implementation

### 1. `src/hooks/useDashboard.js`

Exports — Professional:

- `getProDashboardData()` — single call returning:
  - `upcomingShifts`: accepted bids where shift `start_time > now`, joined with shift + facility, ordered by `start_time asc`, limit 3
  - `recentBids`: last 5 bids with shift and facility info
  - `stats`: `{ activeBids, upcomingShifts, totalEarnedKobo }`
  - `pendingRatings`: from `useRatings.getPendingRatings()`

Exports — Facility:

- `getFacilityDashboardData()` — single call returning:
  - `shiftsNeedingAction`: open shifts with at least 1 pending bid, ordered by `created_at desc`
  - `recentShifts`: last 5 shifts regardless of status
  - `stats`: `{ openShifts, filledShifts, totalSpentKobo }`

### 2. Pages

**`src/pages/professional/Dashboard.jsx`**

- On mount: call `getProDashboardData()`
- If profile not complete (no `professional_profiles` row): redirect to `/professional/profile/setup`
- If `users.status = 'pending'`: show amber pending banner, hide Browse Shifts CTA, show “Complete your profile” if credentials not uploaded
- Render components as described in Design
- “Browse Shifts” button navigates to `/professional/shifts`

**`src/pages/facility/Dashboard.jsx`**

- On mount: call `getFacilityDashboardData()`
- If no `facility_profiles` row: redirect to `/facility/profile/setup`
- If `users.status = 'pending'`: show amber pending banner, hide Post Shift CTA
- Render components as described in Design
- “Post a Shift” button navigates to `/facility/shifts/post`

### 3. Components

**`src/components/ui/StatCard.jsx`**
Props: `label`, `value`, `prefix` (e.g. “₦”), `isMonospace`

- White card, `padding: 20px`
- Value in JetBrains Mono if `isMonospace = true`
- Label in `#6B7280`, 11px uppercase

**`src/components/shifts/UpcomingShiftCard.jsx`**
Props: `bid`, `shift`, `facility`

- Teal left border accent (`4px solid #0B6E6E`)
- Shows: role, facility name, date, time, pay
- Countdown: “Starts in 2 days 4 hours”
- “View Details” link

**`src/components/ui/PendingBanner.jsx`**
Props: `message`

- Amber background `#FFFBEB`, border `#D97706`
- Warning icon + message text

**`src/components/ui/CTAButton.jsx`**
Props: `label`, `to`, `icon`

- Full width, height `52px`, teal, border-radius `10px`
- Icon on left, label centred

-----

## Dependencies

No new dependencies.

-----

## Verification Checklist

- [ ] Professional with incomplete profile redirects to `/professional/profile/setup` on dashboard load
- [ ] Professional with `status = 'pending'` sees amber banner and cannot access shift feed
- [ ] Facility with `status = 'pending'` sees amber banner and cannot post shifts
- [ ] Quick stats show correct counts — verify by comparing to DB values directly
- [ ] Total Earned displays in Naira (converted from kobo), formatted with ₦ symbol
- [ ] Upcoming shift card shows correct countdown
- [ ] “Browse Shifts” button visible and working for active, verified professionals
- [ ] “Post a Shift” button visible and working for active, verified facilities
- [ ] Rating prompt banner appears when pending ratings exist
- [ ] Dashboard data refreshes on return navigation (e.g. back from shift detail)
- [ ] Facility dashboard shows shifts with pending bids in “needs action” section
- [ ] Empty states render for each section when no data exists