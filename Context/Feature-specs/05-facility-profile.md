# Spec 05 — Facility Profile & Verification

## Goal

Allow a facility representative to complete their facility profile with name, type, address, CAC number, and contact details immediately after registration, so an admin can manually verify the facility within 48 hours.

-----

## Design

### Pages

- `/facility/profile/setup` — single-step profile form, shown after first login if profile incomplete
- `/facility/profile` — view and edit facility profile

### Visual

- Single white card, max-width `560px`, centred, same card style as auth pages
- Facility type rendered as a segmented selector: Clinic | Hospital | Pharmacy | Diagnostic Lab
- Address is a plain text field for MVP (no Google Maps autocomplete)
- City is a select dropdown: Abuja (only city for MVP launch)
- Verified badge uses same `VerifiedBadge` component as professional profile
- Pending badge shown until admin approves

-----

## Implementation

### 1. Database Migration — `004_create_facility_profiles.sql`

```sql
create table public.facility_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  facility_name text not null,
  facility_type text not null check (facility_type in ('clinic', 'hospital', 'pharmacy', 'diagnostic_lab')),
  cac_number text not null,
  address text not null,
  city text not null default 'Abuja',
  state text not null default 'FCT',
  contact_name text not null,
  contact_phone text not null,
  is_verified boolean default false,
  avg_rating numeric(3,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.facility_profiles enable row level security;

create policy "facility_read_any_authenticated"
  on public.facility_profiles for select
  using (auth.role() = 'authenticated');

create policy "facility_insert_own"
  on public.facility_profiles for insert
  with check (auth.uid() = user_id);

create policy "facility_update_own"
  on public.facility_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 2. `src/hooks/useProfile.js` additions

Add to existing hook (shared between professional and facility):

- `createFacilityProfile(profileData)` — inserts into `facility_profiles`
- `updateFacilityProfile(profileData)` — updates own row
- `getOwnFacilityProfile()` — fetches for current auth user
- `getFacilityProfile(userId)` — fetches by user_id (for professionals viewing facility)

### 3. Pages

**`src/pages/facility/ProfileSetup.jsx`**

- Check on mount: if `facility_profiles` row exists, redirect to `/facility/dashboard`
- Form fields:
  - Facility name (text, required)
  - Facility type (segmented selector, required)
  - CAC registration number (text, required)
  - Street address (text, required)
  - City (select, locked to “Abuja” for MVP)
  - Contact person name (text, required)
  - Contact person phone (tel, Nigerian format, required)
- On submit: call `createFacilityProfile()`. On success redirect to `/auth/pending` with facility-specific message: “We are verifying your facility. You will be notified within 48 hours.”

**`src/pages/facility/Profile.jsx`**

- Fetch own facility profile on mount
- Display: facility name, type badge, address, city, contact name, verified/pending badge, average rating
- “Edit Profile” opens inline edit form (all fields except CAC number which is locked after creation)
- CAC number shown as read-only after creation

**`src/components/profiles/FacilityCard.jsx`**

- Props: `facility` object
- Renders compact facility card for use in bid lists (professionals viewing facility info)
- Shows: facility name, type, city, avg_rating stars, verified badge

### 4. `src/utils/validators.js` additions

```js
export const validateCACNumber = (cac) => {
  // CAC format: RC followed by digits e.g. RC123456
  // BN (business name) format: BN followed by digits
  return /^(RC|BN)\d{5,10}$/i.test(cac)
}
```

-----

## Dependencies

No new dependencies.

-----

## Verification Checklist

- [ ] Facility can complete profile and be redirected to pending screen
- [ ] `facility_profiles` row exists after setup with `is_verified = false`
- [ ] CAC number is locked (read-only) after profile creation
- [ ] City is locked to Abuja for MVP — dropdown has only one option
- [ ] Facility profile is readable by any authenticated user (professionals need to see facility info when viewing shift details)
- [ ] Facility cannot read or write to `professional_profiles` table
- [ ] `FacilityCard` renders correctly with all required fields
- [ ] Edit profile works and updates `updated_at` timestamp
- [ ] Contact phone validates as Nigerian format