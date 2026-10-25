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
import { ProfileEditor } from "@/components/profile/profile-editor";
import { BookingDocumentButton } from "@/components/shared/booking-document-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadQrCodeAction } from "@/lib/actions/profile";
import { getCurrentUser, requireSession } from "@/lib/auth";
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
  const user = await getCurrentUser();

  const content = await siteContent();
  const rentalAgreement = content.rental_agreement_html ?? "";
  const qrUrl = siteAssetUrl("qr_code_payment.png");

  const isAdminOrOperator = session.role === "admin" || session.role === "operator";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings & Portal Preferences"
        subtitle="Profile & Configurations"
        description="Manage your account profile, change security password, and configure portal agreement terms and assets."
      />

      <Flash {...flash} />

      {/* Personal Info & Password Cards */}
      <ProfileEditor session={session} user={user} returnTo="/shared/profile" />

      {/* Admin/Operator Extra Settings */}
      {isAdminOrOperator ? (
        <div className="grid gap-6 md:grid-cols-2 pt-2">
          {/* Admin/Operator QR Code */}
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

          {/* Admin/Operator Rental Agreement Visual Editor */}
          <SectionCard title="Rental Terms & Agreement Editor" icon={FileText}>
            <RentalAgreementEditor initialContent={rentalAgreement} />
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
