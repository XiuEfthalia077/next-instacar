import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";

import { AuthFrame } from "@/components/auth/auth-frame";
import { AcceptTermsForm } from "@/components/auth/accept-terms-form";

export const metadata: Metadata = {
  title: "Accept Terms of Service & Privacy Policy | InstaCar",
  description: "Review and accept InstaCar's updated terms of service and privacy policy to continue.",
};

export default function AcceptTermsPage() {
  return (
    <AuthFrame>
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ffcc00]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#ffcc00] border border-[#ffcc00]/20 mb-2">
          <ShieldCheck className="size-3.5" />
          <span>Compliance Update</span>
        </div>
        <h3 className="font-black text-lg text-white">Policy Update Required</h3>
        <p className="text-muted-foreground text-xs mt-0.5">
          Please review and accept our updated terms to access your account.
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/20" />}>
        <AcceptTermsForm />
      </Suspense>
    </AuthFrame>
  );
}
