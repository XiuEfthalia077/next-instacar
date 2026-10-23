"use client";

import { useActionState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { resetPasswordAction } from "@/lib/actions/auth";
import { IDLE_STATE } from "@/lib/action-state";

/**
 * Reset-password form — port of the `<form action="process/reset_process.php">`
 * block of `car-rental/pages/user/reset.php`.
 */
export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    IDLE_STATE,
  );

  return (
    <form action={formAction} className="text-start">
      <div className="mb-3">
        <label htmlFor="reset-password" className="auth-form-label font-bold">
          New Password
        </label>
        <PasswordField
          id="reset-password"
          name="password"
          autoComplete="new-password"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="reset-confirm-password" className="auth-form-label font-bold">
          Confirm Password
        </label>
        <PasswordField
          id="reset-confirm-password"
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

      <button type="submit" className="btn-brand" disabled={isPending}>
        {isPending ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
