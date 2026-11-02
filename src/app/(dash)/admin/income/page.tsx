import { redirect } from "next/navigation";

export default function IncomeRedirect() {
  redirect("/admin/financials?tab=income");
}
