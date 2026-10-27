"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, ShieldAlert, Sparkles } from "lucide-react";

import { LoadingButton } from "@/components/common/loading-button";
import {
  requestPasswordResetOtpAction,
  verifyPasswordResetOtpAction,
  resetPasswordWithOtpAction,
} from "@/lib/actions/otp-auth";

export function OtpPasswordResetFlow() {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [token, setToken] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [countdown, setCountdown] = React.useState(600); // 10 minutes in seconds

  // Countdown timer for Step 2
  React.useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      const res = await requestPasswordResetOtpAction({ error: undefined, success: undefined }, formData);

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.success ?? "A 6-digit verification code has been sent to your email.");
        setStep(2);
        setCountdown(600);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("otp", otp);
      const res = await verifyPasswordResetOtpAction({ error: undefined, success: undefined }, formData);

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(res.success ?? "Code verified successfully!");
        if (res.token) setToken(res.token);
        setStep(3);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("token", token);
      formData.set("password", password);
      formData.set("confirm_password", confirmPassword);

      const res = await resetPasswordWithOtpAction({ error: undefined, success: undefined }, formData);
      if (res?.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("email", email);
      const res = await requestPasswordResetOtpAction({ error: undefined, success: undefined }, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("New verification code sent!");
        setCountdown(600);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
              step >= 1
                ? "bg-[#ffcc00] text-black"
                : "bg-muted text-muted-foreground"
            }`}
          >
            1
          </span>
          <span className="text-xs font-semibold text-foreground">Email</span>
        </div>

        <div className="h-0.5 flex-1 mx-3 bg-border" />

        <div className="flex items-center gap-2">
          <span
            className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
              step >= 2
                ? "bg-[#ffcc00] text-black"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </span>
          <span className="text-xs font-semibold text-foreground">Verify OTP</span>
        </div>

        <div className="h-0.5 flex-1 mx-3 bg-border" />

        <div className="flex items-center gap-2">
          <span
            className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
              step === 3
                ? "bg-[#ffcc00] text-black"
                : "bg-muted text-muted-foreground"
            }`}
          >
            3
          </span>
          <span className="text-xs font-semibold text-foreground">New Password</span>
        </div>
      </div>

      {/* Error & Success Feedback */}
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
          <ShieldAlert className="size-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      ) : null}

      {/* Step 1: Request OTP Form */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label htmlFor="otp-email" className="auth-form-label text-xs font-bold block mb-1.5">
              Account Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="otp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="auth-form-control pl-10 h-11"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              We will generate and send a secure 6-digit one-time passcode to this address.
            </p>
          </div>

          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText="Generating Code..."
            disabled={!email || isSubmitting}
            className="w-full bg-[#ffcc00] text-black hover:bg-[#ffd633] font-bold py-2.5 rounded-xl shadow-sm transition"
          >
            Send Verification Code
          </LoadingButton>
        </form>
      )}

      {/* Step 2: Verify OTP Form */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="otp-code" className="auth-form-label text-xs font-bold">
                6-Digit Verification Code
              </label>
              <span className="text-[11px] font-mono text-[#ffcc00]">
                Expires in: {formatTime(countdown)}
              </span>
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                className="auth-form-control pl-10 h-12 text-center text-xl font-mono tracking-[8px] font-bold"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Sent to <strong className="text-foreground">{email}</strong>. Check your inbox and spam folder.
            </p>
          </div>

          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText="Verifying Code..."
            disabled={otp.length !== 6 || isSubmitting}
            className="w-full bg-[#ffcc00] text-black hover:bg-[#ffd633] font-bold py-2.5 rounded-xl shadow-sm transition"
          >
            Verify &amp; Continue
          </LoadingButton>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="size-3" /> Change Email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isSubmitting || countdown > 540}
              className="text-xs text-[#ffcc00] hover:underline disabled:opacity-50"
            >
              Resend Code
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Set New Password Form */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="auth-form-label text-xs font-bold block mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoFocus
                className="auth-form-control pl-10 h-11"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-new-password" className="auth-form-label text-xs font-bold block mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                minLength={6}
                className="auth-form-control pl-10 h-11"
              />
            </div>
          </div>

          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText="Updating Password..."
            disabled={!password || password !== confirmPassword || isSubmitting}
            className="w-full bg-[#ffcc00] text-black hover:bg-[#ffd633] font-bold py-2.5 rounded-xl shadow-sm transition"
          >
            <Sparkles className="size-4 mr-1.5" /> Save New Password
          </LoadingButton>
        </form>
      )}

      {/* Back to Login */}
      <div className="mt-6 border-t border-border/50 pt-4 text-center">
        <Link
          href="/login"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="size-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
