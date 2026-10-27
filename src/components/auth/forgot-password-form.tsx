"use client";

import { OtpPasswordResetFlow } from "@/components/auth/otp-password-reset-flow";

/**
 * Re-export the 6-digit OTP Password Reset Flow as ForgotPasswordForm.
 */
export function ForgotPasswordForm() {
  return <OtpPasswordResetFlow />;
}
