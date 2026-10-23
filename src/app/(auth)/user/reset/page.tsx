import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/auth-frame";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
};

/**
 * Reset-password page — port of `car-rental/pages/user/reset.php`.
 *
 * The legacy page validated a 64 character token before rendering; the
 * Supabase Auth recovery link already carries a signed session, so the page
 * only has to render the form.
 */
export default function ResetPasswordPage() {
  return (
    <AuthFrame variant="reset" showLogo={false} pageClassName="!bg-[#0b0b0b]">
      <p className="mb-4 text-sm text-white">
        Secure your account with a new password.
      </p>

      <ResetPasswordForm />
    </AuthFrame>
  );
}
