"use server";

import { revalidatePath } from "next/cache";

import { getSupabase, requireRole } from "@/lib/auth";
import { flashRedirect } from "@/lib/flash";
import { getAdminClient } from "@/lib/supabase-admin";

function str(formData: FormData, key: string, fallback = ""): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function num(formData: FormData, key: string, fallback = 0): number {
  const value = formData.get(key);
  if (typeof value !== "string") return fallback;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function int(formData: FormData, key: string, fallback = 0): number {
  const value = formData.get(key);
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export async function addExpenseAction(formData: FormData) {
  await requireRole("admin");
  const home = "/admin/analytics";

  const description = str(formData, "description");
  const category = str(formData, "category") || "General Operations";
  const amount = num(formData, "amount");
  const expenseDate = str(formData, "expense_date") || new Date().toISOString().slice(0, 10);

  if (!description) {
    flashRedirect(home, "error", "Expense name / description is required.");
  }

  if (amount <= 0) {
    flashRedirect(home, "error", "Expense amount must be greater than ₱0.");
  }

  const adminClient = getAdminClient();
  const supabase = adminClient ?? (await getSupabase());

  const { error } = await supabase.from("expenses").insert({
    description,
    category,
    amount,
    expense_date: expenseDate,
  });

  if (error) {
    flashRedirect(home, "error", `Failed to record expense: ${error.message}`);
  }

  revalidatePath("/admin/analytics");
  flashRedirect(home, "success", `Expense "${description}" of ₱${amount.toLocaleString()} recorded successfully!`);
}

export async function editExpenseAction(formData: FormData) {
  await requireRole("admin");
  const home = "/admin/analytics";

  const id = int(formData, "id");
  if (!id) {
    flashRedirect(home, "error", "Invalid expense ID.");
  }

  const description = str(formData, "description");
  const category = str(formData, "category") || "General Operations";
  const amount = num(formData, "amount");
  const expenseDate = str(formData, "expense_date") || new Date().toISOString().slice(0, 10);

  if (!description) {
    flashRedirect(home, "error", "Expense name / description is required.");
  }

  if (amount <= 0) {
    flashRedirect(home, "error", "Expense amount must be greater than ₱0.");
  }

  const adminClient = getAdminClient();
  const supabase = adminClient ?? (await getSupabase());

  const { error } = await supabase
    .from("expenses")
    .update({
      description,
      category,
      amount,
      expense_date: expenseDate,
    })
    .eq("id", id);

  if (error) {
    flashRedirect(home, "error", `Failed to update expense: ${error.message}`);
  }

  revalidatePath("/admin/analytics");
  flashRedirect(home, "success", `Expense "${description}" updated successfully!`);
}

export async function deleteExpenseAction(formData: FormData) {
  await requireRole("admin");
  const home = "/admin/analytics";

  const id = int(formData, "id");
  if (!id) {
    flashRedirect(home, "error", "Invalid expense ID.");
  }

  const adminClient = getAdminClient();
  const supabase = adminClient ?? (await getSupabase());

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    flashRedirect(home, "error", `Failed to delete expense: ${error.message}`);
  }

  revalidatePath("/admin/analytics");
  flashRedirect(home, "success", "Expense entry deleted successfully. Profit updated.");
}
