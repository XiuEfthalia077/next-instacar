"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ExternalLink, FileText, Loader2, LogOut, ShieldCheck } from "lucide-react";

import { acceptTermsAction, signOutAction } from "@/lib/actions/auth";
import { IDLE_STATE } from "@/lib/action-state";

export function AcceptTermsForm() {
  const [state, formAction, isPending] = useActionState(acceptTermsAction, IDLE_STATE);
  const [agreed, setAgreed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOutAction();
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="space-y-5">
      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300"
        >
          {state.error}
        </div>
      )}

      {/* Summary Box */}
      <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3 text-xs leading-relaxed text-muted-foreground">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <FileText className="size-4 text-[#ffcc00]" />
          <span>Terms of Service &amp; Privacy Policy (v1.0)</span>
        </div>
        <p>
          We have updated our platform policies to ensure full compliance with regulatory standards and the Philippine Data Privacy Act of 2012 (RA 10173). To continue accessing your InstaCar account and fleet services, please review and accept our updated terms.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-border/50">
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-[#ffcc00] hover:underline"
          >
            <span>Review Terms of Service</span>
            <ExternalLink className="size-3" />
          </Link>
          <span className="hidden sm:inline text-muted-foreground/60">&bull;</span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-[#ffcc00] hover:underline"
          >
            <span>Review Privacy Policy</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Controlled Checkbox */}
        <label
          htmlFor="accept-terms-checkbox"
          className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3.5 text-xs text-foreground hover:border-[#ffcc00]/60 transition-colors cursor-pointer select-none"
        >
          <input
            id="accept-terms-checkbox"
            name="terms_accepted"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border bg-background text-[#ffcc00] focus:ring-2 focus:ring-[#ffcc00]/30 cursor-pointer shrink-0"
            required
          />
          <span className="leading-snug">
            I confirm that I have read, understood, and agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-[#ffcc00] hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-[#ffcc00] hover:underline"
            >
              Privacy Policy
            </Link>{" "}
            (v1.0).
          </span>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!agreed || isPending || isSigningOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffcc00] py-3 text-sm font-black text-black shadow-lg shadow-[#ffcc00]/20 transition-all hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px]"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Confirming Acceptance...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="size-4" />
              <span>Accept &amp; Continue to Dashboard</span>
            </>
          )}
        </button>
      </form>

      {/* Sign Out Option */}
      <div className="pt-2 text-center border-t border-border/50">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut || isPending}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors min-h-[44px] px-3 py-1"
        >
          {isSigningOut ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <LogOut className="size-3.5" />
          )}
          <span>Do not agree? Sign out</span>
        </button>
      </div>
    </div>
  );
}
