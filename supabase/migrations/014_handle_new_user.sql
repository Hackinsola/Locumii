-- 014_handle_new_user.sql
-- Registration trigger. When GoTrue inserts a row into auth.users (sign-up), this
-- creates the matching public.users row and promotes the user's role into
-- app_metadata.role -- the JWT claim every RLS policy reads (architecture.md).
--
-- The role is taken from the sign-up metadata (raw_user_meta_data.role), which the
-- client supplies via supabase.auth.signUp({ options: { data: { role, phone } } }).
-- Only 'professional' or 'facility' may self-register; 'admin' is rejected so a
-- user can never self-assign elevated privileges. Admins are seeded directly in
-- the database (architecture.md, Auth and Access Model).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role  text := nullif(new.raw_user_meta_data ->> 'role', '');
  v_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
begin
  if v_role is null or v_role not in ('professional', 'facility') then
    raise exception 'Sign-up role must be ''professional'' or ''facility'' (got: %)',
      coalesce(v_role, '(none)');
  end if;

  insert into public.users (id, email, role, phone, status)
  values (new.id, new.email, v_role::user_role, v_phone, 'pending');

  -- Set the app_metadata.role claim used by RLS. raw_app_meta_data is the source
  -- of the JWT's app_metadata, so this lands in the issued access token.
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                          || jsonb_build_object('role', v_role)
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
