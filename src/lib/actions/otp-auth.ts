"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { ActionState } from "@/lib/action-state";
import { getSupabase } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { queueEmail } from "@/lib/queue";
import { z } from "zod";

const RESET_TOKEN_COOKIE = "instacar_pwd_reset_session";

const emailSchema = z.string().email("Please enter a valid email address.");
const otpSchema = z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits.");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters long.");

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp.trim()).digest("hex");
}

/* -------------------------------------------------------------------------- */
/* Step 1: Request 6-digit OTP                                                */
/* -------------------------------------------------------------------------- */

export async function requestPasswordResetOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { step?: number; email?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const parseResult = emailSchema.safeParse(email);
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid email address." };
  }

  // Rate limit: max 3 OTP requests per 2 minutes per email
  const limit = checkRateLimit(`otp_req_${email}`, { interval: 120_000, maxRequests: 3 });
  if (!limit.success) {
    return {
      error: `Too many OTP requests. Please wait ${limit.reset} seconds before requesting a new code.`,
    };
  }

  const supabase = await getSupabase();
  const adminClient = getAdminClient();
  const client = adminClient ?? supabase;

  // Check if user exists in public.users
  const { data: userProfile } = await client
    .from("users")
    .select("id, name, email")
    .eq("email", email)
    .maybeSingle();

  // Generate cryptographically secure 6-digit numeric OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Persist OTP record in password_resets
  try {
    const { error: dbError } = await client.from("password_resets").insert({
      email,
      otp_hash: hashedOtp,
      expires_at: expiresAt,
      attempts: 0,
    });

    if (dbError) {
      console.warn(
        `[OTP] password_resets table insert warning (${dbError.message}). Proceeding with queue dispatch.`,
      );
    }
  } catch (err) {
    console.error("[OTP] Failed to store OTP in database:", err);
  }

  // Queue background OTP verification email via Upstash QStash
  try {
    await queueEmail({
      type: "otp_verification",
      email,
      data: {
        otp: rawOtp,
        expiresInMinutes: 10,
        name: userProfile?.name ?? undefined,
      },
    });
  } catch (err) {
    console.error("[OTP] Failed to queue OTP email:", err);
    return { error: "Failed to deliver verification code. Please try again later." };
  }

  return {
    success: "A 6-digit verification code has been sent to your email.",
    step: 2,
    email,
  };
}

/* -------------------------------------------------------------------------- */
/* Step 2: Verify 6-digit OTP                                                 */
/* -------------------------------------------------------------------------- */

export async function verifyPasswordResetOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { step?: number; email?: string; token?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();

  if (!email) return { error: "Email address is required." };

  const parseOtp = otpSchema.safeParse(otp);
  if (!parseOtp.success) {
    return { error: "Please enter a valid 6-digit numeric verification code." };
  }

  // Rate limit: max 5 verification attempts per minute
  const limit = checkRateLimit(`otp_ver_${email}`, { interval: 60_000, maxRequests: 5 });
  if (!limit.success) {
    return {
      error: `Too many verification attempts. Please wait ${limit.reset} seconds.`,
    };
  }

  const supabase = await getSupabase();
  const adminClient = getAdminClient();
  const client = adminClient ?? supabase;

  // Retrieve active unconsumed OTPs for this email
  const { data: records, error } = await client
    .from("password_resets")
    .select("id, otp_hash, attempts, expires_at, consumed_at")
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !records || records.length === 0) {
    return {
      error: "No active verification code found for this email. Please request a new code.",
    };
  }

  const latest = records[0];
  const now = new Date();
  const expiresAt = new Date(latest.expires_at);

  if (now > expiresAt) {
    return {
      error: "Verification code has expired. Please request a new code.",
    };
  }

  if (latest.attempts >= 5) {
    return {
      error: "Too many failed attempts. This code is invalidated. Please request a new one.",
    };
  }

  const inputHash = hashOtp(otp);

  if (inputHash !== latest.otp_hash) {
    // Increment attempts
    await client
      .from("password_resets")
      .update({ attempts: (latest.attempts || 0) + 1 })
      .eq("id", latest.id);

    return { error: "Incorrect verification code. Please check your email and try again." };
  }

  // OTP verified! Generate random reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  await client
    .from("password_resets")
    .update({ reset_token: resetToken })
    .eq("id", latest.id);

  // Store in secure HttpOnly cookie for Step 3
  const cookieStore = await cookies();
  cookieStore.set(
    RESET_TOKEN_COOKIE,
    JSON.stringify({ email, token: resetToken }),
    {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
    },
  );

  return {
    success: "Code verified successfully! You may now set your new password.",
    step: 3,
    email,
    token: resetToken,
  };
}

/* -------------------------------------------------------------------------- */
/* Step 3: Reset Password with OTP Verification Token                         */
/* -------------------------------------------------------------------------- */

export async function resetPasswordWithOtpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const emailInput = String(formData.get("email") ?? "").trim().toLowerCase();
  const tokenInput = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  // Resolve session from cookie or form input
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(RESET_TOKEN_COOKIE)?.value;
  let sessionEmail = emailInput;
  let sessionToken = tokenInput;

  if (rawCookie) {
    try {
      const parsed = JSON.parse(rawCookie);
      if (parsed.email) sessionEmail = parsed.email;
      if (parsed.token) sessionToken = parsed.token;
    } catch {
      // Ignore JSON parse error, use form input
    }
  }

  if (!sessionEmail || !sessionToken) {
    return { error: "Session expired or invalid. Please verify your OTP code again." };
  }

  const passValidation = passwordSchema.safeParse(password);
  if (!passValidation.success) {
    return { error: passValidation.error.issues[0]?.message ?? "Invalid password." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await getSupabase();
  const adminClient = getAdminClient();
  const client = adminClient ?? supabase;

  // Verify the reset token against password_resets
  const { data: resetRecord, error: tokenError } = await client
    .from("password_resets")
    .select("id, email, reset_token, expires_at, consumed_at")
    .eq("email", sessionEmail)
    .eq("reset_token", sessionToken)
    .is("consumed_at", null)
    .maybeSingle();

  if (tokenError || !resetRecord) {
    return { error: "Invalid or already consumed reset session. Please request a new code." };
  }

  if (new Date() > new Date(resetRecord.expires_at)) {
    return { error: "Reset session has expired. Please request a new code." };
  }

  // Update password in Supabase Auth
  let updateSuccess = false;

  if (adminClient) {
    // Find auth user ID from public.users or auth.admin.listUsers
    const { data: userRow } = await client
      .from("users")
      .select("id, auth_id")
      .eq("email", sessionEmail)
      .maybeSingle();

    let authId = userRow?.auth_id;

    if (!authId) {
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const matched = listData?.users?.find(
        (u) => u.email?.toLowerCase() === sessionEmail.toLowerCase(),
      );
      if (matched) authId = matched.id;
    }

    if (authId) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        authId,
        { password },
      );
      if (updateError) {
        return { error: `Failed to update password: ${updateError.message}` };
      }
      updateSuccess = true;
    }
  }

  if (!updateSuccess) {
    // Try updating session user if active
    const { error: userUpdateError } = await supabase.auth.updateUser({ password });
    if (userUpdateError && !adminClient) {
      return { error: `Failed to update password: ${userUpdateError.message}` };
    }
  }

  // Invalidate OTP record (consumed)
  await client
    .from("password_resets")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", resetRecord.id);

  // Clear cookie
  cookieStore.delete(RESET_TOKEN_COOKIE);

  redirect(`/login?success=${encodeURIComponent("Password reset successful! You can now log in.")}`);
}
