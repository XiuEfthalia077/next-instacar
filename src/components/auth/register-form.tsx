"use client";

import Link from "next/link";
import { useActionState } from "react";
import { House } from "lucide-react";

import { GoogleButton } from "@/components/auth/google-button";
import { PasswordField } from "@/components/auth/password-field";
import { signUpAction } from "@/lib/actions/auth";
import { IDLE_STATE } from "@/lib/action-state";

/**
 * Registration form — port of the `<form action="process/auth/registerprocess.php">`
 * block of `car-rental/register.php`.
 */
export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, IDLE_STATE);

  return (
    <form action={formAction} className="text-start">
      <div className="mb-3">
        <label htmlFor="register-name" className="auth-form-label text-xs font-bold">
          Full Name
        </label>
        <input
          id="register-name"
          name="name"
          type="text"
          className="auth-form-control"
          placeholder="John Doe"
          autoComplete="name"
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="register-email" className="auth-form-label text-xs font-bold">
          Email Address
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          className="auth-form-control"
          placeholder="JohnDoe@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="register-phone" className="auth-form-label text-xs font-bold">
          Phone Number
        </label>
        <input
          id="register-phone"
          name="phone"
          type="tel"
          className="auth-form-control"
          placeholder="09123456789"
          autoComplete="tel"
          required
        />
      </div>

      <div className="mb-3">
        <label htmlFor="register-password" className="auth-form-label text-xs font-bold">
          Password
        </label>
        <PasswordField
          id="register-password"
          name="password"
          autoComplete="new-password"
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="register-confirm-password"
          className="auth-form-label text-xs font-bold"
        >
          Confirm Password
        </label>
        <PasswordField
          id="register-confirm-password"
          name="confirm_password"
          autoComplete="new-password"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="mb-3 rounded-lg border border-[#ffcc00]/40 bg-[#ffcc00]/10 px-3 py-2 text-sm text-[#ffcc00]"
        >
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        name="submit"
        className="btn-register"
        disabled={isPending}
      >
        {isPending ? "Creating Account..." : "Create Account"}
      </button>

      <div className="divider">OR</div>

      <GoogleButton label="Sign up with Google" />

      <div className="mt-4 text-center">
        <p className="mb-1 text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-bold">
            Sign In
          </Link>
        </p>
        <p className="text-xs">
          <Link href="/" className="text-[#6c757d] hover:text-white">
            <House className="me-1 inline h-3.5 w-3.5" aria-hidden />
            Back to Main Site
          </Link>
        </p>
      </div>
    </form>
  );
}
