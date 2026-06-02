-- 005_create_credentials.sql
-- Credential documents submitted by professionals for manual admin review.
-- `storage_path` points at an object in the private `credentials` Storage bucket
-- (created in 012); the file itself is never stored in this table (INV-06).

create table public.credentials (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professional_profiles (user_id) on delete cascade,
  doc_type        credential_doc_type not null,
  storage_path    text not null,
  status          credential_status not null default 'pending',
  reviewed_by     uuid references public.users (id),
  reviewed_at     timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index credentials_professional_id_idx on public.credentials (professional_id);
create index credentials_status_idx on public.credentials (status);

alter table public.credentials enable row level security;

-- Read: a professional reads their own credentials; admins read all.
create policy credentials_select_own
  on public.credentials for select
  to authenticated
  using (professional_id = auth.uid() or public.is_admin());

-- Insert: a professional inserts their own credential rows, always as 'pending'.
create policy credentials_insert_own
  on public.credentials for insert
  to authenticated
  with check (professional_id = auth.uid() and status = 'pending');

-- Update: admins only (approve/reject + review metadata).
create policy credentials_update_admin
  on public.credentials for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
