import { FileText } from "lucide-react";

import { CompanyQrCodeCard } from "@/components/admin/company-qr-code-card";
import { RentalAgreementEditor } from "@/components/admin/rental-agreement-editor";
import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { ProfileEditor } from "@/components/profile/profile-editor";
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
    <div className="space-y-8 pb-10">
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
        <div className="grid gap-8 lg:grid-cols-2 pt-2">
          {/* Admin/Operator Payment QR Code */}
          <CompanyQrCodeCard initialQrUrl={qrUrl} />

          {/* Admin/Operator Rental Agreement Visual Editor */}
          <SectionCard
            title="Rental Terms & Agreement Editor"
            icon={FileText}
            className="overflow-hidden shadow-sm"
            bodyClassName="p-6 sm:p-7"
          >
            <RentalAgreementEditor initialContent={rentalAgreement} />
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
