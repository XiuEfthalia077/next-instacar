import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  return {
    supabase,
    /**
     * The response is replaced whenever Supabase refreshes the session
     * cookies, so it has to be read lazily (getter) instead of captured.
     */
    get response() {
      return supabaseResponse;
    },
  };
};

/**
 * Refreshes auth sessions and cleans up corrupted or expired refresh tokens.
 * Invoked by root middleware on every request.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // If an invalid refresh token error occurred, clear stale Supabase cookies
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isAlreadyUsed = msg.includes("already used") || msg.includes("already_used");
      const isFatalRevoked =
        msg.includes("session_not_found") ||
        msg.includes("user_not_found") ||
        (msg.includes("invalid refresh") && !isAlreadyUsed) ||
        (msg.includes("refresh token") && !isAlreadyUsed && error.status === 400);

      if (isFatalRevoked) {
        // Clean out any stale auth cookies from the response with proper root path
        const allCookies = request.cookies.getAll();
        for (const cookie of allCookies) {
          if (cookie.name.startsWith("sb-") || cookie.name.includes("auth-token")) {
            supabaseResponse.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
          }
        }
      }
    }
  } catch (err) {
    // Silently ignore refresh errors to prevent request crashes
  }

  return supabaseResponse;
}
