import type { Metadata } from "next";

import { AuthFrame } from "@/components/auth/auth-frame";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
};

/**
 * Registration page — port of `car-rental/register.php`.
 */
export default function RegisterPage() {
  return (
    <AuthFrame variant="register">
      <div className="mb-4">
        <h3 className="font-bold text-white">Create Account</h3>
        <p className="text-muted text-xs">
          Join the ultimate platform for car operators
        </p>
      </div>

      <RegisterForm />
    </AuthFrame>
  );
}
