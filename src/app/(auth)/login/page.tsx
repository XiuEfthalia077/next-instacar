import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

/**
 * Login page — port of `car-rental/login.php`.
 */
export default function LoginPage() {
  return (
    <AuthFrame>
      <div className="mb-4">
        <h3 className="font-bold text-white">Login</h3>
        <p className="text-muted text-xs">Access your fleet dashboard</p>
      </div>

      <Suspense fallback={<div className="h-72" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
