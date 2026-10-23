import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/auth-frame";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
};

/**
 * Forgot-password page — port of `car-rental/pages/user/forgot.php`.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthFrame variant="forgot">
      <div className="mb-4">
        <h3 className="font-bold text-white">Reset Password</h3>
        <p className="text-muted text-xs">
          Enter your email and we&apos;ll send you a link to get back into your
          account.
        </p>
      </div>

      <ForgotPasswordForm />
    </AuthFrame>
  );
}
