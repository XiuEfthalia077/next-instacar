import { redirect } from "next/navigation";

export default function PublicCarsRedirect() {
  redirect("/availability");
}
