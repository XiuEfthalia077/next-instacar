import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/auth-frame";
import { OtpPasswordResetFlow } from "@/components/auth/otp-password-reset-flow";

export const metadata: Metadata = {
  title: "Reset Password (OTP Verification) — InstaCar",
};

/**
 * Forgot-password page with 6-digit OTP email verification and secure reset flow.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthFrame variant="forgot">
      <div className="mb-4">
        <h3 className="font-bold text-white text-base">Account Recovery</h3>
        <p className="text-muted text-xs">
          Verify your identity with a 6-digit one-time passcode to safely set a new password.
        </p>
      </div>

      <OtpPasswordResetFlow />
    </AuthFrame>
  );
}
