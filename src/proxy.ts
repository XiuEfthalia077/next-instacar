import { type NextRequest, NextResponse } from "next/server";

import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import { createClient } from "@/utils/supabase/middleware";

/** Pages that are only reachable while signed out. */
const AUTH_PAGES = new Set(["/login", "/register"]);

/** Public pages that live under a protected prefix. */
const PUBLIC_PATHS = ["/user/forgot", "/user/reset"];

/**
 * Which URL prefixes each role may open.
 *
 * Mirrors the legacy sidebar:
 *   admin    -> /admin + /shared
 *   operator -> /operator + /shared
 *   staff    -> /staff + /shared
 *   user     -> /user
 */
const ROLE_ROOTS: Record<UserRole, string[]> = {
  admin: ["/admin", "/shared"],
  operator: ["/operator", "/shared"],
  staff: ["/staff", "/shared"],
  user: ["/user", "/shared"],
};

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isProtectedPath(pathname: string) {
  if (isPublicPath(pathname)) return false;
  return Object.values(ROLE_ROOTS).some((roots) =>
    roots.some((root) => pathname === root || pathname.startsWith(`${root}/`)),
  );
}

function roleCanVisit(role: UserRole, pathname: string) {
  return ROLE_ROOTS[role].some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // If this is a Next.js Server Action, do not intercept or redirect here.
  // Server Actions handle authentication and redirection via Next.js flight protocol.
  if (request.headers.has("next-action")) {
    return response;
  }

  // Refreshes the Supabase session cookie when it is close to expiring.
  let user: { id: string } | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("refresh token") ||
        msg.includes("invalid refresh") ||
        error.name === "AuthApiError" ||
        error.status === 400
      ) {
        // Clear corrupted auth cookies so the client stops looping with invalid tokens
        const allCookies = request.cookies.getAll();
        for (const cookie of allCookies) {
          if (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) {
            response.cookies.delete(cookie.name);
          }
        }
      }
    } else {
      user = data?.user ?? null;
    }
  } catch {
    user = null;
  }

  const { pathname, search } = request.nextUrl;

  // ---------------------------------------------------------------------
  // Signed out
  // ---------------------------------------------------------------------
  if (!user) {
    if (isProtectedPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // ---------------------------------------------------------------------
  // Signed in — resolve the legacy `users` row that holds role + branch
  // ---------------------------------------------------------------------
  const { data: profile } = await supabase
    .from("users")
    .select("id, role, branch_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const role = profile?.role as UserRole | undefined;

  // Auth account without a legacy profile row -> treat as signed out.
  if (!role) {
    if (AUTH_PAGES.has(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "no_profile");
    return NextResponse.redirect(url);
  }

  // ---------------------------------------------------------------------
  // Already signed in -> keep away from the auth pages
  // ---------------------------------------------------------------------
  if (AUTH_PAGES.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ---------------------------------------------------------------------
  // Role guard
  // ---------------------------------------------------------------------
  if (isProtectedPath(pathname) && !roleCanVisit(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    url.search = "";
    const redirectRes = NextResponse.redirect(url);
    redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return redirectRes;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets and image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico)$).*)",
  ],
};
