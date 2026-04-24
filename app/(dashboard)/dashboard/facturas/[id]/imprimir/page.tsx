import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoicePdfContent, type InvoicePdfClient } from "@/components/dashboard/InvoicePdfContent";
import { InvoicePrintButton } from "@/components/dashboard/InvoicePrintButton";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type InvoiceWithClient = {
  id: string;
  invoice_number: string;
  issue_date: string;
  payment_method: "cash" | "bizum" | "card";
  subtotal_cents: number;
  total_cents: number;
  notes: string | null;
  clients: InvoicePdfClient | InvoicePdfClient[] | null;
};

type InvoiceItem = {
  concept: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

function paymentLabel(m: InvoiceWithClient["payment_method"]): string {
  if (m === "cash") return "Efectivo";
  if (m === "bizum") return "Bizum";
  return "Tarjeta";
}

function clientFromJoin(value: InvoiceWithClient["clients"]): InvoicePdfClient | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        [
          "id, invoice_number, issue_date, payment_method, subtotal_cents, total_cents, notes",
          "clients(full_name, tax_id, address, email, phone, client_code)",
        ].join(","),
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("concept, quantity, unit_price_cents, line_total_cents")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!invoice) notFound();

  const current = invoice as unknown as InvoiceWithClient;
  const lineItems = (items ?? []) as InvoiceItem[];

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex w-full max-w-[210mm] items-center justify-between print:hidden">
        <Link
          href="/dashboard/facturas"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Volver a facturas
        </Link>
        <InvoicePrintButton invoiceNumber={current.invoice_number} />
      </div>

      <div className="flex justify-center overflow-x-auto overflow-y-visible pb-6 print:block print:overflow-visible print:pb-0">
        <InvoicePdfContent
          invoiceNumber={current.invoice_number}
          issueDate={current.issue_date}
          paymentLabel={paymentLabel(current.payment_method)}
          client={clientFromJoin(current.clients)}
          subtotalCents={current.subtotal_cents}
          totalCents={current.total_cents}
          notes={current.notes}
          lines={lineItems}
        />
      </div>

      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }
      `}</style>
    </main>
  );
}
