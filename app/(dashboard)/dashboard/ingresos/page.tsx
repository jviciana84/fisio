import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { IngresosPageClient, type IncomeTicketRow } from "@/components/dashboard/IngresosPageClient";
import type { IncomeBreakdownFiscalPrefs } from "@/lib/dashboard/incomeTicketBreakdown";

export const dynamic = "force-dynamic";

export default async function IngresosPage() {
  const supabase = createSupabaseAdminClient();

  const { data: fiscalRow } = await supabase
    .from("fiscal_settings")
    .select("use_vat_on_sales, sales_include_vat, sales_vat_rate_percent")
    .eq("id", 1)
    .maybeSingle();

  const fiscalPrefs: IncomeBreakdownFiscalPrefs = {
    useVatOnSales: fiscalRow?.use_vat_on_sales ?? false,
    salesIncludeVat: fiscalRow?.sales_include_vat ?? true,
    salesVatRatePercent: fiscalRow?.sales_vat_rate_percent ?? 21,
  };

  const { data, error } = await supabase
    .from("cash_tickets")
    .select(
      `
      id,
      ticket_number,
      total_cents,
      payment_method,
      created_at,
      clients ( full_name )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-6 md:p-8">
        <div className="mx-auto max-w-[1200px] rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          No se pudieron cargar los tickets: {error.message}
        </div>
      </main>
    );
  }

  type Row = {
    id: string;
    ticket_number: string;
    total_cents: number;
    payment_method: "cash" | "bizum" | "card";
    created_at: string;
    clients: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const raw = (data ?? []) as unknown as Row[];

  const ticketIds = raw.map((r) => r.id);
  const invByTicketId = new Map<string, { id: string; invoice_number: string }>();
  if (ticketIds.length > 0) {
    const { data: invRows } = await supabase
      .from("invoices")
      .select("id, ticket_id, invoice_number")
      .in("ticket_id", ticketIds);
    for (const inv of (invRows ?? []) as { id: string; ticket_id: string | null; invoice_number: string }[]) {
      if (inv.ticket_id) {
        invByTicketId.set(inv.ticket_id, { id: inv.id, invoice_number: inv.invoice_number });
      }
    }
  }

  function clientNameFromRow(row: Row): string | null {
    const c = row.clients;
    if (!c) return null;
    if (Array.isArray(c)) return c[0]?.full_name ?? null;
    return c.full_name ?? null;
  }

  const tickets: IncomeTicketRow[] = raw.map((row) => {
    const inv = invByTicketId.get(row.id);
    return {
      id: row.id,
      ticket_number: row.ticket_number,
      total_cents: row.total_cents,
      payment_method: row.payment_method,
      created_at: row.created_at,
      client_name: clientNameFromRow(row),
      invoice_id: inv?.id ?? null,
      invoice_number: inv?.invoice_number ?? null,
    };
  });

  return <IngresosPageClient tickets={tickets} fiscalPrefs={fiscalPrefs} />;
}
