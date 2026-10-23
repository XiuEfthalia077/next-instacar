import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

/**
 * OAuth callback — the Google sign-in return leg.
 *
 * Port of `car-rental/process/auth/googlecallback.php`: the provider sends
 * the visitor back with a `code`, the code is exchanged for a Supabase Auth
 * session and the legacy `users` row is linked through the
 * `ensure_user_profile()` helper (which never lets a visitor pick their own
 * role).
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_oauth_code", requestUrl.origin),
    );
  }

  const sessionCookies: {
    name: string;
    value: string;
    options?: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          sessionCookies.push(...cookiesToSet);
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        requestUrl.origin,
      ),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=missing_session", requestUrl.origin),
    );
  }

  // Link (or create) the legacy `users` row.
  const { data: profile } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_id", user.id)
    .maybeSingle();

  let role = profile?.role as UserRole | undefined;

  if (!role) {
    await supabase.rpc("ensure_user_profile", {
      p_auth_id: user.id,
      p_name: String(user.user_metadata?.name ?? ""),
      p_email: user.email ?? "",
      p_phone: String(user.user_metadata?.phone ?? ""),
    });

    const { data: linked } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", user.id)
      .maybeSingle();

    role = linked?.role as UserRole | undefined;
  }

  const target =
    next && next.startsWith("/") ? next : role ? ROLE_HOME[role] : "/login";

  const response = NextResponse.redirect(new URL(target, requestUrl.origin));

  sessionCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
