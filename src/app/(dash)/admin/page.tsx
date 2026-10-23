import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

/** `/admin` has no page of its own in the legacy app — it lands on the dashboard. */
export const instant = false;

export default async function AdminIndexPage() {
  await requireRole("admin");
  redirect("/admin/dashboard");
}
