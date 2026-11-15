import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ProfileRootPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/profile");
  }

  if (session.role === "user") {
    redirect("/user/profile");
  }

  redirect("/shared/profile");
}
