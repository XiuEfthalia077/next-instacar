import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { readFlash } from "@/lib/flash";

export const instant = false;

export default async function UserProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("user");
  const params = await searchParams;
  const flash = readFlash(params);
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile & Settings"
        subtitle="Account Preferences"
        description="Manage your account information, security, and payment settings."
      />

      <Flash {...flash} />

      <ProfileEditor session={session} user={user} returnTo="/user/profile" />

      <footer className="pt-10 pb-4 text-center text-xs text-muted-foreground">
        © 2026 Car Rental System. All rights reserved.
      </footer>
    </div>
  );
}
