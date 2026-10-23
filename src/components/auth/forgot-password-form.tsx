"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction } from "@/lib/actions/auth";
import { IDLE_STATE } from "@/lib/action-state";

/**
 * Forgot-password form — port of `car-rental/pages/user/forgot.php`.
 */
export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    IDLE_STATE,
  );

  return (
    <form action={formAction} className="text-start">
      <div className="mb-4">
        <label htmlFor="forgot-email" className="auth-form-label text-xs font-bold">
          Email Address
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          className="auth-form-control"
          placeholder="name@example.com"
          autoComplete="email"
          required
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

      <button type="submit" name="submit" className="btn-brand mb-4" disabled={isPending}>
        {isPending ? "Sending..." : "Send Reset Link"}
      </button>

      <div className="mt-2 text-center">
        <p className="mb-1 text-xs text-muted">
          Remembered your password?{" "}
          <Link href="/login" className="font-bold">
            Back to Login
          </Link>
        </p>

        <p className="text-xs text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  );
}
