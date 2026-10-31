"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-state";
import { getSupabase, requireRole, VIEW_BRANCH_COOKIE } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/types";
import {
  checkRateLimit,
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
} from "@/lib/rate-limit";
import { signUpSchema } from "@/lib/validations";
import { queueEmail, resolveAppUrl } from "@/lib/queue";

/**
 * The messages below are the ones the legacy PHP app showed.
 * `car-rental/process/auth/loginprocess.php` and
 * `car-rental/process/auth/registerprocess.php`.
 */
const LEGACY_INVALID_CREDENTIALS = "Invalid email or password.";
const LEGACY_INVALID_EMAIL_FORMAT = "Invalid email format.";
const LEGACY_NOT_VERIFIED = "Please verify your email address before logging in.";
const LEGACY_EMAIL_TAKEN = "Email is already registered.";
const LEGACY_PASSWORD_TOO_SHORT = "Password must be at least 6 characters.";
const LEGACY_REGISTERED =
  "Registration successful! Please check your email inbox to verify your account.";
const LEGACY_PASSWORD_RESET =
  "Password updated! You can now log in.";
const LEGACY_RESET_SENT =
  "If an account with that email exists, a reset link has been sent. Please check your inbox.";

/** Same check as the legacy `filter_var($email, FILTER_VALIDATE_EMAIL)`. */
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Keeps a redirect strictly inside the app.
 * Rejects protocol-relative URLs (`//example.com`), backslash bypasses (`/\example.com`),
 * and absolute URLs, returning a validated same-origin relative path.
 */
function safeNext(value: string): string {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return "";
  }
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") return "";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
}

/**
 * Maps a Supabase Auth (GoTrue) error onto the message the legacy PHP app
 * showed for the same situation.
 */
function loginErrorMessage(error: { code?: string; message?: string }): string {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  if (code === "email_not_confirmed" || message.includes("not confirmed")) {
    return LEGACY_NOT_VERIFIED;
  }

  if (code === "email_address_invalid" || message.includes("invalid email")) {
    return LEGACY_INVALID_EMAIL_FORMAT;
  }

  return LEGACY_INVALID_CREDENTIALS;
}

/** The legacy `users` row that belongs to the signed-in Supabase account. */
async function loadLegacyProfile(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  authId: string,
): Promise<{ id: number; role: UserRole } | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("auth_id", authId)
    .maybeSingle();

  if (error || !data) return null;

  return { id: data.id, role: data.role as UserRole };
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Check account lockout (5 consecutive failed attempts)
  const lockout = checkAccountLockout(email);
  if (lockout.locked) {
    const minutes = Math.ceil(lockout.resetSeconds / 60);
    return {
      error: `Account temporarily locked due to 5 failed login attempts. Please wait ${minutes} minute(s) before trying again.`,
    };
  }

  // Rate limiting against brute-force login attempts
  const rateLimitKey = `login_${email || "anon"}`;
  const limit = checkRateLimit(rateLimitKey, { interval: 60_000, maxRequests: 8 });
  if (!limit.success) {
    return {
      error: `Too many login attempts. Please wait ${limit.reset} seconds before trying again.`,
    };
  }

  if (!isValidEmail(email)) {
    return { error: LEGACY_INVALID_EMAIL_FORMAT };
  }

  const supabase = await getSupabase();

  // GoTrue verifies the bcrypt hash that the legacy `users` table keeps, so
  // the existing credentials keep working.
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const failResult = recordFailedLogin(email);
    if (failResult.locked) {
      return {
        error: "Account locked: Too many failed login attempts (5/5). Please wait 15 minutes before trying again.",
      };
    }
    const remainingMsg = ` (${failResult.remainingAttempts} attempt(s) remaining before lockout)`;
    return { error: `${loginErrorMessage(error)}${remainingMsg}` };
  }

  // Successful login clears failed attempt history
  clearFailedLogins(email);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signOut();
    return { error: LEGACY_INVALID_CREDENTIALS };
  }

  // The legacy `users` table is the source of truth for the role and branch.
  let profile = await loadLegacyProfile(supabase, user.id);

  if (!profile) {
    // The Supabase account is not linked to a legacy account yet. Linking is
    // done by the security-definer helper so the role can never be escalated
    // from the client.
    const { error: linkError } = await supabase.rpc("ensure_user_profile", {
      p_auth_id: user.id,
      p_name: String(user.user_metadata?.name ?? ""),
      p_email: email,
      p_phone: String(user.user_metadata?.phone ?? ""),
    });

    if (linkError) {
      await supabase.auth.signOut();
      return { error: linkError.message };
    }

    profile = await loadLegacyProfile(supabase, user.id);
  }

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error:
        "This account is not registered in the InstaCar system yet. Please contact an administrator.",
    };
  }

  redirect(next || ROLE_HOME[profile.role]);
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  // Rate limiting against spam registrations
  const limit = checkRateLimit(`register_${email || "anon"}`, { interval: 60_000, maxRequests: 5 });
  if (!limit.success) {
    return { error: `Too many registration attempts. Please wait ${limit.reset} seconds.` };
  }

  // Schema validation
  const validation = signUpSchema.safeParse({
    name,
    email,
    phone,
    password,
    confirmPassword,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0]?.message ?? "Invalid input." };
  }

  const termsAccepted =
    formData.get("terms_accepted") === "true" ||
    formData.get("terms_accepted") === "on";

  if (!termsAccepted) {
    return {
      error:
        "You must agree to the Terms of Service and Privacy Policy to register.",
    };
  }

  const supabase = await getSupabase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
        terms_accepted: true,
        terms_version: "v1.0",
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
    },
  });

  if (error) {
    const code = (error.code ?? "").toLowerCase();
    const message = error.message.toLowerCase();

    if (
      code === "user_already_exists" ||
      code === "email_exists" ||
      message.includes("already") ||
      message.includes("already registered") ||
      message.includes("already been registered")
    ) {
      return { error: LEGACY_EMAIL_TAKEN };
    }

    if (code === "email_address_invalid" || message.includes("invalid email")) {
      return { error: LEGACY_INVALID_EMAIL_FORMAT };
    }

    if (code === "over_email_send_rate_limit" || error.status === 429) {
      return {
        error:
          "Account created, but verification email failed to send. Please try again later.",
      };
    }

    if (message.includes("password") && message.includes("least")) {
      return { error: LEGACY_PASSWORD_TOO_SHORT };
    }

    return { error: error.message };
  }

  const authUserId = data.user?.id;

  if (!authUserId) {
    return { error: "Registration error occurred." };
  }

  // The legacy `users` row is the source of truth. The database already
  // provisions it when Supabase Auth creates the account; this call makes the
  // step explicit and idempotent (it never links an account that already
  // owns a password).
  const { error: profileError } = await supabase.rpc("ensure_user_profile", {
    p_auth_id: authUserId,
    p_name: name,
    p_email: email,
    p_phone: phone,
  });

  if (profileError) {
    return { error: "Registration error occurred." };
  }

  // Feature A: Queue background welcome email via Upstash QStash
  try {
    await queueEmail({
      type: "welcome",
      email,
      data: {
        name,
        loginUrl: `${resolveAppUrl()}/login`,
      },
    });
  } catch (err) {
    // Graceful error handling: user registration must never fail if email queuing fails
    console.error("[signUpAction] Failed to enqueue welcome email:", err);
  }

  // When e-mail confirmation is disabled the session is returned right away.
  if (data.session) {
    redirect(ROLE_HOME.user);
  }

  return { success: LEGACY_REGISTERED };
}

export async function signOutAction(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect(
    `/login?success=${encodeURIComponent("Logged out successfully. See you soon!")}`,
  );
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) return { error: "Email is required." };

  const supabase = await getSupabase();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/user/reset`,
  });

  if (error) return { error: error.message };

  return { success: LEGACY_RESET_SENT };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!password) return { error: "Password is required." };
  if (password.length < 6) {
    return { error: LEGACY_PASSWORD_TOO_SHORT };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await getSupabase();

  // The new hash is written to `auth.users` and mirrored into the legacy
  // `users.password` column by the database trigger, so the PHP login keeps
  // working with the very same credentials.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  redirect(`/login?success=${encodeURIComponent(LEGACY_PASSWORD_RESET)}`);
}

/**
 * Admin branch switcher — mirrors
 * car-rental/pages/admin/process/switch_branch.php
 */
export async function switchBranchAction(formData: FormData): Promise<void> {
  const session = await requireRole("admin");

  const raw = String(formData.get("branch") ?? "all");
  const branch = raw === "all" ? "all" : Number(raw);

  if (branch !== "all" && !Number.isInteger(branch)) {
    redirect(ROLE_HOME[session.role]);
  }

  const store = await cookies();

  store.set(VIEW_BRANCH_COOKIE, String(branch), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/admin/dashboard");
}

/**
 * Accepts Terms of Service and Privacy Policy for existing/legacy accounts.
 */
export async function acceptTermsAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const supabase = await getSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("users")
    .update({
      terms_accepted_at: nowIso,
      terms_version: "v1.0",
    })
    .eq("auth_id", user.id)
    .select("role")
    .maybeSingle();

  if (error) {
    return { error: "Failed to record terms acceptance. Please try again." };
  }

  const role = (updated?.role as UserRole) || "user";
  redirect(ROLE_HOME[role] || "/user/dashboard");
}
