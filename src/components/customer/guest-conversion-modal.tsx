"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, CheckCircle2, Eye, EyeOff, ShieldCheck, X } from "lucide-react";

import { LoadingButton } from "@/components/common/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linkGuestBookingToAccountAction } from "@/lib/actions/bookings";

export function GuestConversionModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const promptSignup = searchParams.get("prompt_signup") === "1";
  const guestBookingId = searchParams.get("guest_booking_id");
  const initialEmail = searchParams.get("email") || "";

  const [open, setOpen] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (promptSignup && guestBookingId) {
      setOpen(true);
    }
  }, [promptSignup, guestBookingId]);

  const handleDismiss = () => {
    setOpen(false);
    // Remove query params cleanly from URL without reloading
    const params = new URLSearchParams(searchParams.toString());
    params.delete("prompt_signup");
    params.delete("guest_booking_id");
    params.delete("email");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (password.length < 8) {
      e.preventDefault();
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      e.preventDefault();
      setError("Passwords do not match.");
      return;
    }
    setError(null);
  };

  if (!promptSignup || !guestBookingId) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="max-w-md border-border bg-card p-6 sm:p-7 text-card-foreground rounded-2xl shadow-xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="size-7" />
          </div>
          <DialogTitle className="text-xl font-black text-foreground">
            Save Documents for Next Time!
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Create an account to securely save the Driver&apos;s License and documents you just
            uploaded. You&apos;ll skip verification and enjoy 1-click booking on your next rental.
          </DialogDescription>
        </DialogHeader>

        <form action={linkGuestBookingToAccountAction} onSubmit={handleSubmit} className="space-y-4 pt-2">
          <input type="hidden" name="booking_id" value={guestBookingId} />

          <div className="space-y-1.5">
            <Label htmlFor="conv_email" className="text-xs sm:text-sm font-bold text-foreground">
              Account Email
            </Label>
            <Input
              id="conv_email"
              name="email"
              type="email"
              required
              defaultValue={initialEmail}
              className="h-11 rounded-xl text-sm bg-muted/40 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conv_pass" className="text-xs sm:text-sm font-bold text-foreground">
              Create Password (min. 8 characters) *
            </Label>
            <div className="relative">
              <Input
                id="conv_pass"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="h-11 rounded-xl text-sm pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conv_conf" className="text-xs sm:text-sm font-bold text-foreground">
              Confirm Password *
            </Label>
            <Input
              id="conv_conf"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="••••••••"
              className="h-11 rounded-xl text-sm"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-bold text-rose-500">
              {error}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <LoadingButton
              type="submit"
              className="h-12 w-full rounded-xl bg-[#ffcc00] font-black text-black hover:bg-[#ffd633] transition shadow-xs text-sm"
            >
              <ShieldCheck className="size-4.5 mr-2 stroke-[2.5]" />
              Create Account &amp; Save Documents
            </LoadingButton>

            <button
              type="button"
              onClick={handleDismiss}
              className="h-10 text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Skip for now (I&apos;ll upload next time)
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
