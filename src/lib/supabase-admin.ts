/**
 * Service-role Supabase client.
 *
 * Only used by the administrator account actions: creating an account has to
 * go through the Supabase Auth Admin API so GoTrue hashes the password itself
 * (the database trigger then copies the hash into `public.users.password`,
 * exactly like the legacy PHP `password_hash()` flow).
 *
 * Never import this module from a client component.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Returns a service-role client, or `null` when the key is not configured. */
export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;

  if (!cached) {
    cached = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cached;
}
