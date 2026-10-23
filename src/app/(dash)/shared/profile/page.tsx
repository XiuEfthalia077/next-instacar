import {
  FileText,
  KeyRound,
  QrCode,
  Upload,
  User,
} from "lucide-react";

import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveRentalAgreementAction,
  updatePasswordAction,
  updateProfileInfoAction,
  uploadQrCodeAction,
} from "@/lib/actions/profile";
import { requireSession } from "@/lib/auth";
import { siteContent } from "@/lib/data/misc";
import { readFlash } from "@/lib/flash";
import { siteAssetUrl } from "@/lib/storage";

export const instant = false;

export default async function SharedProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const flash = readFlash(params);

  const content = await siteContent();
  const rentalAgreement = content.rental_agreement_html ?? "";
  const qrUrl = siteAssetUrl("qr_code_payment.png");

  const isAdminOrOperator = session.role === "admin" || session.role === "operator";

  return (
    <>
      <PageHeader
        title="Account Settings"
        subtitle="Profile & Preferences"
        description="Manage your account profile, change security password, and configure portal assets."
      />

      <Flash {...flash} />

      <div className="grid gap-5 md:grid-cols-12">
        {/* Personal Details */}
        <div className="md:col-span-6">
          <SectionCard title="Personal Information" icon={User}>
            <form action={updateProfileInfoAction} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={session.name}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={session.email}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Role
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-extrabold uppercase text-foreground">
                    {session.role}
                  </span>
                  {session.branchId ? (
                    <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                      Branch #{session.branchId}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full sm:w-auto font-bold bg-[#ffcc00] text-black hover:bg-[#ffd633]">
                  Save Changes
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>

        {/* Change Password */}
        <div className="md:col-span-6">
          <SectionCard title="Security & Password" icon={KeyRound}>
            <form action={updatePasswordAction} className="space-y-4">
              <div>
                <Label htmlFor="current_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Current Password
                </Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="new_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  New Password
                </Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirm_password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="outline" className="w-full sm:w-auto font-bold">
                  Update Password
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>

        {/* Admin/Operator QR Code */}
        {isAdminOrOperator ? (
          <div className="md:col-span-6">
            <SectionCard title="Payment QR Code" icon={QrCode}>
              <div className="mb-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Payment QR"
                  className="max-h-48 rounded-lg object-contain"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Current active GCash/Maya QR code
                </p>
              </div>

              <form action={uploadQrCodeAction} className="space-y-3">
                <Label htmlFor="qr_code_image" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Upload New QR Code
                </Label>
                <Input
                  id="qr_code_image"
                  name="qr_code_image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                />
                <Button type="submit" className="w-full font-bold bg-[#ffcc00] text-black hover:bg-[#ffd633]">
                  <Upload className="size-4 mr-2" />
                  Upload QR
                </Button>
              </form>
            </SectionCard>
          </div>
        ) : null}

        {/* Admin/Operator Rental Agreement */}
        {isAdminOrOperator ? (
          <div className="md:col-span-6">
            <SectionCard title="Rental Terms & Agreement" icon={FileText}>
              <form action={saveRentalAgreementAction} className="space-y-3">
                <Label htmlFor="rental_agreement_html" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rental Agreement Content (HTML)
                </Label>
                <Textarea
                  id="rental_agreement_html"
                  name="rental_agreement_html"
                  defaultValue={rentalAgreement}
                  rows={9}
                  className="font-mono text-xs"
                  placeholder="Enter HTML terms and conditions..."
                />
                <Button type="submit" className="w-full font-bold bg-[#ffcc00] text-black hover:bg-[#ffd633]">
                  Save Terms
                </Button>
              </form>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </>
  );
}
