# Progress Tracker — Locumii

Update this file after every meaningful implementation change.

-----

## Current Phase

- **Phase 0 — Foundation & Specification**

## Current Goal

- Complete all planning and specification documents before writing a single line of application code.

-----

## Completed

- [x] **Market research** — Validated the ShiftKey model, identified the Nigerian locum staffing gap, confirmed ProLocums Nigeria as early-stage competition with low tech sophistication.
- [x] **Product decision** — Chose a two-sided shift marketplace for Nigerian healthcare professionals (doctors, nurses, pharmacists, medical lab scientists) and facilities (clinics, hospitals, diagnostic labs).
- [x] **`project-overview.md`** — One-paragraph summary, 6 goals, full professional and facility user flows, features by category, in-scope, out-of-scope, and 8-point success criteria.
- [x] **`architecture.md`** — Full stack table (React + Supabase + Paystack + Termii), system boundaries with folder ownership rules, storage model (PostgreSQL / Supabase Storage / Zustand), auth and RLS model, Edge Function definitions, and 7 invariants.
- [x] **`ai-workflow-rules.md`** — Spec-driven agent rules covering scoping, task splitting, ambiguity handling, protected files, documentation sync, and a full verification checklist with invariant gates.
- [x] **`ui-context.md`** — Complete color token system (brand, neutral, semantic status, shift status badges), typography scale (DM Serif Display + DM Sans + JetBrains Mono), border radius scale, spacing scale, shadow scale, component color assignments (buttons, inputs, nav), verified badge spec, and WCAG AA accessibility notes.
- [x] **`locumii-landing.html`** — Visual landing page proof-of-concept rendering the full UI context: teal/amber palette, shift cards with status badges, stats bar, for-professionals and for-facilities panels, notification stack, and footer.
- [x] **Project scaffold** — Vite + React (JavaScript, no TypeScript per `code-standards.md`) at the repo root alongside `Context/`. Tailwind CSS v4 via `@tailwindcss/vite`; `@/*` import alias in `vite.config.js` + `jsconfig.json`.
- [x] **Editor navbar (`Feature-specs/02-editor.md`)** — `src/components/editor/editor-navbar.jsx`: fixed-height (`h-14`) top navbar with left/center/right sections; left holds a ghost icon `Button` that toggles the sidebar, swapping `PanelLeftOpen`/`PanelLeftClose` (lucide) on `isSidebarOpen`; center and right sections present but empty; pure-neutral dark background (`bg-neutral-950`) with a subtle bottom border (`border-neutral-800`). Dumb component — takes `isSidebarOpen`/`onToggleSidebar` props, holds no state. **Done-checks passed:** `vite build` succeeds, `eslint` clean, esbuild transform parses OK.
- [x] **Editor layout (`Feature-specs/02-editor.md`)** — `src/components/editor/editor-layout.jsx`: full-height (`h-screen`) flex column that frames every editor screen. Owns the ephemeral `isSidebarOpen` state (local `useState`, not Zustand) and the named `handleToggleSidebar` handler, passing both into `EditorNavbar`. Below the navbar: a collapsible `aside` sidebar shell (`w-64` ↔ `w-0`, animated, right border, empty pending its spec) plus a scrollable light `main` content region rendering `children`. Mounted in `src/App.jsx`, replacing the Vite scaffold so the chrome actually renders. **Done-checks passed:** `vite build` succeeds (editor modules bundled, JS ~226 kB), `eslint` clean on app/editor files.
- [x] **Design system & UI primitives (`Feature-specs/01-design-systems.md`)** — `shadcn/ui` installed & configured for JSX (`components.json` `"tsx": false`, neutral base color, Geist font / Nova preset, Lucide icons). Components added to `src/components/ui/`: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea (left unmodified per spec). `lucide-react` installed. Reusable `cn()` helper at `src/lib/utils.js`. **Done-checks passed:** all 7 components bundle without import errors (esbuild through the `@` alias + node_modules), and `cn()` correctly handles conditionals, nested arrays/objects, and Tailwind conflict resolution.
- [x] **Database schema — all 10 tables (`architecture.md` Storage Model)** — Migrations `supabase/migrations/001`–`013` written and applied to the live project (`akfepyrsbtjyctatsxns`). `001` enum types; `002`–`011` the ten tables (`users`, `professional_profiles`, `facility_profiles`, `credentials`, `shifts`, `bids`, `shift_confirmations`, `transactions`, `ratings`, `notifications`), each with RLS enabled and explicit policies; `012` the private `credentials` Storage bucket + storage RLS (INV-06); `013` security/index hardening (advisor remediations). **All seven invariants enforced at the DB layer:** INV-02 (`bids_enforce_verified` trigger + RLS `with check`), INV-03 (`bids_enforce_no_overlap` overlap-prevention trigger), INV-04 (`transactions_enforce_immutable` trigger), INV-07 (`shifts_enforce_status_transition` state-machine trigger); INV-01/05/06 are policy/secret-handling rules not yet exercised by code. **Done-checks passed:** all 13 migrations applied without error; `get_advisors(security)` returns **zero** findings; 12 triggers verified attached; 9 enum types + 2 `private`-schema RLS helpers + private bucket confirmed via catalog query.

-----

## In Progress

- **Editor chrome (`Feature-specs/02-editor.md`)** — Navbar + layout shell done (below). The sidebar's *contents* are foreshadowed in the spec intro but not yet specified; the layout currently renders an empty collapsible sidebar shell awaiting that follow-up chapter.

-----

## Next Up

1. **`dev-setup.md`** — Local environment setup: Node version, Supabase CLI install, environment variables required, how to run migrations, how to start the dev server.
1. **Supabase Auth config (dashboard)** — Confirm email/password provider is enabled and SMTP (Resend) is wired. The DB schema and private `credentials` bucket are done; this is the remaining piece of the original "project initialisation" item.
1. **`src/lib/supabase.js` + env** — Supabase client singleton reading `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; add both to `.env.example`. (URL is `https://akfepyrsbtjyctatsxns.supabase.co`.)
1. **Auth flows** — Registration (role selection → email/password → `users` row insert via a `SECURITY DEFINER` trigger on `auth.users` so `role` cannot be self-assigned — this trigger is intentionally **not** in the schema migrations yet), login, logout, password reset, protected route guards by role. The trigger must also set the `app_metadata.role` JWT claim that every RLS policy depends on.
1. **Professional onboarding** — Profile creation form, document upload to Supabase Storage, credential submission to pending queue.
1. **Admin credential review panel** — Queue of pending credentials, approve/reject actions, badge flip on approval, SMS notification trigger.
1. **Shift feed (Professional)** — Browse open shifts, filter by city/role/date, shift detail page, bid submission with overlap prevention.
1. **Shift management (Facility)** — Post a shift with Paystack upfront payment, view bids, accept/reject, auto-cancel competing bids via Edge Function.
1. **Shift confirmation and payment release** — Check-in flow, dual confirmation, `release-payment` Edge Function, payout to bank account.
1. **Ratings** — Post-completion rating flow for both parties, display on profiles.

-----

## Open Questions

- **App name confirmed?** “Locumii” is the working title used across all documents. Confirm before buying a domain or setting up Supabase project name.
- **Abuja-only launch geography** — All spec documents scope the MVP to FCT. Confirm this before building location filters (hardcoded city list vs. open text field).
- **Admin user creation** — Architecture specifies admins are created directly in the database, not through the public UI. Confirm who the first admin user will be and how their account will be seeded.
- **Termii vs. alternative SMS gateway** — Termii is specified in `architecture.md`. Confirm account is created and API key is available before building any Edge Function that calls `send-sms`.
- **Professional types** — Four types are in scope: Medical Doctor, Nurse, Pharmacist, Medical Laboratory Scientist. Confirm whether NYSC-posted health workers are treated as a separate type or fall under one of these four.
- **Paystack escrow mechanism** — Paystack does not have a native escrow product. The escrow model described in the spec is implemented by collecting the full amount upfront (Paystack inline) and holding it in the platform’s Paystack balance until the `release-payment` Edge Function initiates a transfer. Confirm this approach is understood before building the payment flow.

-----

## Architecture Decisions

- **Frontend:** React (Vite) — single-page app, mobile browser first, no native app for MVP.
- **Backend:** Supabase (PostgreSQL + PostgREST + Auth + Storage + Edge Functions) — no custom Express/Node server.
- **Payments:** Paystack — inline popup for collection, Transfer API (server-side only) for disbursement. The Paystack secret key never touches the frontend.
- **SMS:** Termii — all SMS routed through a single `send-sms` Edge Function; no other function or frontend code calls Termii directly.
- **Escrow:** Implemented at the application layer — funds collected upfront via Paystack inline, held in platform Paystack balance, released via Edge Function after dual confirmation.
- **Credential verification:** Manual admin review for MVP — no OCR, no government API integration.
- **Overlap prevention:** Enforced by a PostgreSQL constraint function on the `bids` table, not by application code alone.
- **Immutable ledger:** `transactions` table rows with `status = released` are locked by a PostgreSQL trigger — no UPDATE is permitted, disputes create new rows.
- **Launch geography:** Abuja FCT only. Lagos is Phase 2.
- **Color system:** Deep teal primary (`#0B6E6E`), amber-gold accent (`#D4900A`), burgundy critical (`#8A1A1A` — not red). Fonts: DM Serif Display (headings), DM Sans (body), JetBrains Mono (Naira amounts only).

-----

## Session Notes

- All five foundation documents (`project-overview.md`, `architecture.md`, `ai-workflow-rules.md`, `ui-context.md`, `locumii-landing.html`) are complete and consistent with each other. No implementation code has been written yet.
- The landing page HTML (`locumii-landing.html`) is a design proof-of-concept only — it is not part of the application source tree. It should not be moved into `src/`.
- The next session should begin with `dev-setup.md` and Supabase project initialisation before any React code is written.
- All seven architecture invariants (INV-01 through INV-07) are defined in `architecture.md` and referenced in the `ai-workflow-rules.md` verification checklist. Any agent starting work must read both files before writing code.
- The Paystack escrow model is application-layer, not a native Paystack feature — this must be clearly communicated to any developer or agent picking up the payments task.
- **Implementation has begun.** The design-system spec (`Feature-specs/01-design-systems.md`) is complete. This came before `dev-setup.md`/Supabase init (the original "Next Up" order) at the user's explicit direction. Node.js LTS (v24) was installed on the dev machine to enable the npm/npx toolchain.
- **Resolved spec conflict:** the design-system spec requested `lib/utils.ts`, but `code-standards.md` forbids TypeScript. Per user decision, the `cn()` helper stays at `src/lib/utils.js` (JavaScript). The spec's `.ts` is treated as a typo for this JS-only project. If the spec text should be corrected, that is a human edit (spec files are not auto-edited to match code).
- shadcn uses the **Nova** preset (Geist + Lucide) and **neutral** base color, aligning with `ui-context.md`. The stock shadcn theme tokens in `src/index.css` are **not yet** mapped to the Locumii teal/amber brand tokens — wiring the full brand token system is a separate, not-yet-scoped task.
- **Database schema is live (migrations 001–013, applied via Supabase MCP).** Implementation notes / minor deviations from `architecture.md`, surfaced here rather than edited into the spec (per `ai-workflow-rules.md` §5/§6 — spec files are human-edited only):
  - **Money columns hold kobo, not Naira.** Per user decision, the `*_naira` column names from `architecture.md` are kept, but the stored values are integer **kobo** (per `code-standards.md`). Column comments document this. `money.js` must divide by 100 for display. If the spec should be corrected to say `_kobo`, that is a human edit.
  - **Two RLS helper functions live in a `private` schema** (`private.is_shift_facility`, `private.is_accepted_shift_professional`), not `public`. They are `SECURITY DEFINER` (needed to avoid RLS recursion on `bids`/`shifts`); moving them out of the API-exposed `public` schema clears the advisor's "SECURITY DEFINER callable via RPC" warning. `public.is_admin()` stays in `public` (it is `SECURITY INVOKER` and only returns whether the caller is an admin).
  - **Shifts read access was extended** so a professional can still read a shift they have bid on once it leaves `open` status (`shifts_select_own_bids` policy in `007`). `architecture.md`'s RLS table only lists "open rows readable by any authenticated user" — this is a necessary corollary, not a contradiction.
  - **The `users` registration insert has no client RLS policy by design.** Inserting a `users` row is deferred to the auth-flow unit and must run through a `SECURITY DEFINER` trigger on `auth.users`, so a user cannot self-assign `role = 'admin'`.
  - **Deferred (not blocking, MVP scale):** the performance advisor's `auth_rls_initplan` warnings (wrap `auth.uid()`/`is_admin()` in `(select …)` inside policies) and one `multiple_permissive_policies` note on `shifts` SELECT remain. These are scale optimisations on currently-empty tables; revisit before launch via a dedicated policy-optimisation migration. `unused_index` INFOs are expected (no traffic yet).