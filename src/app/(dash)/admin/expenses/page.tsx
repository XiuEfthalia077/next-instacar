import { redirect } from "next/navigation";

export default function ExpensesRedirect() {
  redirect("/admin/financials?tab=expenses");
}
