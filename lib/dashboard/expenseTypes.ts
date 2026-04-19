export type ExpenseDetailRow = {
  id: string;
  concept: string;
  notes: string | null;
  category: string;
  amount_cents: number;
  expense_date: string;
  recurrence: string;
  created_at: string;
  deductibility: "full" | "partial" | "none";
  deductible_percent: number;
  structure_mode: "strict" | "variable" | null;
};
