# AI Workflow Rules — Locumii

These are binding rules for any AI coding agent working on this codebase. Follow them exactly. Do not interpret them as suggestions. Do not deviate from them because a task seems simple or because a shortcut appears harmless.

-----

## 1. Overall Approach

**Work spec-first, code second.**
Before writing any code for a unit of work, read `project-overview.md` and `architecture.md` in full. If the task touches the database, read the relevant migration files. Confirm your understanding of what the unit is supposed to do, what it must not do, and where it lives in the folder structure before writing the first line.

**Treat the spec as the source of truth.**
If the code disagrees with `project-overview.md` or `architecture.md`, the spec is correct and the code must change — not the spec. Do not silently update the spec to match something you built. If you believe the spec is wrong, stop and surface the contradiction explicitly before proceeding.

**Build incrementally, not speculatively.**
Each task produces one working, tested unit. That unit is complete before the next one begins. Do not scaffold future features while building the current one. Do not create placeholder files, stub routes, or commented-out code for things that are out of scope for the current task.

-----

## 2. Scoping Rules

**Build exactly what the current task describes. Nothing more.**
If the task says “build the shift feed page with filters for city, role, and date,” build those three filters. Do not add a pay-rate filter because it seems useful. Do not add a sort dropdown because you noticed the design might need one. Scope additions require a new explicit instruction.

**Do not touch files that are not required by the current task.**
If you are building `src/pages/professional/ShiftFeed.jsx`, do not modify `src/pages/facility/PostShift.jsx`, do not refactor `src/hooks/useShifts.js` beyond what the task requires, and do not update `src/components/ui/Button.jsx` unless the task explicitly says to. Every file you touch is a file that can break.

**Do not install new dependencies without explicit instruction.**
If you believe a library would help, name it, explain why, and wait for approval. Do not add it to `package.json` and proceed.

**Do not create new database tables or columns speculatively.**
Every schema change requires a migration file with a sequential name (e.g., `003_add_shift_checkin.sql`). Do not modify an existing migration file after it has been applied. If a schema change is needed that was not in the task, stop and flag it before writing any code that depends on it.

**Do not write code that references environment variables that are not already defined.**
If a task requires a new secret (e.g., a new API key), list the required variable name and its purpose, then wait for confirmation that it has been added to `.env` and to the Vercel secrets vault before writing code that reads it.

-----

## 3. When to Split Work into Smaller Steps

Split a task into smaller steps before writing any code when any of the following is true:

- The task requires changes to more than three files simultaneously.
- The task requires both a schema migration and frontend changes in the same unit.
- The task touches the payment flow — any work involving Paystack, the `transactions` table, or the `release-payment` Edge Function must be broken into: (a) schema/migration, (b) Edge Function logic, (c) frontend trigger, each verified independently.
- The task requires a new Edge Function — split into: (a) write and test the function in isolation, (b) connect the database webhook or cron trigger, (c) verify end-to-end.
- The task description contains the word “and” linking two distinct features (e.g., “build bid submission and auto-cancellation”). Treat each side of “and” as a separate step.

When you split, list all steps explicitly before starting step one. Get confirmation that the split is correct before proceeding.

-----

## 4. Handling Missing or Ambiguous Requirements

**Do not invent requirements.**
If a task says “show the professional’s rating on their profile” but does not specify how to display a profile with no ratings yet, do not pick an approach silently. Stop. State the ambiguity: “The task does not specify the empty-state for professionals with zero ratings. Options: (a) display ‘No ratings yet’, (b) hide the rating row entirely. Which is correct?” Wait for an answer before writing the component.

**Surface ambiguity before writing code, not after.**
If you discover an ambiguity mid-task after already writing some code, stop writing. State where you are, what you have built so far, and what the ambiguity is. Do not push forward with an assumption and flag it in a comment.

**Do not consult external documentation to fill in gaps in the spec.**
If `project-overview.md` does not specify a behaviour, and `architecture.md` does not either, that behaviour is unspecified. Flag it. Do not look at how ShiftKey or a similar product handles it and silently import that decision into this codebase.

**Make exactly one assumption per ambiguity, state it explicitly, and mark it.**
If you are instructed to proceed despite an ambiguity, state your assumption in plain language before writing the code (e.g., “Assuming empty-state shows ‘No ratings yet’ — proceeding on this basis”). Add an inline comment directly above the relevant code: `// ASSUMPTION: no-ratings state shows 'No ratings yet' — confirm with spec`.

-----

## 5. Files That Must Not Be Modified Without Explicit Instruction

**Never modify the following without a direct, explicit instruction naming the file:**

|File / Directory                                      |Reason                                                                                          |
|------------------------------------------------------|------------------------------------------------------------------------------------------------|
|`supabase/migrations/*.sql` (any already-applied file)|Applied migrations are permanent; modifying them causes schema drift                            |
|`src/lib/supabase.js`                                 |Supabase client singleton; changes affect every data call in the app                            |
|`src/lib/paystack.js`                                 |Payment client initialisation; errors here break the entire payment flow                        |
|`src/store/authStore.js`                              |Auth state shape; changes here break protected routes and RLS-dependent logic                   |
|`supabase/functions/release-payment/*`                |Controls money movement; must only change under explicit payment task instruction               |
|`supabase/functions/send-sms/*`                       |Shared SMS wrapper called by all other functions; changes affect all notifications              |
|`.env` and `.env.example`                             |Environment config; changes require explicit listing of added/removed variables                 |
|`architecture.md` and `project-overview.md`           |Source-of-truth spec files; must not be edited to match code — only updated by human instruction|

**Never delete a file.** Rename or move files only when the task explicitly states the old path and the new path. If a file appears unused, flag it for review rather than removing it.

-----

## 6. Keeping Documentation in Sync with Implementation

**Update `architecture.md` when the implementation deviates from it — but only when explicitly instructed.**
Do not silently diverge from the architecture. If a task forces a deviation (e.g., a folder is added, a table column is renamed), flag the deviation, complete the task, then add a documentation update as the final explicit step of that task.

**Every new Edge Function must have a corresponding entry in `architecture.md`’s Background Tasks table.**
Do not deploy a new Edge Function without updating the table row that describes its trigger and its responsibility.

**Every new database table or column must have a corresponding entry in the Storage Model section of `architecture.md`.**
Add it as the last step of the migration task, after the migration file has been written and verified.

**Every new environment variable must be added to `.env.example` with a placeholder value and a one-line comment explaining its purpose.**
Do this in the same task that introduces the variable. Do not leave `.env.example` stale.

**Do not update `project-overview.md` at all.** It describes product intent, not implementation. Only a human may change it.

-----

## 7. Verification Checklist

Complete every item on this checklist before declaring a unit of work done and moving to the next task. Do not skip items because they seem irrelevant to the task.

### Code Correctness

- [ ] The code does exactly what the task description says. Not more. Not less.
- [ ] No `console.log`, `debugger`, or `TODO` comments remain in the submitted code.
- [ ] No hardcoded values that belong in environment variables (API keys, base URLs, bucket names).
- [ ] All new functions and hooks have explicit error handling — no unhandled promise rejections, no silent catches that swallow errors.
- [ ] Every form that accepts user input validates on the client before submitting, and the server/RLS rejects invalid input independently of the client.

### Architecture Compliance

- [ ] New files are placed in the correct directory as defined in the System Boundaries section of `architecture.md`.
- [ ] No `pages/` component calls Supabase or Paystack directly — all data fetching goes through `hooks/`.
- [ ] No `components/` file imports from `hooks/` or `store/`.
- [ ] No frontend file imports or references the Supabase `service_role` key.
- [ ] If the task involved money: the frontend only calls Paystack inline popup. No transfer API call exists anywhere in `src/`.

### Invariant Compliance

- [ ] INV-01: No bank transfer logic exists in any file under `src/`.
- [ ] INV-02: Bid submission is blocked at both the UI layer and the RLS layer for unverified professionals.
- [ ] INV-03: If bids were touched, the overlap-prevention constraint on `bids` is still in place and was not weakened.
- [ ] INV-04: If the `transactions` table was touched, no UPDATE statement targets a row where `status = 'released'`.
- [ ] INV-05: Run `grep -r "service_role" src/` — the result must be empty.
- [ ] INV-06: No Supabase Storage URL generated in this task is a public URL. All are signed URLs with ≤15-minute expiry.
- [ ] INV-07: If `shifts.status` was updated anywhere, the transition follows the allowed state machine: `open → filled → in_progress → completed` (or `→ cancelled` from `open` or `filled` only).

### Database and Migrations

- [ ] Every schema change has a migration file with a sequential filename.
- [ ] No existing migration file was modified.
- [ ] New tables have RLS enabled and at least one explicit policy defined.
- [ ] The `architecture.md` Storage Model table reflects any new tables or columns added in this task.

### Notifications and Background Tasks

- [ ] If the task introduced a new notification trigger, a corresponding Edge Function exists and is listed in `architecture.md`.
- [ ] SMS is sent only via the `send-sms` Edge Function — no direct Termii API calls from any other function or from the frontend.

### Documentation Sync

- [ ] `.env.example` includes any new environment variables introduced in this task.
- [ ] If a new Edge Function was added, the Background Tasks table in `architecture.md` has been updated.
- [ ] Any ASSUMPTION comments added during this task have been listed in the task summary for human review.

### Final Gate

- [ ] State explicitly: “Checklist complete. Unit [task name] is done. No assumptions remain unresolved. Ready for next task.” Do not proceed to the next task until this statement is made.