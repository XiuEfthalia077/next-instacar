import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

/** `/operator` has no page of its own in the legacy app — it lands on the dashboard. */
export const instant = false;

export default async function OperatorIndexPage() {
  await requireRole("operator");
  redirect("/operator/dashboard");
}
