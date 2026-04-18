import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { GastosPageClient, type ExpenseDetailRow } from "@/components/dashboard/GastosPageClient";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("id, concept, notes, category, amount_cents, expense_date, recurrence")
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

  const expenses: ExpenseDetailRow[] = (data ?? []).map((row) => ({
    id: row.id as string,
    concept: String(row.concept ?? ""),
    notes: row.notes != null ? String(row.notes) : null,
    category: String(row.category ?? "General"),
    amount_cents: Number(row.amount_cents ?? 0),
    expense_date: String(row.expense_date ?? ""),
    recurrence: String(row.recurrence ?? "monthly"),
  }));

  return <GastosPageClient expenses={expenses} />;
}
