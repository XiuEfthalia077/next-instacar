-- ============================================================================
-- InstaCar — link the legacy `users` table to Supabase Auth (`auth.users`)
-- ----------------------------------------------------------------------------
-- The legacy PHP app kept the account in the `users` table and verified the
-- bcrypt hash stored in `users.password` with `password_verify()`.
--
-- Supabase Auth (GoTrue) replaces the PHP session, so a matching `auth.users`
-- row has to exist for every legacy account. This migration makes
-- `public.users` the single source of truth and keeps `auth.users` as a 1:1
-- shadow of it:
--
--     public.users.id  <->  public.users.auth_id  ->  auth.users.id
--
-- Rules
--   * Every legacy row owns exactly one `auth.users` row.
--   * `public.users.password` keeps the canonical PHP bcrypt hash (`$2y$`)
--     and is copied into `auth.users.encrypted_password`. GoTrue verifies
--     PHP hashes natively, so the existing credentials keep working.
--   * `public.users.is_verified` maps to `auth.users.email_confirmed_at`
--     (GoTrue refuses to sign in an unconfirmed account).
--   * `public.users.email` maps to `auth.users.email` — that is the key GoTrue
--     uses to look the account up when signing in.
--   * `auth.users.phone` stays NULL on purpose: the legacy table has duplicate
--     phone numbers and GoTrue keeps a unique index on that column.
--   * Changes are mirrored in both directions, so the two tables can never
--     drift apart:
--       public.users  ->  auth.users   (role, branch, name, phone, password)
--       auth.users    ->  public.users (password, e-mail, name, phone)
--
-- Recursion between the two directions is stopped with a transaction local
-- flag (`instacar.auth_sync_direction`).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- upsert_auth_account
--
-- Writes the Supabase Auth shadow row for a legacy account. `auth.users` only
-- requires `id`, but the columns below are the ones GoTrue itself fills in
-- (verified against a freshly created account).
--
-- `auth.identities.email` is a generated column
-- (`lower(identity_data ->> 'email')`), so it is never written directly.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_auth_account(
  p_uid        uuid,
  p_email      text,
  p_password   text,
  p_verified   boolean,
  p_name       text,
  p_phone      text,
  p_role       text,
  p_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_meta jsonb := jsonb_build_object(
                    'name',           p_name,
                    'phone',          p_phone,
                    'role',           p_role,
                    'email_verified', coalesce(p_verified, false)
                  );
begin
  if p_uid is null then
    return;
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_confirm_status,
    is_sso_user,
    is_anonymous,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    p_uid,
    'authenticated',
    'authenticated',
    lower(btrim(coalesce(p_email, ''))),
    coalesce(p_password, ''),
    case
      when coalesce(p_verified, false) then coalesce(p_created_at, now())
      else null
    end,
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    v_meta,
    '',
    '',
    '',
    '',
    0,
    false,
    false,
    coalesce(p_created_at, now()),
    now()
  )
  on conflict (id) do update
     set email = excluded.email,
         encrypted_password = case
           when excluded.encrypted_password = '' then auth.users.encrypted_password
           else excluded.encrypted_password
         end,
         -- A legacy row that is not verified must not lock out an account
         -- that Supabase already confirmed, so an existing value is kept.
         email_confirmed_at = case
           when excluded.email_confirmed_at is null then auth.users.email_confirmed_at
           else coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at)
         end,
         raw_user_meta_data = auth.users.raw_user_meta_data || excluded.raw_user_meta_data,
         updated_at = now();

  -- The e-mail identity GoTrue expects for a password account.
  insert into auth.identities (
    provider_id,
    user_id,
    provider,
    identity_data,
    created_at,
    updated_at
  )
  values (
    p_uid::text,
    p_uid,
    'email',
    jsonb_build_object(
      'sub',            p_uid::text,
      'email',          lower(btrim(coalesce(p_email, ''))),
      'email_verified', coalesce(p_verified, false),
      'phone_verified', false
    ),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update
     set identity_data = excluded.identity_data,
         updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- link_auth_user — BEFORE INSERT / UPDATE on `public.users`
--
-- Resolves `users.auth_id`:
--   * `auth_id` already given  -> keep it (the caller knows the account)
--   * an `auth.users` row already owns the e-mail -> link to it, so a
--     self-service sign-up never produces two accounts for one address
--   * otherwise                -> create a brand new auth id
--
-- The Supabase account is created here (and not in the AFTER trigger) because
-- the `users.auth_id -> auth.users(id)` foreign key is checked before the
-- AFTER triggers of the statement run.
-- ---------------------------------------------------------------------------
create or replace function public.link_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_existing uuid;
  v_email    text := lower(btrim(coalesce(new.email, '')));
begin
  if new.auth_id is null then
    if v_email <> '' then
      select au.id
        into v_existing
        from auth.users au
       where lower(au.email) = v_email
         and au.is_sso_user = false
       limit 1;
    end if;

    new.auth_id := coalesce(v_existing, gen_random_uuid());
  else
    -- The caller supplied an `auth_id`. Make sure no *other* Supabase account
    -- already owns the same e-mail address — `auth.users` has a unique index
    -- on `email`, so this would otherwise fail with a raw constraint error.
    if v_email <> '' then
      select au.id
        into v_existing
        from auth.users au
       where lower(au.email) = v_email
         and au.id <> new.auth_id
         and au.is_sso_user = false
       limit 1;

      if v_existing is not null then
        raise exception
          'The e-mail address % is already linked to another Supabase account.', v_email
          using errcode = 'unique_violation';
      end if;
    end if;
  end if;

  -- The Supabase account has to exist before the foreign key is verified.
  if not exists (select 1 from auth.users au where au.id = new.auth_id) then
    perform public.upsert_auth_account(
      new.auth_id,
      v_email,
      nullif(btrim(coalesce(new.password, '')), ''),
      coalesce(new.is_verified, false),
      new.name,
      new.phone,
      new.role::text,
      new.created_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_link_auth on public.users;
create trigger trg_users_link_auth
  before insert or update of auth_id, email on public.users
  for each row execute function public.link_auth_user();

-- ---------------------------------------------------------------------------
-- sync_auth_user — AFTER INSERT / UPDATE / DELETE on `public.users`
--
-- Mirrors the legacy row into `auth.users` and removes the auth account
-- together with the legacy account.
-- ---------------------------------------------------------------------------
create or replace function public.sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid      uuid;
  v_email    text;
  v_password text;
  v_auth_pw  text;
begin
  -- A change that came from `auth.users` must not be written back.
  if coalesce(current_setting('instacar.auth_sync_direction', true), '') = 'auth_to_users' then
    return null;
  end if;

  perform set_config('instacar.auth_sync_direction', 'users_to_auth', true);

  if tg_op = 'DELETE' then
    -- `pg_trigger_depth() = 1` means we were not reached through the
    -- `users.auth_id -> auth.users` cascade, so the auth account still has
    -- to be removed.
    if old.auth_id is not null and pg_trigger_depth() = 1 then
      delete from auth.users where id = old.auth_id;
    end if;

    perform set_config('instacar.auth_sync_direction', '', true);
    return old;
  end if;

  v_uid := new.auth_id;

  if v_uid is null then
    perform set_config('instacar.auth_sync_direction', '', true);
    return new;
  end if;

  v_email    := lower(btrim(coalesce(new.email, '')));
  v_password := nullif(btrim(coalesce(new.password, '')), '');

  -- A self-service sign-up creates the Supabase account first and the legacy
  -- row afterwards; in that case the legacy row has no password yet. Copy the
  -- hash back so the legacy table stays complete (the legacy PHP login needs
  -- `users.password`).
  if v_password is null then
    select au.encrypted_password
      into v_auth_pw
      from auth.users au
     where au.id = v_uid;

    if v_auth_pw is not null and v_auth_pw <> '' then
      update public.users set password = v_auth_pw where id = new.id;
      v_password := v_auth_pw;
    end if;
  end if;

  perform public.upsert_auth_account(
    v_uid,
    v_email,
    v_password,
    coalesce(new.is_verified, false),
    new.name,
    new.phone,
    new.role::text,
    new.created_at
  );

  perform set_config('instacar.auth_sync_direction', '', true);

  return new;
end;
$$;

drop trigger if exists trg_users_sync_auth on public.users;
create trigger trg_users_sync_auth
  after insert or update or delete on public.users
  for each row execute function public.sync_auth_user();

-- ---------------------------------------------------------------------------
-- sync_user_from_auth — AFTER UPDATE on `auth.users`
--
-- Mirrors a change that happened inside Supabase Auth (password change,
-- e-mail change, profile metadata) back into the legacy table.
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
  end if;

  perform set_config('instacar.auth_sync_direction', '', true);

  return null;
end;
$$;

drop trigger if exists trg_auth_users_sync_legacy on auth.users;
create trigger trg_auth_users_sync_legacy
  after update of encrypted_password, email, raw_user_meta_data on auth.users
  for each row execute function public.sync_user_from_auth();

-- ---------------------------------------------------------------------------
-- guard_user_privileges — BEFORE UPDATE on `public.users`
--
-- `users_update_self` lets an account update its own row. Without this
-- guard a customer could set `role = 'admin'` on their own record, which
-- would break the "the role comes from the backend" rule. Only an admin (or
-- a service/migration context without a JWT) may change `role` / `branch_id`.
-- ---------------------------------------------------------------------------
create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.role is distinct from old.role
     or new.branch_id is distinct from old.branch_id then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only an administrator can change the role or the branch of an account.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_guard_privileges on public.users;
create trigger trg_users_guard_privileges
  before update of role, branch_id on public.users
  for each row execute function public.guard_user_privileges();

-- ---------------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------------
revoke all on function public.upsert_auth_account(uuid, text, text, boolean, text, text, text, timestamptz) from public;
revoke all on function public.link_auth_user() from public;
revoke all on function public.sync_auth_user() from public;
revoke all on function public.sync_user_from_auth() from public;
revoke all on function public.guard_user_privileges() from public;
