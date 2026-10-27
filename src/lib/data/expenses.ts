import { getSupabase } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { type ExpenseRecord, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/types/expenses";

export { EXPENSE_CATEGORIES, type ExpenseRecord, type ExpenseCategory };

export async function listExpenses(filters?: {
  startDate?: string | null;
  endDate?: string | null;
}): Promise<ExpenseRecord[]> {
  const adminClient = getAdminClient();
  const supabase = adminClient ?? (await getSupabase());

  let query = supabase
    .from("expenses")
    .select("id, category, description, amount, expense_date, created_at")
    .order("expense_date", { ascending: false })
    .order("id", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("expense_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("expense_date", filters.endDate);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: Number(row.id),
    category: row.category || "General Operations",
    description: row.description || null,
    amount: Number(row.amount) || 0,
    expense_date: row.expense_date,
    created_at: row.created_at,
  }));
}

export async function getTotalExpenses(filters?: {
  startDate?: string | null;
  endDate?: string | null;
}): Promise<number> {
  const list = await listExpenses(filters);
  const total = list.reduce((sum, item) => sum + item.amount, 0);
  return Math.round(total * 100) / 100;
}
