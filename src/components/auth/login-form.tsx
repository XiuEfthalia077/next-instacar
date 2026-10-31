"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { House } from "lucide-react";

import { GoogleButton } from "@/components/auth/google-button";
import { PasswordField } from "@/components/auth/password-field";
import { LoadingButton } from "@/components/common/loading-button";
import { signInAction } from "@/lib/actions/auth";
import { IDLE_STATE } from "@/lib/action-state";

/**
 * Login form — port of the `<form action="process/auth/loginprocess.php">`
 * block of `car-rental/login.php`.
 */
export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAction, IDLE_STATE);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  // Flash message of a finished action (password reset, logout, ...).
  const flash = searchParams.get("success") ?? "";

  return (
    <form action={formAction} className="text-start">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {flash ? (
        <p
          role="status"
          className="mb-3 rounded-lg border border-[#ffcc00]/40 bg-[#ffcc00]/10 px-3 py-2 text-sm text-[#ffcc00]"
        >
          {flash}
        </p>
      ) : null}

      <div className="mb-3">
        <label htmlFor="login-email" className="auth-form-label text-xs font-bold">
          Email Address
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          className="auth-form-control"
          placeholder="name@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between">
          <label htmlFor="login-password" className="auth-form-label text-xs font-bold">
            Password
          </label>
          <Link href="/user/forgot" className="text-xs">
            Forgot Password?
          </Link>
        </div>
        <PasswordField
          id="login-password"
          name="password"
          autoComplete="current-password"
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

      <LoadingButton
        type="submit"
        name="submit"
        loading={isPending}
        loadingText="Signing In..."
        className="btn-login w-full h-auto py-3 font-bold"
      >
        Sign In
      </LoadingButton>

      <p className="mt-2.5 text-center text-[11px] text-muted-foreground leading-normal">
        By signing in, you agree to our{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-muted hover:text-[#ffcc00] transition-colors"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-muted hover:text-[#ffcc00] transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <div className="divider">OR</div>

      <GoogleButton label="Continue with Google" />

      <div className="mt-4 text-center">
        <p className="mb-1 text-xs text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-bold">
            Sign up
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
