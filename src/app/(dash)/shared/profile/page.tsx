import {
  FileText,
  KeyRound,
  QrCode,
  Shield,
  Upload,
  User,
} from "lucide-react";

import { RentalAgreementEditor } from "@/components/admin/rental-agreement-editor";
import { FileUploadDropzone } from "@/components/common/file-upload-dropzone";
import { Flash } from "@/components/common/flash";
import { LoadingButton } from "@/components/common/loading-button";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { BookingDocumentButton } from "@/components/shared/booking-document-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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
        title="Account Settings & Portal Preferences"
        subtitle="Profile & Configurations"
        description="Manage your account profile, change security password, and configure portal agreement terms and assets."
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
                  Role & Branch
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
                <LoadingButton type="submit" className="w-full sm:w-auto font-bold bg-[#ffcc00] text-black hover:bg-[#ffd633]">
                  Save Profile Changes
                </LoadingButton>
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
                <LoadingButton type="submit" variant="outline" className="w-full sm:w-auto font-bold">
                  Update Password
                </LoadingButton>
              </div>
            </form>
          </SectionCard>
        </div>

        {/* Admin/Operator QR Code */}
        {isAdminOrOperator ? (
          <div className="md:col-span-6">
            <SectionCard title="Company Payment QR Code" icon={QrCode}>
              <div className="mb-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Payment QR"
                  className="max-h-48 rounded-lg object-contain shadow-sm"
                />
                <div className="mt-3 flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    Active GCash/Maya QR code
                  </p>
                  <BookingDocumentButton
                    label="Preview Full QR"
                    url={qrUrl}
                    fileName="payment_qr.png"
                  />
                </div>
              </div>

              <form action={uploadQrCodeAction} className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Upload New QR Code Image
                </Label>
                <FileUploadDropzone
                  name="qr_code_image"
                  accept="image/png,image/jpeg,image/webp"
                  maxSizeMB={5}
                  helperText="Drag & drop PNG, JPG or WEBP payment QR code."
                />
                <LoadingButton
                  type="submit"
                  className="w-full font-bold bg-[#ffcc00] text-black hover:bg-[#ffd633]"
                >
                  <Upload className="size-4 mr-2" />
                  Save & Update QR
                </LoadingButton>
              </form>
            </SectionCard>
          </div>
        ) : null}

        {/* Admin/Operator Rental Agreement Visual Editor */}
        {isAdminOrOperator ? (
          <div className="md:col-span-6">
            <SectionCard title="Rental Terms & Agreement Editor" icon={FileText}>
              <RentalAgreementEditor initialContent={rentalAgreement} />
            </SectionCard>
          </div>
        ) : null}
      </div>
    </>
  );
}
