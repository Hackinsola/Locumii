-- 025_notifications_add_title_link.sql
-- Spec 10 (Notifications) needs a per-event title and an optional click-through
-- route on each in-app notification. The table from 011 only had `type` + `body`,
-- so add `title` and `link`, extend the update guard so neither is client-editable
-- (only is_read may change), and publish the table for realtime so the bell can
-- subscribe to new rows.

alter table public.notifications add column title text;
alter table public.notifications add column link text;

-- Backfill any existing rows with a readable title derived from their type, then
-- lock the column to NOT NULL (every new row is written with a title by the
-- notification triggers / send-sms).
update public.notifications
  set title = initcap(replace(type, '_', ' '))
  where title is null;

alter table public.notifications alter column title set not null;

-- Extend the 011 guard: a non-admin client update may still only toggle is_read.
-- title/link/type/body/user_id/created_at are all written server-side and must not
-- change through a client update.
create or replace function public.guard_notification_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.user_id    is distinct from old.user_id
     or new.type    is distinct from old.type
     or new.title   is distinct from old.title
     or new.body    is distinct from old.body
     or new.link    is distinct from old.link
     or new.created_at is distinct from old.created_at then
    raise exception 'Only is_read may be updated on a notification';
  end if;

  return new;
end;
$$;

-- Realtime: the bell subscribes to INSERTs on this table (filtered to the current
-- user). RLS still scopes which rows each client actually receives.
alter publication supabase_realtime add table public.notifications;
