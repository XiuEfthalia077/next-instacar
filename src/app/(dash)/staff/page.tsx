import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

/** `/staff` has no page of its own in the legacy app — it lands on the dashboard. */
export const instant = false;

export default async function StaffIndexPage() {
  await requireRole("staff");
  redirect("/staff/dashboard");
}
