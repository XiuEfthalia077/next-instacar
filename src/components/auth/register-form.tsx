"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Check, House, Loader2, X } from "lucide-react";

import { GoogleButton } from "@/components/auth/google-button";
import { PasswordField } from "@/components/auth/password-field";
import { LoadingButton } from "@/components/common/loading-button";
import { signUpAction } from "@/lib/actions/auth";
import { IDLE_STATE } from "@/lib/action-state";

/**
 * Registration form with real-time password requirements checklist,
 * live email availability checking, matching password validation,
 * and state preservation across errors.
 */
export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, IDLE_STATE);

  // Form input state to preserve inputs on validation failure
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Real-time email check state
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  // Password validation checks (Regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const isPasswordValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const passwordsMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  // Real-time debounced email uniqueness verification
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setEmailExists(false);
      setEmailChecking(false);
      return;
    }

    setEmailChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setEmailExists(Boolean(data.exists));
        } else {
          setEmailExists(false);
        }
      } catch {
        setEmailExists(false);
      } finally {
        setEmailChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  const canSubmit =
    !isPending &&
    !emailChecking &&
    !emailExists &&
    isPasswordValid &&
    passwordsMatch &&
    termsAccepted &&
    name.trim().length >= 2 &&
    phone.trim().length >= 7;

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
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="auth-form-control"
          placeholder="John Doe"
          autoComplete="name"
          required
        />
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between">
          <label htmlFor="register-email" className="auth-form-label text-xs font-bold">
            Email Address
          </label>
          {emailChecking ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Checking...
            </span>
          ) : null}
        </div>
        <input
          id="register-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`auth-form-control ${
            emailExists ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""
          }`}
          placeholder="JohnDoe@example.com"
          autoComplete="email"
          required
        />
        {emailExists ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-400 font-medium">
            <X className="size-3.5" /> Email already registered. Please sign in or use another.
          </p>
        ) : null}
      </div>

      <div className="mb-3">
        <label htmlFor="register-phone" className="auth-form-label text-xs font-bold">
          Phone Number
        </label>
        <input
          id="register-phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {/* Real-time Password Requirements Checklist */}
        {password.length > 0 ? (
          <div className="mt-2 rounded-lg border border-border/80 bg-muted/40 p-2.5 text-[11px] space-y-1">
            <p className="font-semibold text-muted-foreground mb-1 text-[11px]">
              Password Requirements:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  hasMinLength ? "text-emerald-500 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                }`}
              >
                {hasMinLength ? <Check className="size-3" /> : <span className="size-3 text-center leading-3">•</span>}
                At least 8 characters
              </span>
              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  hasUpper ? "text-emerald-500 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                }`}
              >
                {hasUpper ? <Check className="size-3" /> : <span className="size-3 text-center leading-3">•</span>}
                1 uppercase letter (A-Z)
              </span>
              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  hasLower ? "text-emerald-500 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                }`}
              >
                {hasLower ? <Check className="size-3" /> : <span className="size-3 text-center leading-3">•</span>}
                1 lowercase letter (a-z)
              </span>
              <span
                className={`flex items-center gap-1.5 transition-colors ${
                  hasNumber ? "text-emerald-500 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                }`}
              >
                {hasNumber ? <Check className="size-3" /> : <span className="size-3 text-center leading-3">•</span>}
                1 number (0-9)
              </span>
              <span
                className={`col-span-1 sm:col-span-2 flex items-center gap-1.5 transition-colors ${
                  hasSpecial ? "text-emerald-500 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                }`}
              >
                {hasSpecial ? <Check className="size-3" /> : <span className="size-3 text-center leading-3">•</span>}
                1 special character (!@#$%^&*...)
              </span>
            </div>
          </div>
        ) : null}
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
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        {passwordsMismatch ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-400 font-medium">
            <X className="size-3.5" /> Passwords do not match.
          </p>
        ) : passwordsMatch ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500 dark:text-emerald-400 font-medium">
            <Check className="size-3.5" /> Passwords match.
          </p>
        ) : null}
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

      <div className="mb-4">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            id="register-terms"
            name="terms_accepted"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 size-4 rounded border-[#444] bg-[#1a1a1a] text-[#ffcc00] focus:ring-[#ffcc00]/30 cursor-pointer accent-[#ffcc00]"
            required
          />
          <span className="text-xs text-muted leading-relaxed">
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#ffcc00] hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#ffcc00] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      <LoadingButton
        type="submit"
        name="submit"
        loading={isPending}
        loadingText="Creating Account..."
        disabled={!canSubmit || isPending}
        className="btn-register w-full h-auto py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create Account
      </LoadingButton>

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
