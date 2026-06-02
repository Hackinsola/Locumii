# Code Standards — Locumii

These standards apply to every file in this codebase. They are not preferences. An AI agent or human developer must follow them without exception. Where a standard conflicts with a library’s default behaviour, this document wins.

-----

## General

- **One module, one responsibility.** Every file does one thing. A component renders UI. A hook fetches or mutates data. A utility transforms a value. If a file is doing two of those things, split it.
- **Fix the root cause, never layer a workaround.** If a bug requires a `setTimeout`, a double-fetch, or a conditional that only fires “sometimes”, that is a signal the root cause has not been found. Find it and fix it before merging.
- **Do not mix concerns in one component or hook.** A component that fetches data, formats currency, and handles a form submission is three things pretending to be one. Extract each concern into its correct layer.
- **Fail loudly in development, fail gracefully in production.** Use `console.error` and thrown exceptions freely in development. In production, every error must result in a user-visible message, not a silent failure or a white screen.
- **Delete dead code immediately.** Commented-out blocks, unused imports, unreferenced variables, and orphaned files are removed at the end of every task. Do not leave them “for reference”.
- **No abbreviations in identifiers unless they are universally standard.** Write `professionalId`, not `profId`. Write `shiftStatus`, not `shtSts`. Exceptions: `id`, `url`, `api`, `sms`, `rls`.

-----

## JavaScript / React

- **React (Vite) with JavaScript — not TypeScript.** This project uses `.js` and `.jsx` files throughout. Do not introduce `.ts` or `.tsx` files. Do not install TypeScript or configure `tsconfig.json`.
- **Validate external input at every boundary.** Any value arriving from Supabase, Paystack webhooks, URL params, or form fields is untrusted until validated. Validate before using. Do not assume shape.
- **No `any`-equivalent patterns.** Do not use unguarded `JSON.parse` without a try/catch. Do not access nested object properties without null-checking the parent. Use optional chaining (`?.`) and nullish coalescing (`??`) where appropriate.
- **Explicit error handling on every async call.** Every `await` expression inside a hook or Edge Function must be wrapped in a try/catch or have a `.catch()` handler. Silent promise rejections are not acceptable.
- **No `useEffect` for data fetching.** All data fetching lives in custom hooks in `src/hooks/`. Do not fetch data inside a `useEffect` directly in a page or component. Call the hook instead.
- **No inline event handlers with logic.** Extract named handler functions. Do not write `onClick={() => { doA(); doB(); doC(); }}` inline in JSX. Name the function and define it in the component body.
- **Prop drilling stops at two levels.** If a value needs to pass through more than two component layers, move it to a Zustand store slice or fetch it in the relevant hook.
- **Every list rendered with `.map()` has a stable, unique `key` prop.** Never use array index as a key for data that can be reordered, added to, or removed from.

-----

## React Component Rules

- **Pages are thin.** A page component composes hooks and components. It contains no formatting logic, no data transformation, and no direct Supabase calls. Its JSX should read like an outline of the screen, not an implementation.
- **Components are dumb.** A component in `src/components/` receives props and renders UI. It does not call hooks from `src/hooks/`. It does not import from `src/store/`. It does not know where its data came from.
- **One component per file.** Do not define multiple exported components in a single file. Helper sub-components used only within that file may be defined in the same file but must not be exported.
- **Component files use PascalCase.** `ShiftCard.jsx`, `VerifiedBadge.jsx`, `BidButton.jsx`. Hook files use camelCase with the `use` prefix: `useShifts.js`, `useBids.js`.
- **Default exports for pages and components. Named exports for hooks and utilities.** This keeps import paths predictable across the codebase.

-----

## Styling (Tailwind CSS)

- **Use CSS custom property tokens for all colors — no hardcoded hex values in JSX or CSS.** Write `text-[var(--color-brand-primary)]` or define a Tailwind config alias. Never write `text-[#0B6E6E]` directly.
- **Follow the border radius scale from `ui-context.md`.** The allowed values are `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px), and `--radius-full` (9999px). Do not introduce other radius values.
- **Follow the spacing scale from `ui-context.md`.** Use the defined `--space-*` tokens. Do not invent arbitrary pixel values like `mt-[13px]` or `p-[22px]`.
- **Mobile-first, always.** Write base styles for mobile viewport first. Use `md:` and `lg:` prefixes for larger breakpoints. Never write desktop-only styles without mobile equivalents.
- **No inline `style` prop for layout or color.** Inline styles are permitted only for dynamically computed values that cannot be expressed in Tailwind (e.g. a progress bar width derived from a percentage). Color and spacing must use Tailwind classes and token references.
- **Naira amounts use JetBrains Mono.** Apply `font-mono` class (configured to JetBrains Mono) to every element displaying a ₦ amount. All other text uses DM Sans.
- **Do not use Tailwind’s `text-red-*` classes.** Red is excluded from this design system. Use `text-[var(--color-status-critical)]` for error states.

-----

## Hooks

- **Every hook returns a consistent shape.** All data-fetching hooks return `{ data, loading, error }` at minimum. Mutation hooks return `{ mutate, loading, error }`. Do not return bare values.
- **Hooks own all Supabase calls.** No page, component, or utility may import `supabase` from `src/lib/supabase.js` directly. Only hooks may call the Supabase client.
- **Hooks are not called conditionally.** Never call a hook inside an `if` block, a loop, or a callback. Follow the Rules of Hooks without exception.
- **A hook that mutates data must invalidate or refresh the relevant query after the mutation completes.** Do not leave the UI showing stale data after a write. Re-fetch or update local state explicitly.
- **Hooks do not navigate.** Routing decisions (`navigate()`, `<Navigate />`) belong in page components, not in hooks. A hook may return an error or status that a page uses to decide whether to navigate.

-----

## Supabase (Edge Functions — Deno/TypeScript)

- **All Edge Function files use TypeScript.** Unlike the frontend, Edge Functions are written in `.ts` and run in the Deno runtime. Strict typing is required.
- **Every Edge Function validates its input before processing.** A webhook payload, a cron trigger context, or any incoming request body must be parsed and validated before any database query or API call runs.
- **Every Edge Function returns a structured JSON response with an explicit HTTP status code.** Do not return plain strings or unstructured bodies. Return `{ success: true }` or `{ error: "description" }` with appropriate 200/400/500 codes.
- **Edge Functions use the `service_role` client only when RLS must be bypassed.** For read operations that can be scoped to the triggering user, use the anon client with a user JWT. Reserve `service_role` for writes that cross ownership boundaries (e.g. releasing payment, cancelling bids).
- **No Edge Function makes a network call to an external API without a timeout.** Set an explicit timeout on all `fetch()` calls to Paystack and Termii. Default: 10 seconds. Log and surface timeout errors — do not swallow them.
- **The `send-sms` function is the only code that calls the Termii API.** Every other Edge Function that needs to send an SMS must call `send-sms` internally. Duplicate Termii integration elsewhere is not permitted.

-----

## API and Data Access

- **Read RLS policies first, write application code second.** Before writing any hook that reads or writes a table, confirm the RLS policy for that table in `architecture.md`. Do not write a query that RLS will silently block and then debug it as a code error.
- **Never SELECT `*` in production queries.** Always name the columns you need. This prevents accidental exposure of sensitive fields (e.g. `bank_account_number`, `cac_number`) and keeps query payloads small.
- **Paginate every list query.** No query fetches an unbounded list. Use Supabase’s `.range(from, to)` with a maximum page size of 20 rows. Shift feed, bid lists, transaction history, and admin queues are all paginated.
- **Financial amounts are stored and transmitted as integers in kobo.** All Naira amounts in the database are stored as integer values in kobo (1 Naira = 100 kobo) to avoid floating-point errors. The `money.js` utility handles conversion to display format. Do not store or compute amounts as floats.
- **Do not store sensitive fields in `localStorage` or Zustand.** Bank account numbers, credential document paths, and CAC numbers are never written to client-side storage. Fetch them fresh from the database when needed.
- **`transactions` rows are insert-only after `status = released`.** Never write an UPDATE statement targeting a released transaction row. If a correction is required, insert a new row with a reference to the original. This is enforced by a database trigger but the application code must also respect it.

-----

## Payments (Paystack)

- **The Paystack inline popup is the only payment UI on the frontend.** Do not build a custom card form. Do not redirect to an external payment page. Use the official Paystack inline script loaded via `src/lib/paystack.js`.
- **Every Paystack payment reference is stored in the `shifts` table before the popup opens.** Generate the reference server-side (or use a UUID on the client), write it to `shifts.paystack_reference`, then open the popup with that reference. This ensures the reference exists in the database regardless of whether the popup closes normally or unexpectedly.
- **Verify every payment server-side before treating it as complete.** After the Paystack popup fires its success callback, call the Paystack Verify Transaction endpoint from an Edge Function before updating the shift status to `filled`. Never trust the client-side callback alone.
- **Commission is always 10% of gross amount, calculated server-side.** The `release-payment` Edge Function computes `commission_naira = Math.round(gross * 0.10)` and `net_amount_naira = gross - commission_naira`. This calculation never happens on the frontend.

-----

## File Organisation

- `src/pages/` — Route-level components only. One file per screen. No business logic, no direct Supabase calls, no data transformation.
- `src/components/` — Reusable UI components. Receive props, render markup. No hooks from `src/hooks/`, no store imports.
- `src/hooks/` — All data fetching and mutation logic. Every Supabase query lives here. Returns `{ data, loading, error }` or `{ mutate, loading, error }`.
- `src/lib/` — Third-party client initialisation only. One file per client. No business logic, no conditional initialisation.
- `src/store/` — Zustand slices for ephemeral session state. Only `authStore` and `notifStore` exist at MVP. New slices require explicit instruction and a justification for why hook state or prop passing is insufficient.
- `src/utils/` — Pure functions with no side effects. No imports from `src/hooks/`, `src/lib/`, or `src/store/`. No async functions. Input in, value out.
- `supabase/migrations/` — Sequential SQL migration files named `NNN_description.sql` (e.g. `001_create_users.sql`). One file per schema change. Applied migration files are never edited.
- `supabase/functions/` — One directory per Edge Function. Each directory contains an `index.ts` entry point. Shared utilities between functions go in `supabase/functions/_shared/`.
- `public/` — Static assets only: `favicon.ico`, `og-image.png`, `manifest.json`. No source files.

-----

## Naming Conventions

|Thing                |Convention                         |Example                    |
|---------------------|-----------------------------------|---------------------------|
|Component files      |PascalCase `.jsx`                  |`ShiftCard.jsx`            |
|Hook files           |camelCase `.js` with `use` prefix  |`useShifts.js`             |
|Utility files        |camelCase `.js`                    |`dateTime.js`              |
|Store files          |camelCase `.js` with `Store` suffix|`authStore.js`             |
|Migration files      |`NNN_snake_case.sql`               |`003_add_shift_checkin.sql`|
|Edge Function dirs   |kebab-case                         |`release-payment/`         |
|Database tables      |`snake_case`, plural               |`professional_profiles`    |
|Database columns     |`snake_case`                       |`pay_rate_naira`           |
|React props          |camelCase                          |`isVerified`, `shiftId`    |
|CSS token references |kebab-case with `--` prefix        |`--color-brand-primary`    |
|Environment variables|`SCREAMING_SNAKE_CASE`             |`SUPABASE_SERVICE_ROLE_KEY`|

-----

## What Is Explicitly Prohibited

- `console.log` in committed code. Use `console.error` for genuine errors only.
- Hardcoded Naira amounts, commission rates, or page sizes in component or hook files. These belong in a constants file.
- Direct DOM manipulation with `document.querySelector` or `ref.current.style`. Use React state and Tailwind classes.
- `dangerouslySetInnerHTML` anywhere in the codebase without an explicit security review comment.
- Fetching data in a `useEffect` inside a page or component — use a hook.
- Any `fetch()` call to the Paystack Transfer API from `src/` — this belongs only in `supabase/functions/release-payment/`.
- Any `fetch()` call to the Termii API from anywhere other than `supabase/functions/send-sms/`.
- Storing financial amounts as floats — use integers in kobo.
- Using array index as a React list key.