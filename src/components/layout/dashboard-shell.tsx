import { DashboardFrame } from "@/components/layout/dashboard-frame";
import { getSupabase, requireSession } from "@/lib/auth";
import type { Branch } from "@/lib/types";

/**
 * Dashboard shell — the Next.js equivalent of the legacy
 * `pages/components/sidebar.php` + `pages/components/header.php` pair.
 */
export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  let branches: Branch[] = [];

  if (session.role === "admin") {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("branches")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    branches = (data ?? []) as Branch[];
  }

  return (
    <DashboardFrame session={session} branches={branches}>
      {children}
    </DashboardFrame>
  );
}
