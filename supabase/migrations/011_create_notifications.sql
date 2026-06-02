-- 011_create_notifications.sql
-- In-app notification feed. Rows are inserted only by Edge Functions
-- (service_role); a user may read their own notifications and mark them read.

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  type       text not null,
  body       text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- A user may only toggle is_read on their own notifications; no other column may
-- change through a client update.
create or replace function public.guard_notification_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.user_id  is distinct from old.user_id
     or new.type  is distinct from old.type
     or new.body  is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'Only is_read may be updated on a notification';
  end if;

  return new;
end;
$$;

create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.guard_notification_update();

alter table public.notifications enable row level security;

-- Read: a user reads only their own notifications.
create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Update: a user updates only their own notifications (is_read only, per trigger).
create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No client INSERT policy: notifications are created only by Edge Functions
-- running with service_role.
