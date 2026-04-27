import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { GastosPageClient } from "@/components/dashboard/GastosPageClient";
import type { ExpenseDetailRow } from "@/lib/dashboard/expenseTypes";
import { normalizeExpenseVatRatePercent } from "@/lib/dashboard/expenseVat";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, concept, notes, category, amount_cents, expense_date, recurrence, created_at, deductibility, deductible_percent, structure_mode, vat_rate_percent",
    )
    .order("expense_date", { ascending: false });

  if (error) {
    return (
      <main className="p-6 md:p-8">
        <div className="mx-auto max-w-[1200px] rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          No se pudieron cargar los gastos: {error.message}
        </div>
      </main>
    );
  }

  const expenses: ExpenseDetailRow[] = (data ?? []).map((row) => {
    const r = row as {
      id: string;
      concept?: string;
      notes?: string | null;
      category?: string;
      amount_cents?: number;
      expense_date?: string;
      recurrence?: string;
      created_at?: string;
      deductibility?: string;
      deductible_percent?: number;
      structure_mode?: string | null;
      vat_rate_percent?: number | null;
    };
    const ded = r.deductibility === "partial" || r.deductibility === "none" ? r.deductibility : "full";
    const sm = r.structure_mode === "variable" ? "variable" : r.structure_mode === "strict" ? "strict" : null;
    return {
      id: r.id,
      concept: String(r.concept ?? ""),
      notes: r.notes != null ? String(r.notes) : null,
      category: String(r.category ?? "General"),
      amount_cents: Number(r.amount_cents ?? 0),
      expense_date: String(r.expense_date ?? ""),
      recurrence: String(r.recurrence ?? "monthly"),
      created_at: String(r.created_at ?? ""),
      deductibility: ded,
      deductible_percent: Math.min(100, Math.max(0, Number(r.deductible_percent ?? (ded === "full" ? 100 : ded === "none" ? 0 : 50)))),
      structure_mode: sm,
      vat_rate_percent: normalizeExpenseVatRatePercent(r.vat_rate_percent),
    };
  });

  return <GastosPageClient expenses={expenses} />;
}
