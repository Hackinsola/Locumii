# Spec 04 — Professional Profile & Credential Upload

## Goal

Allow a verified-pending professional to complete their profile with specialty, registration number, experience, bio, and preferred cities, then upload the three required credential documents so an admin can review and approve them.

-----

## Design

### Pages

- `/professional/profile/setup` — multi-step profile completion (shown after first login if profile incomplete)
- `/professional/profile` — view and edit own profile
- `/professional/profile/credentials` — upload and view credential documents

### Visual

- Profile setup uses a stepped form: Step 1 (personal info) → Step 2 (credentials upload)
- Progress indicator at top: two dots, active dot is teal `#0B6E6E`
- Each step renders in a white card, max-width `560px`, centred
- Credentials section: three upload zones, one per document type
- Upload zone: dashed border `#D1D5DB`, `border-radius: 12px`, `padding: 24px`, centred icon + label
- Uploaded state: solid border `#0B6E6E`, green checkmark, filename shown, “Replace” link
- Verified badge: green pill `#F0FDF4` background, `#16A34A` text, checkmark icon — shown on profile when `is_verified = true`
- Pending badge: amber pill — shown when credentials uploaded but not yet approved
- Bank account section: separate card below credential section, added after profile is approved

### Profile View

- Avatar circle (initials fallback), name, specialty, council reg number
- Verified badge or Pending badge
- Years of experience, bio
- Average star rating (hidden until first completed shift)
- Preferred cities as tags
- “Edit Profile” button

-----

## Implementation

### 1. Database Migration — `002_create_professional_profiles.sql`

```sql
create table public.professional_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  full_name text not null,
  specialty text not null check (specialty in ('doctor', 'nurse', 'pharmacist', 'medical_lab_scientist')),
  council_reg_number text not null,
  years_experience int not null check (years_experience >= 0),
  bio text,
  preferred_cities text[] default '{}',
  is_verified boolean default false,
  avg_rating numeric(3,2),
  bank_account_number text,
  bank_code text,
  bank_account_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.professional_profiles enable row level security;

create policy "prof_read_any_authenticated"
  on public.professional_profiles for select
  using (auth.role() = 'authenticated');

create policy "prof_insert_own"
  on public.professional_profiles for insert
  with check (auth.uid() = user_id);

create policy "prof_update_own"
  on public.professional_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 2. Database Migration — `003_create_credentials.sql`

```sql
create table public.credentials (
  id uuid default gen_random_uuid() primary key,
  professional_id uuid references public.users(id) on delete cascade not null,
  doc_type text not null check (doc_type in ('mdcn_license', 'nysc_cert', 'government_id')),
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  expires_at date,
  created_at timestamptz default now(),
  unique(professional_id, doc_type)
);

alter table public.credentials enable row level security;

create policy "cred_read_own"
  on public.credentials for select
  using (auth.uid() = professional_id);

create policy "cred_insert_own"
  on public.credentials for insert
  with check (auth.uid() = professional_id);

-- Only Edge Functions (service_role) can update status
-- No update policy for authenticated users
```

### 3. Supabase Storage Setup

- Create bucket named `credentials`
- Set bucket to **private** (no public access)
- Storage policy: authenticated user can upload to path `{user_id}/*` only
- Admin (service_role) can read all paths

### 4. `src/hooks/useProfile.js`

Exports:

- `createProfile(profileData)` — inserts into `professional_profiles`
- `updateProfile(profileData)` — updates own `professional_profiles` row
- `getProfile(userId)` — fetches profile by user_id
- `getOwnProfile()` — fetches profile for current auth user
- `uploadCredential({ docType, file })` — uploads file to Supabase Storage at `{userId}/{docType}/{filename}`, then inserts/upserts into `credentials` table with the storage path
- `getCredentials()` — fetches all credentials for current user
- `getSignedUrl(storagePath)` — generates 15-minute signed URL (used only by admin — but hook exposes for admin page too)
- `linkBankAccount({ accountNumber, bankCode, accountName })` — updates `bank_account_number`, `bank_code`, `bank_account_name` on profile
- `loading`, `error`

### 5. Pages

**`src/pages/professional/ProfileSetup.jsx`**

- Check on mount: if `professional_profiles` row exists for current user, redirect to `/professional/dashboard`
- Step 1 form fields:
  - Full name (text, required)
  - Specialty (select: Doctor, Nurse, Pharmacist, Medical Lab Scientist — maps to db values)
  - Council registration number (text, required)
  - Years of experience (number, min 0)
  - Preferred cities (multi-select: Abuja, Lagos — MVP cities only)
  - Bio (textarea, max 300 chars, optional)
- On Step 1 submit: call `createProfile()`. On success, advance to Step 2.
- Step 2: three upload zones — MDCN/Council License, NYSC Certificate, Government ID
  - Each accepts PDF or image (JPG, PNG, WEBP), max 5MB
  - On file select: call `uploadCredential()` immediately
  - Show filename + green check when uploaded
  - All three required before “Submit for Review” button enables
- On submit: redirect to `/auth/pending` with message “Your credentials are under review”

**`src/pages/professional/Profile.jsx`**

- Fetch own profile on mount via `getOwnProfile()`
- Render profile card as described in Design section
- “Edit Profile” opens inline edit form (same fields as setup Step 1, excluding specialty which cannot be changed after creation)
- Separate “Credentials” tab shows upload status of each document
- Separate “Bank Account” card (only shown when `is_verified = true`): account number, bank name, “Update” button

**`src/components/profiles/VerifiedBadge.jsx`**

- Props: `isVerified` (bool), `isPending` (bool)
- Renders green “Verified” pill or amber “Pending Review” pill

**`src/components/profiles/CredentialUploadZone.jsx`**

- Props: `docType`, `label`, `currentStatus`, `onUpload`
- Renders upload zone with dashed border
- Shows status badge (pending/approved/rejected) if credential already exists
- File input accept: `".pdf,.jpg,.jpeg,.png,.webp"`

### 6. `src/utils/validators.js` additions

```js
export const validateCouncilRegNumber = (specialty, number) => {
  // MDCN format: MDC/YYYY/NNNNN
  // PCN (pharmacy): PCN/YYYY/NNNNN
  // NMCN (nursing): NM/YYYY/NNNNN
  // MLSCN (lab): MLS/YYYY/NNNNN
  const patterns = {
    doctor: /^MDC\/\d{4}\/\d+$/,
    pharmacist: /^PCN\/\d{4}\/\d+$/,
    nurse: /^NM\/\d{4}\/\d+$/,
    medical_lab_scientist: /^MLS\/\d{4}\/\d+$/,
  }
  return patterns[specialty]?.test(number) ?? false
}

export const validateFileUpload = (file) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (!allowed.includes(file.type)) return 'File must be PDF, JPG, PNG, or WEBP'
  if (file.size > maxSize) return 'File must be under 5MB'
  return null
}
```

-----

## Dependencies

No new dependencies beyond Spec 01.

-----

## Verification Checklist

- [ ] Professional can complete profile setup and be redirected to pending screen
- [ ] Profile row exists in `professional_profiles` after setup
- [ ] All three credential files upload to Supabase Storage at correct path `{userId}/{docType}/{filename}`
- [ ] Credential rows are inserted into `credentials` table with `status = 'pending'`
- [ ] File validation blocks files over 5MB and non-allowed types with a visible error message
- [ ] Specialty cannot be changed after profile creation
- [ ] Council registration number format is validated per specialty
- [ ] Credentials bucket has no public URL — `getSignedUrl` generates 15-min signed URL only
- [ ] `VerifiedBadge` shows correct state: green for verified, amber for pending, nothing if no credentials submitted
- [ ] Bank account section is hidden until `is_verified = true`
- [ ] Profile page is accessible only to the owning professional (RLS blocks other users)