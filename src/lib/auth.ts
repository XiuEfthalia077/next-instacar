/**
 * Authentication & session helpers.
 *
 * The legacy PHP app kept `$_SESSION['user_id']`, `$_SESSION['role']` and
 * `$_SESSION['branch_id']`. Here the Supabase Auth cookie session plays the
 * role of `$_SESSION` and the legacy `users` row (looked up through
 * `users.auth_id`) provides the role / branch information.
 *
 * This module is server only — the server actions live in
 * `src/lib/actions/auth.ts` so client components can import them.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ROLE_HOME } from "@/lib/constants";
import type { AppSession, User, UserRole } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

/** Cookie that stores the branch an admin is currently looking at. */
export const VIEW_BRANCH_COOKIE = "instacar_view_branch";

export type SupabaseServerClient = ReturnType<typeof createClient>;

/** Creates a request-scoped Supabase client bound to the auth cookies. */
export async function getSupabase(): Promise<SupabaseServerClient> {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

/**
 * Reads the branch the admin is currently viewing.
 * `"all"` means "every branch" — the legacy `$_SESSION['view_branch']`.
 */
export async function getViewBranchCookie(): Promise<number | "all"> {
  const store = await cookies();
  const raw = store.get(VIEW_BRANCH_COOKIE)?.value;
  if (!raw || raw === "all") return "all";
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "all";
}

/**
 * Resolves the current session, or `null` when nobody is signed in.
 *
 * The legacy app stored the whole session in PHP; here we rebuild the same
 * information from the Supabase Auth cookie + the legacy `users` row.
 */
export async function getSession(): Promise<AppSession | null> {
  await connection();
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, branch_id, is_verified")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const role = profile.role as UserRole;

  return {
    userId: profile.id,
    authUserId: user.id,
    name: profile.name,
    email: profile.email,
    role,
    branchId: profile.branch_id ?? null,
    // Admins may switch the branch they look at; everyone else is pinned
    // to the branch recorded on their own account.
    viewBranch:
      role === "admin" ? await getViewBranchCookie() : (profile.branch_id ?? "all"),
  };
}

/** The legacy `users` row of the signed-in account. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", user.id)
    .maybeSingle();

  return (profile as User | null) ?? null;
}

/** Redirects to the login page when nobody is signed in. */
export async function requireSession(): Promise<AppSession> {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Redirects to the role home when the signed-in account does not have one of
 * the given roles.
 */
export async function requireRole(...roles: UserRole[]): Promise<AppSession> {
  await connection();
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect(ROLE_HOME[session.role]);
  return session;
}

/** True when the signed-in account is an admin. */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}
