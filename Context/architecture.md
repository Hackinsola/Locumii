# Architecture — Locumii

-----

## Stack Table

|Layer                 |Technology                       |Role                                                                |
|----------------------|---------------------------------|--------------------------------------------------------------------|
|**Frontend**          |React (Vite)                     |Single-page web application; all UI rendered client-side            |
|**Styling**           |Tailwind CSS                     |Utility-first responsive styling; mobile-first layout               |
|**Routing**           |React Router v6                  |Client-side page routing; protected routes per user role            |
|**State management**  |Zustand                          |Global client state for auth session, notifications, and shift feed |
|**Backend / API**     |Supabase (PostgreSQL + PostgREST)|Relational database, auto-generated REST API, and row-level security|
|**Auth**              |Supabase Auth                    |Email/password authentication; JWT tokens; session management       |
|**File storage**      |Supabase Storage                 |Credential document uploads (PDFs and images); private buckets      |
|**Background jobs**   |Supabase Edge Functions (Deno)   |Shift reminders, escrow release triggers, bid auto-cancellation     |
|**Payments**          |Paystack API                     |Upfront payment collection, escrow hold, bank transfer disbursement |
|**SMS notifications** |Termii API                       |Transactional SMS for Nigerian numbers (MTN, Airtel, Glo, 9mobile)  |
|**Email**             |Supabase Auth SMTP (Resend)      |Password reset and account confirmation emails                      |
|**Hosting**           |Vercel                           |Frontend static deployment with automatic preview URLs per branch   |
|**Environment config**|`.env` files + Vercel env vars   |All secrets and API keys; never committed to version control        |

-----

## System Boundaries

Each folder owns exactly one responsibility. No folder reaches into another’s internals.

```
locumii/
│
├── src/
│   ├── pages/              # Route-level components; one file per page/screen
│   │   ├── auth/           # Login, Register, ForgotPassword
│   │   ├── professional/   # Dashboard, ShiftFeed, BidHistory, Earnings, Profile
│   │   ├── facility/       # Dashboard, PostShift, ManageBids, ShiftHistory
│   │   └── admin/          # CredentialQueue, FacilityQueue, UserManager, Transactions
│   │
│   ├── components/         # Reusable UI components with no business logic
│   │   ├── shifts/         # ShiftCard, ShiftDetail, BidButton, StatusBadge
│   │   ├── profiles/       # ProfessionalCard, FacilityCard, VerifiedBadge, StarRating
│   │   ├── payments/       # EscrowStatus, PayoutSummary, TransactionRow
│   │   └── ui/             # Button, Modal, Input, Toast, Spinner, EmptyState
│   │
│   ├── hooks/              # Custom React hooks; own all data-fetching logic
│   │   ├── useShifts.js    # Browse, post, filter, and paginate shifts
│   │   ├── useBids.js      # Submit, cancel, accept, and reject bids
│   │   ├── useAuth.js      # Session, login, logout, role detection
│   │   ├── useProfile.js   # Read and update professional/facility profiles
│   │   └── usePayments.js  # Fetch transaction history and payout status
│   │
│   ├── lib/                # Third-party client initialisation; no business logic
│   │   ├── supabase.js     # Supabase client singleton
│   │   ├── paystack.js     # Paystack inline payment initialiser
│   │   └── termii.js       # Termii SMS helper (called via Edge Function only)
│   │
│   ├── store/              # Zustand global state slices
│   │   ├── authStore.js    # Current user session and role
│   │   └── notifStore.js   # In-app notification feed
│   │
│   └── utils/              # Pure functions with no side effects
│       ├── dateTime.js     # Shift overlap detection, formatting, WAT timezone helpers
│       ├── money.js        # Naira formatting, commission calculation (10%)
│       └── validators.js   # Form validation rules (MDCN number format, phone, etc.)
│
├── supabase/
│   ├── migrations/         # Sequential SQL migration files; one file per schema change
│   ├── functions/          # Supabase Edge Functions (Deno/TypeScript)
│   │   ├── release-payment/        # Triggered after both parties confirm; calls Paystack transfer API
│   │   ├── send-shift-reminder/    # Cron: fires 2 hours before each accepted shift
│   │   ├── auto-cancel-bids/       # Triggered after bid acceptance; declines competing bids
│   │   └── send-sms/               # Internal wrapper around Termii API; called by other functions
│   └── seed.sql            # Dev-only seed data (test users, sample shifts)
│
└── public/                 # Static assets: favicon, og-image, manifest
```

**Rules for system boundaries:**

- `pages/` may import from `components/`, `hooks/`, `store/`, and `utils/`. It never calls Supabase or Paystack directly.
- `components/` may import from `utils/` and other `components/`. It never imports from `hooks/` or `store/`.
- `hooks/` may import from `lib/` and `utils/`. It never imports from `components/` or `pages/`.
- `lib/` holds only client initialisation. It has zero business logic.
- Edge Functions in `supabase/functions/` are the only code that calls Termii and the Paystack Transfer API. No frontend code calls these APIs directly.

-----

## Storage Model

### PostgreSQL (Supabase) — Relational Data

Everything that needs to be queried, filtered, joined, or counted lives in the database.

|Table                  |Key Columns                                                                                                                                                                                             |Notes                                                                       |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
|`users`                |`id`, `email`, `role` (`professional` | `facility` | `admin`), `phone`, `status` (`pending` | `active` | `suspended`)                                                                                   |Mirrors Supabase Auth; `role` and `status` are application-managed          |
|`professional_profiles`|`user_id`, `full_name`, `specialty`, `council_reg_number`, `years_experience`, `bio`, `preferred_cities`, `is_verified`, `avg_rating`, `bank_account_number`, `bank_code`                               |One row per professional; `is_verified` flips to `true` only by admin action|
|`facility_profiles`    |`user_id`, `facility_name`, `facility_type`, `cac_number`, `address`, `city`, `state`, `contact_name`, `is_verified`, `avg_rating`                                                                      |One row per facility                                                        |
|`credentials`          |`id`, `professional_id`, `doc_type` (`mdcn_license` | `nysc_cert` | `government_id`), `storage_path`, `status` (`pending` | `approved` | `rejected`), `reviewed_by`, `reviewed_at`, `expires_at`        |`storage_path` points to Supabase Storage; never stores the file itself     |
|`shifts`               |`id`, `facility_id`, `role_required`, `start_time`, `end_time`, `pay_rate_naira`, `requirements`, `city`, `status` (`open` | `filled` | `in_progress` | `completed` | `cancelled`), `paystack_reference`|`paystack_reference` links to the escrow payment                            |
|`bids`                 |`id`, `shift_id`, `professional_id`, `status` (`pending` | `accepted` | `rejected` | `cancelled`), `submitted_at`                                                                                       |At most one bid per professional per shift                                  |
|`shift_confirmations`  |`shift_id`, `professional_confirmed_at`, `facility_confirmed_at`                                                                                                                                        |Payment release is triggered when both timestamps are populated             |
|`transactions`         |`id`, `shift_id`, `gross_amount_naira`, `commission_naira`, `net_amount_naira`, `paystack_transfer_code`, `status` (`escrow` | `released` | `failed`), `released_at`                                    |Immutable audit log; rows are never updated, only inserted                  |
|`ratings`              |`id`, `shift_id`, `rater_user_id`, `ratee_user_id`, `score` (1–5), `comment`, `created_at`                                                                                                              |Two rows per completed shift (one per direction)                            |
|`notifications`        |`id`, `user_id`, `type`, `body`, `is_read`, `created_at`                                                                                                                                                |In-app notification feed                                                    |

### Supabase Storage — File Storage

Only credential documents. All buckets are **private** — no public URLs.

|Bucket       |Path pattern                              |Access                                                                       |
|-------------|------------------------------------------|-----------------------------------------------------------------------------|
|`credentials`|`/{professional_id}/{doc_type}/{filename}`|Professional can upload; admin can read; professional can read own files only|

Files are never served directly to the frontend. A signed URL with a 15-minute expiry is generated on demand when an admin opens a document for review.

### Client-Side (Zustand) — Ephemeral State

No persistent data lives in the client store. The store holds only what is needed for the current session and is reset on logout.

|Store slice |What it holds                                               |
|------------|------------------------------------------------------------|
|`authStore` |`userId`, `role`, `isVerified`, `sessionToken`              |
|`notifStore`|Unread notification count and latest 20 notification objects|

### What is explicitly not cached or stored client-side

- Payment amounts or transaction records (always fetched fresh from DB)
- Credential document contents or URLs (generated server-side per request)
- Bid statuses (always fetched from DB to prevent stale accept/reject UI)

-----

## Auth and Access Model

### Authentication

Supabase Auth handles email/password login and issues JWTs. The JWT is stored in `localStorage` by the Supabase client and attached to every API request as a `Bearer` token. Session refresh is handled automatically by the Supabase client SDK.

On registration, a row is inserted into the `users` table with the user’s `role` (`professional` or `facility`) and `status` set to `pending`. The JWT’s `app_metadata.role` claim is set at registration and used by Row-Level Security policies.

### Row-Level Security (RLS)

All tables have RLS enabled. No table is publicly readable or writable without an authenticated JWT. Key policies:

|Table                  |Read                                                        |Write                                                                              |
|-----------------------|------------------------------------------------------------|-----------------------------------------------------------------------------------|
|`shifts`               |`status = 'open'` rows readable by any authenticated user   |Insert: facility only; Update: facility (own shifts) or Edge Function              |
|`bids`                 |Professional sees own bids; facility sees bids on own shifts|Insert: professional only (own bids); Update: Edge Function only                   |
|`professional_profiles`|Any authenticated user can read; admin can read all         |Professional can update own row only                                               |
|`credentials`          |Professional reads own; admin reads all                     |Professional inserts own; admin updates `status` only                              |
|`transactions`         |Professional reads own; facility reads own; admin reads all |Insert and update: Edge Function only — never the frontend                         |
|`ratings`              |Public read                                                 |Insert: authenticated user who was party to the shift, once per shift per direction|
|`notifications`        |User reads own only                                         |Insert: Edge Function only                                                         |

### Ownership Rules

- A **professional** owns their `professional_profiles` row, their `credentials` rows, and their `bids` rows. They cannot read other professionals’ credential documents.
- A **facility** owns their `facility_profiles` row and their `shifts` rows. They cannot see the bank account details of professionals.
- An **admin** is a `users` row with `role = 'admin'`, created directly in the database. Admins are not registerable through the public UI.
- **Edge Functions** run with the Supabase `service_role` key, which bypasses RLS. This key is stored only in Edge Function environment variables and is never sent to the client.

### Protected Routes (Frontend)

|Route prefix     |Allowed roles                                                    |
|-----------------|-----------------------------------------------------------------|
|`/professional/*`|`professional` with `status = active`                            |
|`/facility/*`    |`facility` with `status = active`                                |
|`/admin/*`       |`admin` only                                                     |
|`/auth/*`        |Unauthenticated only (redirect to dashboard if already logged in)|

-----

## Background Tasks and Edge Functions

There is no AI in the MVP. All background logic is handled by Supabase Edge Functions (Deno/TypeScript), either triggered by database webhooks or scheduled as cron jobs.

|Function             |Trigger                                          |What it does                                                                                                                                                                                                                               |
|---------------------|-------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|`auto-cancel-bids`   |DB webhook on `bids.status` UPDATE to `accepted` |Sets all other `pending` bids on the same `shift_id` to `cancelled`; sends SMS to each declined professional via `send-sms`                                                                                                                |
|`send-shift-reminder`|Cron: runs every 15 minutes                      |Queries for shifts with `start_time` between now+105min and now+120min with `status = filled`; sends SMS reminder to both the professional and the facility contact                                                                        |
|`release-payment`    |DB webhook on `shift_confirmations` INSERT/UPDATE|When both `professional_confirmed_at` and `facility_confirmed_at` are non-null, calls Paystack Transfer API to disburse net amount to professional’s bank; inserts a `transactions` row with `status = released`; sends SMS to professional|
|`send-sms`           |Called internally by other Edge Functions        |Wraps Termii API; accepts `{ phone, message }` and handles retries; logs failures to a `sms_log` table                                                                                                                                     |

**No Edge Function is callable directly from the frontend.** They are invoked only by database webhooks or the Supabase cron scheduler. The Paystack secret key and Termii API key exist only in Edge Function environment variables.

-----

## Invariants

Rules the codebase must never violate. These are non-negotiable regardless of deadline pressure or feature requests.

**INV-01 — Money never moves from the frontend.**
The frontend never calls the Paystack Transfer API directly. Payment collection (facility paying upfront) uses the Paystack inline popup on the client, but the transfer of funds to a professional’s bank account is triggered exclusively by the `release-payment` Edge Function after both parties confirm the shift. Any code that initiates a bank transfer must run server-side with the `service_role` key.

**INV-02 — An unverified professional cannot bid on a shift.**
`professional_profiles.is_verified` must be `true` before a bid can be inserted. This check is enforced at two layers: the frontend disables the bid button when `is_verified = false`, and an RLS policy on the `bids` table rejects any INSERT where the professional’s `is_verified` is not `true`. Both layers must remain in place.

**INV-03 — A professional cannot hold two accepted bids for overlapping shifts.**
Before any bid is set to `accepted`, the database must check for an existing `accepted` bid by the same `professional_id` where the shift’s `start_time`/`end_time` overlaps with the newly accepted shift. This check is enforced by a PostgreSQL constraint function on the `bids` table, not by application code alone. Removing or weakening this constraint requires an explicit migration and written justification.

**INV-04 — A `transactions` row is never updated after `status = released`.**
The `transactions` table is an immutable financial ledger. Once a row’s `status` is set to `released`, no column on that row may be changed. This is enforced by a PostgreSQL trigger that raises an exception on any UPDATE to a row where `status = 'released'`. Dispute resolution creates new rows; it does not mutate existing ones.

**INV-05 — The `service_role` key never appears in frontend code or version control.**
The Supabase `service_role` key bypasses all RLS policies. It must exist only in Supabase Edge Function environment variables and in the CI/CD secrets vault (Vercel env vars). A pre-commit hook must scan for the key string pattern and block any commit that contains it. If the key is ever committed, it must be rotated immediately.

**INV-06 — Credential documents are never publicly accessible.**
The `credentials` Supabase Storage bucket must remain private. No code may generate a public URL for a credential document. All document access goes through a signed URL with a maximum expiry of 15 minutes, generated only when an admin explicitly requests to review a document. The bucket ACL must be audited before every production deployment.

**INV-07 — Shift `status` transitions are one-directional and enumerated.**
A shift may only move forward through the following state machine: `open → filled → in_progress → completed`. It may also move to `cancelled` from `open` or `filled` only. No other transitions are valid. This is enforced by a PostgreSQL check constraint on `shifts.status` and a trigger that rejects backward transitions. A shift cannot return from `completed` to any prior state under any circumstance.