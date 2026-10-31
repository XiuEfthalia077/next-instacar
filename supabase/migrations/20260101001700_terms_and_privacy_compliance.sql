-- ============================================================================
-- InstaCar — Terms of Service & Privacy Policy Compliance Migration
-- ----------------------------------------------------------------------------
-- Adds `terms_accepted_at` and `terms_version` tracking to `public.users`.
-- Updates the auto-provisioning triggers and OAuth callbacks to capture
-- consent timestamp and version for both email sign-ups and Google OAuth.
-- ============================================================================

-- 1. Add compliance columns to public.users
alter table public.users
  add column if not exists terms_accepted_at timestamptz default null,
  add column if not exists terms_version text default null;

create index if not exists idx_users_terms_accepted_at on public.users (terms_accepted_at);

-- 2. Update sync_user_from_auth_insert to record terms consent on insert
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
  v_is_google boolean;
  v_terms_accepted boolean;
  v_terms_version text;
  v_terms_accepted_at timestamptz;
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

  -- Detect Google OAuth
  v_is_google := (coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google')
                 or exists (
                   select 1 from auth.identities ai
                    where ai.user_id = new.id and ai.provider = 'google'
                 );

  -- Read terms metadata from registration form options
  v_terms_accepted := coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false);
  v_terms_version := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'terms_version', '')), '');

  if v_is_google then
    -- Google OAuth: Implicit consent via Google sign-in button
    v_terms_accepted_at := coalesce(new.created_at, now());
    v_terms_version := 'v1.0';
  elsif v_terms_accepted then
    -- Standard Email sign-up: Explicit consent checkbox
    v_terms_accepted_at := coalesce(new.created_at, now());
    v_terms_version := coalesce(v_terms_version, 'v1.0');
  else
    v_terms_accepted_at := null;
    v_terms_version := null;
  end if;

  insert into public.users (
    auth_id,
    name,
    email,
    phone,
    role,
    is_verified,
    password,
    terms_accepted_at,
    terms_version
  )
  values (
    new.id,
    v_name,
    v_email,
    v_phone,
    'user',
    new.email_confirmed_at is not null,
    nullif(new.encrypted_password, ''),
    v_terms_accepted_at,
    v_terms_version
  )
  on conflict (email) do update
    set auth_id = coalesce(public.users.auth_id, excluded.auth_id),
        terms_accepted_at = coalesce(public.users.terms_accepted_at, excluded.terms_accepted_at),
        terms_version = coalesce(public.users.terms_version, excluded.terms_version);

  perform set_config('instacar.auth_sync_direction', '', true);

  return null;
end;
$$;

-- 3. Update ensure_user_profile to include terms columns
create or replace function public.ensure_user_profile(
  p_auth_id uuid,
  p_name    text,
  p_email   text,
  p_phone   text default '',
  p_terms_version text default 'v1.0'
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

  -- 2. link an existing legacy account with the same e-mail
  update public.users
     set auth_id    = p_auth_id,
         is_verified = public.users.is_verified
                       or exists (
                         select 1 from auth.users au
                          where au.id = p_auth_id
                            and au.email_confirmed_at is not null
                       ),
         name        = coalesce(nullif(btrim(p_name), ''), public.users.name),
         phone       = coalesce(nullif(btrim(p_phone), ''), public.users.phone),
         terms_accepted_at = coalesce(public.users.terms_accepted_at, now()),
         terms_version     = coalesce(public.users.terms_version, p_terms_version)
   where email = lower(btrim(p_email))
     and auth_id is null
     and password is null
  returning * into v_row;

  if v_row.id is not null then
    return v_row;
  end if;

  -- 3. brand new customer account (role is always `user`)
  insert into public.users (
    auth_id,
    name,
    email,
    phone,
    role,
    is_verified,
    password,
    terms_accepted_at,
    terms_version
  )
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
    ),
    now(),
    coalesce(p_terms_version, 'v1.0')
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- 4. User RPC action to accept terms from the dedicated `/accept-terms` screen
create or replace function public.accept_terms(p_version text default 'v1.0')
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.users
     set terms_accepted_at = now(),
         terms_version = coalesce(nullif(btrim(p_version), ''), 'v1.0')
   where auth_id = v_uid;
end;
$$;

grant execute on function public.accept_terms(text) to authenticated;
