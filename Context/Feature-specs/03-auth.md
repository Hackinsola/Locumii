# Spec 01 — Authentication & Registration

## Goal

Enable professionals and facilities to create accounts, log in, reset their password, and be routed to the correct dashboard based on their role. Registration must capture role, phone number, and email at signup before any other profile data is entered.

-----

## Design

### Pages

- `/auth/register` — two-step: (1) role selection card, (2) registration form
- `/auth/login` — email + password form
- `/auth/forgot-password` — email input, sends reset link
- `/auth/reset-password` — new password form (loaded from email link)

### Visual

- All auth pages render on pure white `#FFFFFF` background
- Single centred card, max-width `440px`, `border: 1px solid #E5E5E5`, `border-radius: 12px`, padding `32px`
- Locumii logo at top of card, centred
- Role selection: two clickable cards side by side — “I am a Healthcare Professional” and “I am a Healthcare Facility” — teal border on selected state
- Form inputs: height `42px`, border `#D1D5DB`, focus border `#0B6E6E` + focus ring `0 0 0 3px rgba(11,110,110,0.25)`
- Primary button: `background #0B6E6E`, full width, height `42px`, `border-radius: 8px`
- Error messages render in `#DC2626` below the relevant input field, font-size `12px`
- No dark mode on auth pages

### Registration Form Fields (Step 2)

- Full name (text)
- Email address (email)
- Phone number (tel) — Nigerian format, prefixed `+234`
- Password (password) — minimum 8 characters
- Confirm password (password)

-----

## Implementation

### 1. Supabase Auth Setup

- Enable email/password provider in Supabase Auth dashboard
- Configure Resend SMTP for password reset emails
- Set site URL to production domain in Supabase Auth settings
- Set redirect URL for password reset to `/auth/reset-password`

### 2. Database Migration — `001_create_users.sql`

```sql
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null check (role in ('professional', 'facility', 'admin')),
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz default now()
);

alter table public.users enable row level security;

-- Users can read their own row only
create policy "users_read_own"
  on public.users for select
  using (auth.uid() = id);

-- Users can update their own row (phone only — role and status are admin-managed)
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (role = (select role from public.users where id = auth.uid()));
```

### 3. `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 4. `src/hooks/useAuth.js`

Exports:

- `register({ email, password, phone, role })` — calls `supabase.auth.signUp`, then inserts into `public.users` with role and phone
- `login({ email, password })` — calls `supabase.auth.signInWithPassword`
- `logout()` — calls `supabase.auth.signOut`, clears `authStore`
- `sendPasswordReset(email)` — calls `supabase.auth.resetPasswordForEmail`
- `updatePassword(newPassword)` — calls `supabase.auth.updateUser`
- `session` — current session object
- `user` — current user from `authStore`
- `loading` — boolean
- `error` — string or null

### 5. `src/store/authStore.js`

```js
// Zustand slice
{
  userId: null,
  role: null,       // 'professional' | 'facility' | 'admin'
  isVerified: false,
  sessionToken: null,
  setSession: (session) => ...,
  clearSession: () => ...
}
```

Hydrate from `supabase.auth.getSession()` on app mount in `App.jsx`.

### 6. Pages

**`src/pages/auth/Register.jsx`**

- Step 1: Render two role cards. On click, set local state `selectedRole`. Show “Continue” button only when a role is selected.
- Step 2: Render registration form. On submit, call `register()` from `useAuth`. On success, redirect to `/auth/pending` (a simple “Check your email” screen).
- Validate: email format, password ≥ 8 chars, passwords match, phone is valid Nigerian number (starts with 07, 08, or 09, 11 digits total).

**`src/pages/auth/Login.jsx`**

- Form: email + password. On submit call `login()`.
- On success: read `role` from `authStore`. Redirect to `/professional/dashboard` or `/facility/dashboard` accordingly.
- Link to `/auth/forgot-password` below form.

**`src/pages/auth/ForgotPassword.jsx`**

- Single email input. On submit call `sendPasswordReset()`. Show success message regardless of whether email exists (security best practice).

**`src/pages/auth/ResetPassword.jsx`**

- Two password inputs. On submit call `updatePassword()`. On success redirect to `/auth/login`.

### 7. Protected Route Component

`src/components/ui/ProtectedRoute.jsx`

- Reads `authStore`. If no session, redirect to `/auth/login`.
- If `role` does not match the required role prop, redirect to correct dashboard.
- If `status === 'pending'`, redirect to `/auth/pending` (approval waiting screen).
- If `status === 'suspended'`, redirect to `/auth/suspended` (account suspended screen).

### 8. `src/pages/auth/Pending.jsx`

Simple screen: “Your account is under review. You will receive an SMS and email within 48 hours once approved.” No actions except logout link.

### 9. App.jsx Route Setup

```jsx
<Routes>
  <Route path="/auth/register" element={<Register />} />
  <Route path="/auth/login" element={<Login />} />
  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
  <Route path="/auth/reset-password" element={<ResetPassword />} />
  <Route path="/auth/pending" element={<Pending />} />
  <Route path="/professional/*" element={
    <ProtectedRoute role="professional"><ProfessionalRoutes /></ProtectedRoute>
  } />
  <Route path="/facility/*" element={
    <ProtectedRoute role="facility"><FacilityRoutes /></ProtectedRoute>
  } />
  <Route path="/admin/*" element={
    <ProtectedRoute role="admin"><AdminRoutes /></ProtectedRoute>
  } />
  <Route path="/" element={<Navigate to="/auth/login" />} />
</Routes>
```

### 10. `.env` Variables Required

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

-----

## Dependencies

```
@supabase/supabase-js
react-router-dom
zustand
```

-----

## Verification Checklist

- [ ] Professional can register, receive confirmation email, and be redirected to pending screen
- [ ] Facility can register with the same flow
- [ ] Login redirects professional to `/professional/dashboard` and facility to `/facility/dashboard`
- [ ] Login with wrong password shows error message below password field — not an alert
- [ ] Password reset email arrives and reset link works
- [ ] `users` table row is created on registration with correct `role` and `status = 'pending'`
- [ ] Navigating to `/professional/*` while logged out redirects to `/auth/login`
- [ ] Navigating to `/facility/*` while logged in as professional redirects to `/professional/dashboard`
- [ ] Phone number validation blocks non-Nigerian formats
- [ ] `service_role` key does not appear anywhere in `src/`
- [ ] Auth pages are not accessible when already logged in (redirect to dashboard)