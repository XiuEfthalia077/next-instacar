-- ============================================================================
-- InstaCar — Auth helper functions
-- ----------------------------------------------------------------------------
-- Supabase Auth replaces the legacy PHP session. These security-definer
-- helpers bridge the Supabase `auth.users` accounts and the legacy `users`
-- table (which keeps its `bigint` primary key so every legacy foreign key
-- stays untouched).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ensure_user_profile
--
-- Links the Supabase Auth account to a legacy `users` row:
--   1. already linked                       -> return the row
--   2. an unlinked legacy row with the same e-mail -> link it
--      (only when the legacy row is already verified, or when the Supabase
--       account has a confirmed e-mail address)
--   3. otherwise                            -> create a `user` role row
--
-- The role is never taken from the client, so a self-service sign-up can
-- never escalate itself.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_user_profile(
  p_auth_id uuid,
  p_name    text,
  p_email   text,
  p_phone   text default ''
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.users;
begin
  if p_auth_id is null or p_email is null or p_email = '' then
    raise exception 'Missing account details';
  end if;

  -- 1. already linked
  select * into v_row from public.users where auth_id = p_auth_id limit 1;
  if v_row.id is not null then
    return v_row;
  end if;

  -- 2. link an existing (unlinked) legacy account with the same e-mail
  update public.users
     set auth_id    = p_auth_id,
         is_verified = true,
         name        = coalesce(nullif(btrim(p_name), ''), public.users.name),
         phone       = coalesce(nullif(btrim(p_phone), ''), public.users.phone)
   where email = lower(btrim(p_email))
     and auth_id is null
     and (
       public.users.is_verified
       or exists (
         select 1 from auth.users au
          where au.id = p_auth_id and au.email_confirmed_at is not null
       )
     )
  returning * into v_row;

  if v_row.id is not null then
    return v_row;
  end if;

  -- 3. brand new customer account (role is always `user`)
  insert into public.users (auth_id, name, email, phone, role, is_verified)
  values (
    p_auth_id,
    coalesce(nullif(btrim(p_name), ''), p_email),
    lower(btrim(p_email)),
    coalesce(btrim(p_phone), ''),
    'user',
    true
  )
  on conflict (email) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row
      from public.users
     where email = lower(btrim(p_email))
     limit 1;
  end if;

  return v_row;
end;
$$;

grant execute on function public.ensure_user_profile(uuid, text, text, text)
  to authenticated, anon;

-- ---------------------------------------------------------------------------
-- admin_create_user_profile
--
-- Used by the admin "Users" page. The role / branch are supplied by the
-- caller, but the function itself is only executable by admins.
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_user_profile(
  p_auth_id  uuid,
  p_name     text,
  p_email    text,
  p_phone    text,
  p_role     public.user_role,
  p_branch_id bigint default null,
  p_password text default null
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.users;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  insert into public.users
    (auth_id, name, email, phone, role, branch_id, is_verified, password)
  values (
    p_auth_id,
    coalesce(nullif(btrim(p_name), ''), p_email),
    lower(btrim(p_email)),
    coalesce(btrim(p_phone), ''),
    coalesce(p_role, 'user'),
    p_branch_id,
    true,
    p_password
  )
  on conflict (email) do update
    set name       = excluded.name,
        phone      = excluded.phone,
        role       = excluded.role,
        branch_id  = excluded.branch_id,
        auth_id    = coalesce(public.users.auth_id, excluded.auth_id),
        is_verified = true
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_create_user_profile(uuid, text, text, text, public.user_role, bigint, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Branch scope helper (client friendly)
--
-- Returns the branch id a staff/operator account is limited to.
-- Admins pass their own explicit value (null = every branch).
-- ---------------------------------------------------------------------------
create or replace function public.resolve_branch_scope(p_branch_id bigint)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.current_user_role() = 'admin' then p_branch_id
    when public.current_user_role() in ('staff', 'operator') then public.current_user_branch_id()
    else null
  end;
$$;

grant execute on function public.resolve_branch_scope(bigint) to authenticated;
