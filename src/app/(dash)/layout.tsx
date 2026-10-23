import { connection } from "next/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";

/**
 * Dashboard layout — wraps every authenticated route with the legacy
 * sidebar + topbar chrome (`pages/components/sidebar.php` and
 * `pages/components/header.php`).
 *
 * `instant = false` is required because the shell reads the auth cookie.
 */
export const instant = false;

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <DashboardShell>{children}</DashboardShell>;
}
