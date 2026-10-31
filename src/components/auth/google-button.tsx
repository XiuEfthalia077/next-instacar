"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/utils/supabase/client";

/** The official four-colour Google "G" mark. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844c-.208 1.25-.825 2.309-1.757 3.024v2.51h2.847c1.665-1.533 2.706-3.78 2.706-6.174z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.181l-2.847-2.51c-.786.527-1.792.838-3.109.838-2.396 0-4.424-1.616-5.148-3.789H.956v2.595C2.438 15.387 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.852 9.358c-.14-.44-.22-.906-.22-1.386s.08-.946.22-1.386V4.041H.956C.347 5.787 0 7.526 0 9.358s.347 3.571.956 5.317l2.896-2.317z"
      />
      <path
        fill="#EA4335"
        d="M9 3.578c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.463.892 11.426 0 9 0 5.482 0 2.438 1.613.956 4.041l2.896 2.317C4.576 5.194 6.604 3.578 9 3.578z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" button with Terms and Privacy disclaimer copy.
 *
 * Port of `car-rental/process/auth/googlelogin.php`, which redirected the
 * visitor to Google's OAuth consent screen. Here the Supabase Auth OAuth
 * helper does the same job and returns to `/auth/callback`.
 */
export function GoogleButton({
  label,
  showDisclaimer = true,
}: {
  label: string;
  showDisclaimer?: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get("next");
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (next && next.startsWith("/")) {
        callbackUrl.searchParams.set("next", next);
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setBusy(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-google"
        onClick={handleClick}
        disabled={busy}
      >
        <GoogleMark />
        <span>{busy ? "Redirecting..." : label}</span>
      </button>

      {showDisclaimer ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground leading-normal">
          By continuing with Google, you agree to our{" "}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline hover:text-[#ffcc00] transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline hover:text-[#ffcc00] transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-400 text-center">
          {error}
        </p>
      ) : null}
    </>
  );
}
