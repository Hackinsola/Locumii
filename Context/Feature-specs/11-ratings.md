# Spec 11 — Ratings & Reviews

## Goal

After each completed shift, prompt both the professional and the facility to leave a 1–5 star rating with an optional comment. Display average ratings publicly on both profile types and flag professionals who fall below 3.0 stars after 5+ completed shifts.

-----

## Design

### Rating Flow

- After a shift is marked `completed`, both parties see a “Rate your experience” prompt on their dashboard
- Prompt appears as a dismissible banner card at the top of the dashboard
- Clicking the banner opens a rating modal

### Rating Modal

- Large star selector (1–5): interactive stars, teal `#0B6E6E` filled, grey `#E5E5E5` unfilled
- Optional comment textarea: max 200 characters, placeholder “Share your experience (optional)”
- “Submit Rating” button — teal, full width
- “Skip” link below button (dismisses modal, rating not submitted, prompt disappears for this shift)

### Profile Display

- Star rating row: filled stars in teal + grey empty stars + “(4.8 · 12 reviews)”
- Hidden until at least 1 rating exists
- On professional profile: rating shown below name and verified badge
- On facility profile: shown in facility card and shift detail page

### Admin Flag

- Professionals with `avg_rating < 3.0` AND `completed shifts >= 5` appear with a red flag icon in the admin user manager

-----

## Implementation

### 1. Database Migration — `012_create_ratings.sql`

```sql
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  shift_id uuid references public.shifts(id) not null,
  rater_user_id uuid references public.users(id) not null,
  ratee_user_id uuid references public.users(id) not null,
  score int not null check (score between 1 and 5),
  comment text check (char_length(comment) <= 200),
  created_at timestamptz default now(),
  unique(shift_id, rater_user_id) -- one rating per rater per shift
);

alter table public.ratings enable row level security;

-- Anyone authenticated can read ratings (they appear on public profiles)
create policy "ratings_read_public"
  on public.ratings for select
  using (auth.role() = 'authenticated');

-- Only parties to the shift can insert a rating for that shift
create policy "ratings_insert_shift_party"
  on public.ratings for insert
  with check (
    auth.uid() = rater_user_id and
    (
      -- Professional who completed the shift
      exists (
        select 1 from public.bids b
        where b.shift_id = ratings.shift_id
          and b.professional_id = auth.uid()
          and b.status = 'accepted'
      )
      or
      -- Facility that posted the shift
      exists (
        select 1 from public.shifts s
        where s.id = ratings.shift_id
          and s.facility_id = auth.uid()
          and s.status = 'completed'
      )
    )
  );
```

### 2. Database Function — Auto-update avg_rating

```sql
create or replace function update_avg_rating()
returns trigger as $$
begin
  -- Update professional avg_rating
  update public.professional_profiles
  set avg_rating = (
    select round(avg(score)::numeric, 2)
    from public.ratings
    where ratee_user_id = new.ratee_user_id
  )
  where user_id = new.ratee_user_id;

  -- Update facility avg_rating
  update public.facility_profiles
  set avg_rating = (
    select round(avg(score)::numeric, 2)
    from public.ratings
    where ratee_user_id = new.ratee_user_id
  )
  where user_id = new.ratee_user_id;

  return new;
end;
$$ language plpgsql;

create trigger ratings_update_avg
  after insert on public.ratings
  for each row execute function update_avg_rating();
```

### 3. `src/hooks/useRatings.js`

Exports:

- `submitRating({ shiftId, rateeUserId, score, comment })` — inserts into `ratings`. Validates shift is `completed` and current user was a party.
- `getPendingRatings()` — fetches completed shifts where the current user has NOT yet submitted a rating. Returns array of `{ shift, rateeProfile }`.
- `getRatingsForUser(userId)` — fetches all ratings where `ratee_user_id = userId`
- `hasRatedShift(shiftId)` — boolean check for current user
- `loading`, `error`

### 4. Components

**`src/components/ui/StarRating.jsx`**
Props: `value` (number 1-5), `interactive` (bool), `onChange` (func, only when interactive), `size` (‘sm’ | ‘md’ | ‘lg’)

- Renders 5 stars
- Interactive mode: hover highlights, click sets value
- Display mode: fills stars to `value`, shows empty for remainder
- Sizes: sm = 14px, md = 20px, lg = 28px
- Filled star color: `#0B6E6E`. Empty: `#E5E5E5`.

**`src/components/ui/RatingModal.jsx`**
Props: `isOpen`, `shift`, `rateeProfile`, `raterRole`, `onSubmit`, `onSkip`

- Modal with shift summary at top
- Heading: “How was your experience?” (if professional rating facility) or “How did [name] perform?” (if facility rating professional)
- `StarRating` component in interactive mode, size ‘lg’
- Comment textarea
- Submit + Skip

**`src/components/ui/RatingPromptBanner.jsx`**
Props: `pendingRatings` (array), `onRate` (func)

- Shown at top of dashboard when `pendingRatings.length > 0`
- Card: “You have [N] shift(s) to rate. Your feedback helps the community.”
- “Rate Now” button opens `RatingModal` for first pending rating
- After rating: moves to next pending, or dismisses if all done

**`src/components/profiles/StarDisplay.jsx`**
Props: `avgRating`, `reviewCount`

- Renders `{avgRating} · {reviewCount} reviews`
- Hidden if `reviewCount = 0`

### 5. Dashboard Integration

**Professional Dashboard**

- On mount: call `getPendingRatings()`
- If results: render `RatingPromptBanner` above main content

**Facility Dashboard**

- Same — on mount call `getPendingRatings()`, render banner if pending

### 6. Admin Flag Logic

In `src/pages/admin/UserManager.jsx`:

- When rendering professional rows in the user table, check:
  
  ```js
  const isFlagged = profile.avg_rating < 3.0 && completedShiftCount >= 5
  ```
- If flagged: show red flag icon 🚩 next to name
- Completed shift count fetched from a count query on `bids` where `status = 'accepted'` and shift `status = 'completed'`

-----

## Dependencies

No new dependencies.

-----

## Verification Checklist

- [ ] Professional can only rate a shift once — unique constraint blocks second insert
- [ ] Facility can only rate a shift once — same constraint
- [ ] Non-party to a shift cannot submit a rating for it — RLS blocks insert
- [ ] Rating modal shows correct heading depending on who is rating who
- [ ] Star selector is interactive — hover and click work on both desktop and mobile
- [ ] Comment is optional — submission works without it
- [ ] Skipping rating dismisses the prompt for that shift — does NOT insert a rating row
- [ ] `avg_rating` updates on professional/facility profile immediately after rating insert (trigger fires)
- [ ] Star display hidden on profiles with 0 ratings
- [ ] Rating prompt banner disappears after all pending ratings are submitted
- [ ] Admin user manager shows 🚩 flag on professionals with `avg_rating < 3.0` AND `≥ 5` completed shifts
- [ ] `getRatingsForUser` returns correct ratings for a given user
- [ ] Rating score is stored as integer 1-5 — no decimals in `ratings` table
- [ ] `avg_rating` on profile rounded to 2 decimal places