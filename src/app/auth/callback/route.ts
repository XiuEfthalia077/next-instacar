import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

/**
 * OAuth callback — the Google sign-in return leg.
 *
 * Supports all environments:
 *   - Local development (localhost)
 *   - Vercel Preview Deployments (*.vercel.app)
 *   - Custom / Production domain (instacar.vercel.app)
 *
 * Correctly resolves the forwarded origin and links existing customer/admin/operator
 * accounts matched by email address without constraint conflicts.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "";

  // Derive public external origin (respecting Vercel / proxy headers)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_oauth_code", origin),
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
      new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(
      new URL("/login?error=missing_session", origin),
    );
  }

  const email = user.email.toLowerCase().trim();

  // 1. Look up profile by auth_id
  let { data: profile } = await supabase
    .from("users")
    .select("id, role, auth_id, email")
    .eq("auth_id", user.id)
    .maybeSingle();

  // 2. If not linked by auth_id, check for an existing account with the same email
  if (!profile) {
    const { data: existingByEmail } = await supabase
      .from("users")
      .select("id, role, auth_id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingByEmail) {
      // Link the existing account to this Google Auth ID
      await supabase
        .from("users")
        .update({
          auth_id: user.id,
          is_verified: 1,
        })
        .eq("id", existingByEmail.id);

      profile = { ...existingByEmail, auth_id: user.id };
    } else {
      // 3. Brand new account: create a new profile with role "user"
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split("@")[0];
      const phone = user.user_metadata?.phone || null;

      const { data: newProfile, error: insertError } = await supabase
        .from("users")
        .insert({
          auth_id: user.id,
          name: displayName,
          email,
          phone,
          role: "user",
          is_verified: 1,
        })
        .select("id, role, auth_id, email")
        .maybeSingle();

      if (!insertError && newProfile) {
        profile = newProfile;
      }
    }
  }

  const role = (profile?.role as UserRole) || "user";
  const target =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : ROLE_HOME[role] || "/user/dashboard";

  const response = NextResponse.redirect(new URL(target, origin));

  sessionCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      sameSite: "lax",
      secure: origin.startsWith("https:"),
      path: "/",
    });
  });

  return response;
}
