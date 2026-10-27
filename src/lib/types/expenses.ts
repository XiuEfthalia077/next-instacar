export interface ExpenseRecord {
  id: number;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

export const EXPENSE_CATEGORIES = [
  "General Operations",
  "Facility / Rent",
  "Utilities / Electricity & Water",
  "Car Loan / Financing",
  "Maintenance & Repairs",
  "Fuel & Tolls",
  "Salaries & Wages",
  "Marketing & Ads",
  "Insurance & Registration",
  "Other Expenses",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
