import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";

/** `/user` has no page of its own in the legacy app — it lands on the dashboard. */
export const instant = false;

export default async function UserIndexPage() {
  await requireRole("user");
  redirect("/user/dashboard");
}
