-- ============================================================================
-- InstaCar — Supabase Auth -> legacy `users` provisioning
-- ----------------------------------------------------------------------------
-- `20260101000700_auth_users_sync.sql` links the legacy accounts to Supabase
-- Auth. This migration completes the other direction:
--
--   * A self-service registration (GoTrue creates the `auth.users` row) now
--     gets its legacy `users` row as well, so the account can be used by the
--     app straight away.
--   * `auth.users.email_confirmed_at` (the e-mail confirmation GoTrue asks
--     for) is mirrored to `users.is_verified`, which is exactly what the
--     legacy `registerverify.php` did.
--   * `ensure_user_profile()` no longer links a new Supabase account to an
--     existing legacy account that already owns a password — otherwise
--     anybody could take over an account by registering the same address.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- sync_user_from_auth_insert — AFTER INSERT on `auth.users`
--
-- Creates the legacy profile for an account that Supabase Auth just created
-- (self-service registration, Google sign-in, admin "invite", ...).
--
-- The role is always `user` — a new account can never escalate itself. When
-- the e-mail address is already used by a legacy account the insert is
-- skipped, so no account can be taken over by registering the same address.
-- ---------------------------------------------------------------------------
create or replace function public.sync_user_from_auth_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(btrim(coalesce(new.email, '')));
  v_name  text;
  v_phone text;
begin
  -- A change that came from `public.users` must not be written back.
  if coalesce(current_setting('instacar.auth_sync_direction', true), '') = 'users_to_auth' then
    return null;
  end if;

  if v_email = '' or new.is_anonymous then
    return null;
  end if;

  perform set_config('instacar.auth_sync_direction', 'auth_to_users', true);

  v_name  := coalesce(
               nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
               v_email
             );
  v_phone := coalesce(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

  insert into public.users (
    auth_id,
    name,
    email,
    phone,
    role,
    is_verified,
    password
  )
  values (
    new.id,
    v_name,
    v_email,
    v_phone,
    'user',
    new.email_confirmed_at is not null,
    nullif(new.encrypted_password, '')
  )
  on conflict (email) do nothing;

  perform set_config('instacar.auth_sync_direction', '', true);

  return null;
end;
$$;

drop trigger if exists trg_auth_users_provision_legacy on auth.users;
create trigger trg_auth_users_provision_legacy
  after insert on auth.users
  for each row execute function public.sync_user_from_auth_insert();

-- ---------------------------------------------------------------------------
-- ensure_user_profile
--
-- Links the Supabase Auth account to a legacy `users` row:
--   1. already linked                       -> return the row
--   2. an unlinked legacy row with the same e-mail *and no password* -> link
--      it (an account that already owns a password is never taken over)
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

  -- 2. link an existing legacy account with the same e-mail.
  --    Only an account without a password can be linked — an account that
  --    already owns a password must never be handed to another account.
  update public.users
     set auth_id    = p_auth_id,
         is_verified = public.users.is_verified
                       or exists (
                         select 1 from auth.users au
                          where au.id = p_auth_id
                            and au.email_confirmed_at is not null
                       ),
         name        = coalesce(nullif(btrim(p_name), ''), public.users.name),
         phone       = coalesce(nullif(btrim(p_phone), ''), public.users.phone)
   where email = lower(btrim(p_email))
     and auth_id is null
     and password is null
  returning * into v_row;

  if v_row.id is not null then
    return v_row;
  end if;

  -- 3. brand new customer account (role is always `user`)
  insert into public.users (auth_id, name, email, phone, role, is_verified, password)
  values (
    p_auth_id,
    coalesce(nullif(btrim(p_name), ''), p_email),
    lower(btrim(p_email)),
    coalesce(btrim(p_phone), ''),
    'user',
    exists (
      select 1 from auth.users au
       where au.id = p_auth_id
         and au.email_confirmed_at is not null
    ),
    (
      select au.encrypted_password from auth.users au where au.id = p_auth_id
    )
  )
  on conflict (email) do nothing
  returning * into v_row;

  if v_row.id is null then
    -- The e-mail address already belongs to a different account; only return
    -- a row that is really linked to the calling Supabase account.
    select * into v_row from public.users where auth_id = p_auth_id limit 1;
  end if;

  return v_row;
end;
$$;

grant execute on function public.ensure_user_profile(uuid, text, text, text)
  to authenticated, anon;

-- ---------------------------------------------------------------------------
-- A confirmed Supabase e-mail address means the legacy account is verified
-- (the legacy `registerverify.php` did exactly this).
-- ---------------------------------------------------------------------------
create or replace function public.sync_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_row   public.users;
  v_name  text;
  v_phone text;
begin
  -- A change that came from `public.users` must not be written back.
  if coalesce(current_setting('instacar.auth_sync_direction', true), '') = 'users_to_auth' then
    return null;
  end if;

  perform set_config('instacar.auth_sync_direction', 'auth_to_users', true);

  select * into v_row from public.users where auth_id = new.id limit 1;

  if v_row.id is not null then
    -- Password (a GoTrue password change must reach the legacy table).
    if new.encrypted_password is not null
       and new.encrypted_password <> ''
       and new.encrypted_password is distinct from coalesce(v_row.password, '') then
      update public.users set password = new.encrypted_password where id = v_row.id;
    end if;

    -- E-mail (only when the address is still free in the legacy table).
    if new.email is not null
       and lower(btrim(new.email)) <> lower(coalesce(v_row.email, ''))
       and not exists (
         select 1
           from public.users u
          where lower(u.email) = lower(btrim(new.email))
            and u.id <> v_row.id
       ) then
      update public.users set email = lower(btrim(new.email)) where id = v_row.id;
    end if;

    -- Name / phone taken from the Supabase user metadata.
    v_name  := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name',  '')), '');
    v_phone := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');

    if (v_name is not null and v_name is distinct from v_row.name)
       or (v_phone is not null and v_phone is distinct from v_row.phone) then
      update public.users
         set name  = coalesce(v_name,  name),
             phone = coalesce(v_phone, phone)
       where id = v_row.id;
    end if;

    -- E-mail confirmation (legacy `registerverify.php`).
    if new.email_confirmed_at is not null and not coalesce(v_row.is_verified, false) then
      update public.users set is_verified = true where id = v_row.id;
    end if;
  end if;

  perform set_config('instacar.auth_sync_direction', '', true);

  return null;
end;
$$;

drop trigger if exists trg_auth_users_sync_legacy on auth.users;
create trigger trg_auth_users_sync_legacy
  after update of encrypted_password, email, raw_user_meta_data, email_confirmed_at on auth.users
  for each row execute function public.sync_user_from_auth();

revoke all on function public.sync_user_from_auth_insert() from public;
