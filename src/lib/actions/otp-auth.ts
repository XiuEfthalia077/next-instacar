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

  // Persist OTP in public.users table (guaranteed schema support)
  try {
    await client
      .from("users")
      .update({
        reset_token: `otp:${hashedOtp}`,
        token_expiry: expiresAt,
      })
      .eq("email", email);
  } catch (err) {
    console.error("[OTP] Failed to store OTP in users table:", err);
  }

  // Also mirror to password_resets if the table is available
  try {
    await client.from("password_resets").insert({
      email,
      otp_hash: hashedOtp,
      expires_at: expiresAt,
      attempts: 0,
    });
  } catch {
    // Ignore if table does not exist
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

  // Retrieve active unconsumed OTPs for this email from users table or password_resets
  let matchedOtpHash: string | null = null;
  let resetRecordId: number | null = null;
  let isExpired = false;

  // 1. Check public.users table (direct, migration-independent)
  const { data: userProfile } = await client
    .from("users")
    .select("id, email, reset_token, token_expiry")
    .eq("email", email)
    .maybeSingle();

  if (userProfile?.reset_token?.startsWith("otp:") && userProfile.token_expiry) {
    if (new Date() > new Date(userProfile.token_expiry)) {
      isExpired = true;
    } else {
      matchedOtpHash = userProfile.reset_token.replace(/^otp:/, "");
    }
  }

  // 2. Check password_resets fallback if not found in users
  if (!matchedOtpHash && !isExpired) {
    try {
      const { data: records } = await client
        .from("password_resets")
        .select("id, otp_hash, attempts, expires_at, consumed_at")
        .eq("email", email)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (records && records.length > 0) {
        const rec = records[0];
        if (new Date() > new Date(rec.expires_at)) {
          isExpired = true;
        } else {
          matchedOtpHash = rec.otp_hash;
          resetRecordId = rec.id;
        }
      }
    } catch {
      // Table may not exist
    }
  }

  if (isExpired) {
    return {
      error: "Verification code has expired. Please request a new code.",
    };
  }

  if (!matchedOtpHash) {
    return {
      error: "No active verification code found for this email. Please request a new code.",
    };
  }

  const inputHash = hashOtp(otp);

  if (inputHash !== matchedOtpHash) {
    return { error: "Incorrect verification code. Please check your email and try again." };
  }

  // OTP verified! Generate random reset token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Save verified session token in users.reset_token
  await client
    .from("users")
    .update({
      reset_token: `token:${resetToken}`,
      token_expiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .eq("email", email);

  if (resetRecordId) {
    try {
      await client
        .from("password_resets")
        .update({ reset_token: resetToken })
        .eq("id", resetRecordId);
    } catch {
      // Ignore
    }
  }

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

  // Verify the reset token against users table and password_resets
  let tokenValid = false;

  const { data: userRow } = await client
    .from("users")
    .select("id, auth_id, email, reset_token, token_expiry")
    .eq("email", sessionEmail)
    .maybeSingle();

  if (userRow?.reset_token === `token:${sessionToken}` && userRow.token_expiry) {
    if (new Date() <= new Date(userRow.token_expiry)) {
      tokenValid = true;
    }
  }

  if (!tokenValid) {
    try {
      const { data: resetRecord } = await client
        .from("password_resets")
        .select("id, expires_at, consumed_at")
        .eq("email", sessionEmail)
        .eq("reset_token", sessionToken)
        .is("consumed_at", null)
        .maybeSingle();

      if (resetRecord && new Date() <= new Date(resetRecord.expires_at)) {
        tokenValid = true;
        await client
          .from("password_resets")
          .update({ consumed_at: new Date().toISOString() })
          .eq("id", resetRecord.id);
      }
    } catch {
      // Table may not exist
    }
  }

  if (!tokenValid) {
    return { error: "Invalid or expired reset session. Please request a new code." };
  }

  // Update password in Supabase Auth
  let updateSuccess = false;

  if (adminClient) {
    // Find auth user ID from public.users or auth.admin.listUsers
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

  // Invalidate OTP record in users table
  await client
    .from("users")
    .update({ reset_token: null, token_expiry: null })
    .eq("email", sessionEmail);

  // Clear cookie
  cookieStore.delete(RESET_TOKEN_COOKIE);

  redirect(`/login?success=${encodeURIComponent("Password reset successful! You can now log in.")}`);
}
