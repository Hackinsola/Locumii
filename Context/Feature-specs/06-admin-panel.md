# Spec 06 — Admin Panel

## Goal

Give the platform admin a web interface to approve/reject professional credentials, verify facilities, manage user accounts, and view a transaction log — without requiring direct database access.

-----

## Design

### Pages

- `/admin/dashboard` — counts: pending credentials, pending facilities, total users, total revenue
- `/admin/credentials` — queue of pending credential uploads
- `/admin/facilities` — queue of pending facility verifications
- `/admin/users` — searchable user list with suspend/ban actions
- `/admin/transactions` — paginated transaction log

### Visual

- Admin pages use a simple two-column layout: fixed left sidebar (200px) + main content area
- Sidebar background: `#111111`, links in `#888888`, active link in `#FFFFFF` with `#0B6E6E` left border
- Main area background: `#FAFAFA`
- Credential review: two-panel view — left shows document (in iframe for PDF, img tag for images), right shows professional info and approve/reject buttons
- Approve button: teal `#0B6E6E`. Reject button: outlined destructive. Both require confirmation modal.
- Rejection requires a text field for reason (sent to professional via SMS)
- User table: columns — name, email, role, status, joined date, actions
- Transaction table: columns — shift ID, facility, professional, gross amount, commission, net, status, date

-----

## Implementation

### 1. Admin User Creation

- Admin accounts are NOT created through the public UI
- Run this SQL directly in Supabase dashboard to create the first admin:

```sql
-- First create the auth user via Supabase dashboard Auth tab
-- Then insert into public.users:
insert into public.users (id, email, role, phone, status)
values ('<auth_user_id>', 'admin@locumii.ng', 'admin', '+2348000000000', 'active');
```

### 2. Database Migration — `005_admin_rls_policies.sql`

```sql
-- Admin can read all users
create policy "admin_read_all_users"
  on public.users for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Admin can update user status (suspend/ban)
create policy "admin_update_user_status"
  on public.users for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Admin can read all credentials
create policy "admin_read_all_credentials"
  on public.credentials for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Admin can update credential status
create policy "admin_update_credential_status"
  on public.credentials for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Admin can read all facility profiles
create policy "admin_read_all_facilities"
  on public.facility_profiles for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Admin can update facility is_verified
create policy "admin_update_facility_verified"
  on public.facility_profiles for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Admin can update professional is_verified
create policy "admin_update_professional_verified"
  on public.professional_profiles for update
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Admin reads all transactions
create policy "admin_read_all_transactions"
  on public.transactions for select
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
```

### 3. `src/hooks/useAdmin.js`

Exports:

- `getPendingCredentials()` — fetches credentials with `status = 'pending'`, joined with professional name
- `approveCredential(credentialId, professionalId)` — updates `credentials.status = 'approved'`, `reviewed_by`, `reviewed_at`. If all 3 credentials approved, sets `professional_profiles.is_verified = true` and `users.status = 'active'`. Calls `send-sms` via Supabase Edge Function invoke.
- `rejectCredential(credentialId, professionalId, reason)` — updates `status = 'rejected'`, stores `rejection_reason`. Calls `send-sms`.
- `getSignedCredentialUrl(storagePath)` — generates 15-min signed URL for the document file
- `getPendingFacilities()` — fetches facilities with `is_verified = false`
- `approveFacility(facilityUserId)` — sets `facility_profiles.is_verified = true`, `users.status = 'active'`. Calls `send-sms`.
- `rejectFacility(facilityUserId, reason)` — sets `users.status = 'suspended'`. Calls `send-sms`.
- `getUsers({ role, status, search })` — paginated user list
- `suspendUser(userId)` — sets `users.status = 'suspended'`
- `banUser(userId)` — sets `users.status = 'suspended'` (same for MVP; ban = permanent suspension)
- `reactivateUser(userId)` — sets `users.status = 'active'`
- `getTransactions({ page })` — paginated, 20 per page
- `getDashboardCounts()` — returns `{ pendingCredentials, pendingFacilities, totalUsers, totalRevenue }`
- `loading`, `error`

### 4. Pages

**`src/pages/admin/Dashboard.jsx`**

- Four stat cards: Pending Credentials, Pending Facilities, Total Users, Total Revenue (sum of `commission_naira` from released transactions)
- Quick links to each queue

**`src/pages/admin/CredentialQueue.jsx`**

- List of pending credentials grouped by professional
- Each row: professional name, specialty, document type, uploaded date, “Review” button
- “Review” opens a full-page review panel:
  - Left 60%: document viewer. PDF → `<iframe src={signedUrl}>`. Image → `<img src={signedUrl}>`. Signed URL fetched on open, expires in 15 min.
  - Right 40%: professional info (name, specialty, reg number, which doc this is), Approve button, Reject button
  - Reject shows modal with text input for reason
- After approve/reject: row disappears from queue, SMS sent to professional

**`src/pages/admin/FacilityQueue.jsx`**

- List of unverified facilities
- Each row: facility name, type, city, CAC number, contact, submitted date, Approve / Reject buttons
- Approve sets `is_verified = true`, sends SMS to facility email contact
- Reject opens modal with reason field

**`src/pages/admin/UserManager.jsx`**

- Search bar (filters by name/email)
- Role filter tabs: All | Professional | Facility
- Status filter: All | Active | Pending | Suspended
- Table: name, email, role, status, joined date
- Actions per row: Suspend | Reactivate | View Profile
- All destructive actions require confirmation modal

**`src/pages/admin/Transactions.jsx`**

- Paginated table, 20 per page
- Columns: date, shift role, facility name, professional name, gross (₦), commission (₦), net (₦), status
- Status badge: escrow (amber), released (green), failed (red)
- No edit actions — read only

### 5. `src/components/ui/ConfirmModal.jsx`

- Props: `isOpen`, `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`, `isDestructive`
- Used for all approve/reject/suspend actions

### 6. Approval Logic — All 3 Credentials Required

When `approveCredential` is called:

1. Update the specific credential to `approved`
1. Count approved credentials for this professional
1. If count = 3, set `professional_profiles.is_verified = true` AND `users.status = 'active'`
1. Call `send-sms` Edge Function with approval message

-----

## Dependencies

No new dependencies.

-----

## Verification Checklist

- [ ] Admin login redirects to `/admin/dashboard`
- [ ] Non-admin users cannot access `/admin/*` routes
- [ ] Pending credential count on dashboard matches actual DB count
- [ ] Credential document opens in viewer via signed URL — URL expires after 15 minutes
- [ ] Approving all 3 credentials sets `is_verified = true` and `status = 'active'` on professional
- [ ] Approving fewer than 3 credentials does NOT set `is_verified = true`
- [ ] Rejection stores reason in `credentials.rejection_reason`
- [ ] Approved credential disappears from queue immediately
- [ ] Facility approve sets `is_verified = true` and `status = 'active'`
- [ ] Suspend user sets `status = 'suspended'` — suspended user cannot log in or use the app
- [ ] Transaction table is read-only — no edit buttons present
- [ ] `getTransactions` pagination works — page 2 returns correct offset
- [ ] `getDashboardCounts` total revenue only sums `released` transactions
- [ ] No credential document URL is a public URL — all are signed