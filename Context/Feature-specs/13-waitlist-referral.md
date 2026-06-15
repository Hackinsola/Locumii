# Spec 13 — Waitlist Page with Facility Referral

## Goal

Build a public waitlist page at `/waitlist` that collects professional sign-ups and, after sign-up, prompts them to nominate facilities they know that use locum staff — turning every professional into a warm lead generator for the demand side of the marketplace. The page works without authentication.

-----

## Why This Feature Matters

In a two-sided marketplace, supply-side referrals are almost always more valuable than demand-side referrals, because supply-side participants have inside knowledge. A professional recommending a facility is worth more than any cold outreach — they have worked locum shifts there, know the medical director, and know the pay rates. This turns the waitlist into crowdsourced demand generation: professionals nominate facilities, and you reach out armed with a warm introduction (“Dr. Adewale, who locums at your clinic, told us about you”), which converts far better than cold outreach.

The waitlist also uses a referral mechanic from day one: every person who signs up has a clear reason to contribute — they move up the waitlist for every facility they nominate.

-----

## The Flow

```
Professional lands on waitlist page
        ↓
Fills in: Name, Email, Phone, Specialty, City
        ↓
Clicks "Join the Waitlist" → Success screen replaces form
        ↓
SUCCESS SCREEN:
"You're on the list! You are #47 in line."
        ↓
"Know a clinic that needs locum staff?
 Tell us about them — we'll reach out on your behalf.
 You'll move up the waitlist for every facility you nominate."
        ↓
Optional referral form (accordion) expands:
- Facility name (required)
- City / Area (required)
- Facility type
- Contact person (optional)
- Contact phone/email (optional)
- Your connection to this facility (required)
        ↓
"Submit Facility" button
        ↓
Confirmation: "Thanks! We'll reach out to [facility].
You've moved up 10 spots."
        ↓
Option: "Nominate another facility" (can submit multiple)
```

**What you get as founder:** a database of warm facility leads, each with an insider contact and the professional’s relationship to the facility (worked there = hottest lead).

**What the professional gets:** ownership in building the platform, a better waitlist position, and the feeling that their recommendation helped a facility they care about.

-----

## Design

### Page 1 — Sign-up Form (`/waitlist`)

- **Auth required:** No — fully public
- Dark surface (`#0A0A0A`) full page
- Locumii logo centred at top
- Heading: “Healthcare shifts, done right.” — 56px, white, Inter 700, letter-spacing `-2.8px`
- Subtext: “Join the waitlist. Be first when we launch in Abuja.” — 16px, `#888888`
- White card below, max-width `480px`, centred, padding `32px`, border-radius `12px`, border `1px solid #E5E5E5`

**Form fields inside card:**

1. Full name (text, required)
1. Email address (email, required)
1. Phone number (tel, required) — Nigerian format, placeholder “+234 800 000 0000”
1. Specialty (select, required): Medical Doctor · Nurse / Midwife · Pharmacist · Medical Laboratory Scientist · Other Healthcare Professional
1. City (select, required): Abuja · Lagos · Other
1. How did you hear about us? (select, optional): Twitter/X · WhatsApp · LinkedIn · A colleague told me · Other

**Submit button:** Full width, height `44px`, background `#0B6E6E`, white text “Join the Waitlist”, border-radius `8px`.

**Below form:** Small text — “Already 200+ professionals waiting. No spam. Unsubscribe anytime.”

### Success State (replaces form after submission)

- Heading: “You’re on the list! 🎉”
- Subtext: “We’ll notify you on WhatsApp and email when Locumii launches in [their city].”
- Position display: large number — “You are #[N] in line” — JetBrains Mono, 48px, teal `#0B6E6E`
- Divider line
- Referral prompt heading (18px, weight 600, `#111111`): “Know a clinic that needs locum staff?”
- Body (14px, `#6B7280`): “Professionals like you know which clinics hire locums. Tell us about them — we’ll reach out on your behalf. You’ll move up the waitlist for every facility you nominate.”
- “Nominate a Facility” button: outlined, teal border and text, full width — expands the referral form below (accordion style, smooth animation)

### Referral Form (accordion, expands below the button)

**Fields:**

1. Facility name (text, required) — placeholder “e.g. Cedarcrest Hospital”
1. City / Area (text, required) — placeholder “e.g. Wuse 2, Abuja”
1. Facility type (select, required): Private Clinic · Hospital · Pharmacy · Diagnostic / Lab Centre · Other
1. Contact person name (text, optional) — placeholder “e.g. Dr. Amaka (Medical Director)”
1. Contact phone or email (text, optional)
1. Your connection to this facility (select, required): I have worked locum shifts there · I know someone who works there · I’ve heard they hire locums · Other

**Submit button:** “Submit Facility” — teal, full width

**On submit:**

- POST to `facility_referrals`
- Store: referee_email (from the waitlist sign-up in session/local state), facility_name, city, facility_type, contact_name, contact_info, relationship, created_at
- Show inline success below the form: ✅ “Thanks! We’ll reach out to [facility name]. You’ve moved up 10 spots.”
- Reset the referral form fields
- Show “Nominate another facility” link — re-opens the form for a second submission

-----

## Implementation

### Database Migration — `013_create_waitlist.sql`

```sql
create table public.waitlist_signups (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null unique,
  phone text not null,
  specialty text not null,
  city text not null,
  referral_source text,
  position serial,
  created_at timestamptz default now()
);

alter table public.waitlist_signups enable row level security;

-- Public can insert (anon key permitted); reads require service_role (admin only)
create policy "waitlist_insert_public"
  on public.waitlist_signups for insert
  with check (true);


create table public.facility_referrals (
  id uuid default gen_random_uuid() primary key,
  referee_email text not null,
  facility_name text not null,
  city text not null,
  facility_type text not null,
  contact_name text,
  contact_info text,
  relationship text not null,
  status text default 'pending'
    check (status in ('pending', 'contacted', 'signed_up', 'not_interested')),
  created_at timestamptz default now()
);

alter table public.facility_referrals enable row level security;

create policy "referrals_insert_public"
  on public.facility_referrals for insert
  with check (true);
```

### File Locations (follow architecture.md boundaries)

- `src/pages/Waitlist.jsx` — the full page component
- `src/hooks/useWaitlist.js` — all Supabase calls:
  - `joinWaitlist(formData)` → insert into `waitlist_signups`, return position number
  - `submitFacilityReferral(referralData)` → insert into `facility_referrals`
- `src/components/waitlist/WaitlistForm.jsx` — the sign-up form
- `src/components/waitlist/SuccessState.jsx` — post-signup success content including position display and referral prompt
- `src/components/waitlist/FacilityReferralForm.jsx` — the accordion referral form

Add route in `App.jsx`:

```jsx
<Route path="/waitlist" element={<Waitlist />} />
```

This route needs NO ProtectedRoute wrapper — it is public.

### Design Tokens (from ui-context.md)

|Element               |Value                                                   |
|----------------------|--------------------------------------------------------|
|Page background       |`#0A0A0A`                                               |
|Card background       |`#FFFFFF`                                               |
|Card border           |`1px solid #E5E5E5`                                     |
|Input border (default)|`#D1D5DB`                                               |
|Input border (focus)  |`#0B6E6E` + box-shadow `0 0 0 3px rgba(11,110,110,0.25)`|
|Primary button        |`#0B6E6E`                                               |
|Position number       |JetBrains Mono, `#0B6E6E`                               |
|Heading on dark       |`#FFFFFF`                                               |
|Body on dark          |`#888888`                                               |
|Success green         |`#16A34A`                                               |

### Validation Rules

- Email: valid email format
- Phone: starts with 07, 08, or 09, exactly 11 digits (or +234 followed by 10 digits)
- Duplicate email: if Supabase returns unique violation, show “This email is already on the waitlist.” below the email field
- Facility referral: facility_name and city required before submit enables

-----

## Dependencies

No new dependencies beyond the existing stack (Supabase client, React Router).

-----

## Verification Checklist

- [ ] Form submits and inserts a row into `waitlist_signups`
- [ ] Position number returned and displayed correctly
- [ ] Duplicate email shows a friendly error, not a raw Supabase error
- [ ] Form replaces with success state on submit (no page reload)
- [ ] Referral accordion opens and closes smoothly
- [ ] Facility referral inserts a row into `facility_referrals` with `referee_email` from the sign-up session
- [ ] Multiple facility referrals can be submitted by the same person
- [ ] Success message shows the facility name after referral submit
- [ ] Page is fully responsive on mobile (375px width minimum)
- [ ] No authentication required — anon Supabase key used
- [ ] `service_role` key does not appear anywhere in `src/`
- [ ] Page loads fast — no unnecessary data fetching on mount

-----

## Implementation notes (as built — 2026-06-15)

Reconciled with the already-shipped waitlist (migration 030) rather than the original
draft above; the divergences are intentional:

- **Table:** kept the existing `public.waitlist` (email / full_name / role) instead of
  creating a separate `waitlist_signups`. No second signup table, no duplicated data,
  and the existing `waitlist_count()` / landing social-proof / GA `generate_lead` flow
  is untouched. The signup form is unchanged (role + email + name).
- **Position is honest, not a fixed "+10".** `waitlist_position(email)` ranks everyone
  by nomination count (desc) then signup time (asc), so nominating a facility genuinely
  moves you up relative to non-nominators. The UI shows the real new position, not a
  hardcoded jump. (Verified: a test nomination moved a signup from #3 → #1.)
- **New table:** `public.facility_referrals` (migration 036) stores the leads. Inserts
  go through the `submit_facility_referral` SECURITY DEFINER RPC (validates the
  nominator is on the waitlist + required fields, returns the new position); admins read
  + manage status via RLS. There is no separate `referee_email` session hack — the
  email comes from the just-completed signup in component state.
- **Admin:** `/admin/referrals` ("Leads") lists nominations with a status dropdown
  (pending → contacted → signed_up / not_interested) and CSV export.
- **Analytics:** a `facility_referral` GA event fires per nomination (alongside the
  existing `generate_lead` on signup).