-- 010_create_ratings.sql
-- Star ratings left after a completed shift. Two rows per shift (one per
-- direction). A rater may rate a given shift at most once.

create table public.ratings (
  id            uuid primary key default gen_random_uuid(),
  shift_id      uuid not null references public.shifts (id) on delete cascade,
  rater_user_id uuid not null references public.users (id) on delete cascade,
  ratee_user_id uuid not null references public.users (id) on delete cascade,
  score         smallint not null check (score between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  constraint ratings_one_per_rater_per_shift unique (shift_id, rater_user_id),
  constraint ratings_no_self_rating check (rater_user_id <> ratee_user_id)
);

create index ratings_ratee_user_id_idx on public.ratings (ratee_user_id);

alter table public.ratings enable row level security;

-- Read: any authenticated user (ratings are shown publicly on profiles).
create policy ratings_select_all
  on public.ratings for select
  to authenticated
  using (true);

-- Insert: the rater must be the current user, must have been a party to the
-- shift, and the shift must be completed. The unique constraint enforces
-- once-per-direction.
create policy ratings_insert_party
  on public.ratings for insert
  to authenticated
  with check (
    rater_user_id = auth.uid()
    and (public.is_shift_facility(shift_id) or public.is_accepted_shift_professional(shift_id))
    and exists (
      select 1 from public.shifts s
      where s.id = shift_id and s.status = 'completed'
    )
  );

-- No UPDATE/DELETE policy: ratings are immutable once submitted.
