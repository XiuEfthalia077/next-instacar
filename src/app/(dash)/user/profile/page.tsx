import { Flash } from "@/components/common/flash";
import { PageHeader } from "@/components/common/page-header";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { getCurrentUser, getSupabase, requireRole } from "@/lib/auth";
import { readFlash, searchParam } from "@/lib/flash";
import type { UserDocumentRevision } from "@/lib/types";

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
  const initialTab =
    searchParam(params, "tab") === "documents"
      ? "documents"
      : searchParam(params, "tab") === "security"
        ? "security"
        : "personal";

  // Safely fetch document revision history (gracefully returns [] before migration runs)
  const supabase = await getSupabase();
  const { data: revisionsData } = await supabase
    .from("user_document_revisions")
    .select("*")
    .eq("user_id", session.userId)
    .order("version", { ascending: false });

  const documentRevisions = (revisionsData ?? []) as UserDocumentRevision[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile & Settings"
        subtitle="Account Preferences"
        description="Manage your account information, verification documents, and security settings."
      />

      <Flash {...flash} />

      <ProfileEditor
        session={session}
        user={user}
        returnTo="/user/profile?tab=documents"
        documentRevisions={documentRevisions}
        initialTab={initialTab}
      />

      <footer className="pt-10 pb-4 text-center text-xs text-muted-foreground">
        © 2026 Car Rental System. All rights reserved.
      </footer>
    </div>
  );
}
