-- ============================================================================
-- InstaCar — backfill Supabase Auth accounts for seeded legacy users
-- ----------------------------------------------------------------------------
-- `supabase/seed.sql` inserts the 15 legacy `users` rows *before* the auth
-- sync triggers exist, so those rows start with `auth_id = NULL`.
--
-- This block creates the matching `auth.users` + `auth.identities` shadow for
-- every legacy account that does not own one yet. It is the exact backfill
-- that was applied to the live project, and it makes a fresh bootstrap usable:
-- every seeded account can sign in immediately with its legacy bcrypt
-- password (`users.password`, a PHP `$2y$` hash).
--
-- Idempotent: already-linked rows are skipped.
-- ============================================================================

do $$
declare
  r     record;
  v_uid uuid;
begin
  -- Prevent the auth -> users triggers from provisioning a second profile
  -- while the shadow rows are created.
  perform set_config('instacar.auth_sync_direction', 'users_to_auth', true);

  for r in
    select *
      from public.users
     where auth_id is null
     order by id
  loop
    -- Re-use an existing Supabase account with the same e-mail, otherwise
    -- mint a fresh id.
    select au.id
      into v_uid
      from auth.users au
     where lower(au.email) = lower(btrim(r.email))
     limit 1;

    v_uid := coalesce(v_uid, gen_random_uuid());

    perform public.upsert_auth_account(
      v_uid,
      r.email,
      r.password,
      coalesce(r.is_verified, false),
      r.name,
      r.phone,
      r.role::text,
      r.created_at
    );

    update public.users
       set auth_id = v_uid
     where id = r.id;
  end loop;

  perform set_config('instacar.auth_sync_direction', '', true);
end $$;
