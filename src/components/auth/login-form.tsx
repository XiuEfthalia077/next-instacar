"use client";

import Link from "next/link";
import { useActionState } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { PasswordField } from "@/components/auth/password-field";
import { LoadingButton } from "@/components/common/loading-button";
import { signInAction } from "@/lib/actions/auth";
import { IDLE_STATE } from "@/lib/action-state";

export function LoginForm({
  flash,
  next,
}: {
  flash?: string;
  next?: string;
}) {
  const [state, formAction, isPending] = useActionState(signInAction, IDLE_STATE);

  return (
    <form action={formAction} className="text-start space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {flash ? (
        <p
          role="status"
          className="rounded-xl border border-[#ffcc00]/40 bg-[#ffcc00]/10 px-3.5 py-2.5 text-sm text-foreground font-semibold"
        >
          {flash}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="login-email" className="auth-form-label text-xs sm:text-sm font-bold block">
          Email Address
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          className="auth-form-control h-11 text-xs sm:text-sm"
          placeholder="name@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label htmlFor="login-password" className="auth-form-label text-xs sm:text-sm font-bold">
            Password
          </label>
          <Link
            href="/user/forgot"
            className="text-xs font-semibold text-amber-700 hover:text-amber-600 dark:text-[#ffcc00] dark:hover:text-[#ffd633] transition"
          >
            Forgot Password?
          </Link>
        </div>
        <PasswordField
          id="login-password"
          name="password"
          autoComplete="current-password"
          className="h-11 text-xs sm:text-sm"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs sm:text-sm text-red-400 font-medium"
        >
          {state.error}
        </p>
      ) : null}

      <LoadingButton
        type="submit"
        name="submit"
        loading={isPending}
        loadingText="Signing In..."
        className="btn-login w-full h-11 text-xs sm:text-sm font-black shadow-md"
      >
        Sign In
      </LoadingButton>

      <div className="divider text-xs text-muted-foreground my-3">OR</div>

      <GoogleButton label="Continue with Google" showDisclaimer={false} />

      <p className="pt-2 text-center text-xs text-muted-foreground leading-normal">
        By continuing, you agree to our{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-foreground underline hover:text-[#ffcc00] transition-colors"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-foreground underline hover:text-[#ffcc00] transition-colors"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <div className="pt-2 text-center">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-amber-700 hover:text-amber-600 dark:text-[#ffcc00] dark:hover:text-[#ffd633] underline transition"
          >
            Sign up &rarr;
          </Link>
        </p>
      </div>
    </form>
  );
}
