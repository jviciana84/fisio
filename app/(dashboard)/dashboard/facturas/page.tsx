import { FacturasPageClient, type InvoiceRow, type TicketOptionRow } from "@/components/dashboard/FacturasPageClient";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** `email` opcional: tickets solo cargan `full_name`. */
type ClientJoin = { full_name: string | null; email?: string | null };

type InvoiceDb = {
  id: string;
  invoice_number: string;
  ticket_id: string | null;
  issue_date: string;
  payment_method: "cash" | "bizum" | "card";
  total_cents: number;
  notes: string | null;
  created_at: string;
  clients: ClientJoin | ClientJoin[] | null;
};

type TicketDb = {
  id: string;
  ticket_number: string;
  total_cents: number;
  created_at: string;
  clients: ClientJoin | ClientJoin[] | null;
};

function clientNameFromJoin(value: ClientJoin | ClientJoin[] | null): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.full_name ?? null;
  return value.full_name ?? null;
}

function clientEmailFromJoin(value: ClientJoin | ClientJoin[] | null): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  const e = row?.email?.trim();
  return e || null;
}

export default async function FacturasPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: invoiceData, error: invoiceError }, { data: ticketsData, error: ticketError }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select(
          `
          id,
          invoice_number,
          ticket_id,
          issue_date,
          payment_method,
          total_cents,
          notes,
          created_at,
          clients ( full_name, email )
        `,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("cash_tickets")
        .select(
          `
          id,
          ticket_number,
          total_cents,
          created_at,
          clients ( full_name )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

  if (invoiceError || ticketError) {
    return (
      <main className="p-6 md:p-8">
        <div className="mx-auto max-w-[1200px] rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          No se pudieron cargar las facturas.
        </div>
      </main>
    );
  }

  const invoicesRaw = (invoiceData ?? []) as InvoiceDb[];
  const invoices: InvoiceRow[] = invoicesRaw.map((row) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    ticket_id: row.ticket_id,
    issue_date: row.issue_date,
    payment_method: row.payment_method,
    total_cents: row.total_cents,
    notes: row.notes,
    created_at: row.created_at,
    client_name: clientNameFromJoin(row.clients),
    client_email: clientEmailFromJoin(row.clients),
  }));

  const invoicedTicketIds = new Set(invoices.map((inv) => inv.ticket_id).filter(Boolean));
  const ticketsRaw = (ticketsData ?? []) as TicketDb[];
  const ticketOptions: TicketOptionRow[] = ticketsRaw
    .filter((t) => !invoicedTicketIds.has(t.id))
    .map((t) => ({
      id: t.id,
      ticket_number: t.ticket_number,
      total_cents: t.total_cents,
      created_at: t.created_at,
      client_name: clientNameFromJoin(t.clients),
    }));

  return <FacturasPageClient invoices={invoices} ticketOptions={ticketOptions} />;
}
