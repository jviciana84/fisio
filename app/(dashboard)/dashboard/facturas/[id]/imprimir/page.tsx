import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoicePrintButton } from "@/components/dashboard/InvoicePrintButton";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatEuroEsTwoDecimals } from "@/lib/format-es";

export const dynamic = "force-dynamic";

type InvoiceWithClient = {
  id: string;
  invoice_number: string;
  issue_date: string;
  payment_method: "cash" | "bizum" | "card";
  total_cents: number;
  notes: string | null;
  clients: { full_name: string | null } | { full_name: string | null }[] | null;
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

function clientNameFromJoin(
  value: { full_name: string | null } | { full_name: string | null }[] | null,
): string {
  if (!value) return "Cliente sin asignar";
  if (Array.isArray(value)) return value[0]?.full_name ?? "Cliente sin asignar";
  return value.full_name ?? "Cliente sin asignar";
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
      .select("id, invoice_number, issue_date, payment_method, total_cents, notes, clients(full_name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("concept, quantity, unit_price_cents, line_total_cents")
      .eq("invoice_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!invoice) notFound();

  const current = invoice as InvoiceWithClient;
  const lineItems = (items ?? []) as InvoiceItem[];

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex w-full max-w-[210mm] items-center justify-between print:hidden">
        <Link href="/dashboard/facturas" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Volver a facturas
        </Link>
        <InvoicePrintButton />
      </div>

      <section className="mx-auto w-full max-w-[210mm] bg-white p-[12mm] text-[12px] text-slate-900 shadow print:shadow-none">
        <header className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-wide">Factura PSF</h1>
            <p className="mt-1 text-slate-600">Fisioterapia Roc Blanc</p>
            <p className="text-slate-600">Terrassa, Barcelona</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{current.invoice_number}</p>
            <p className="text-slate-600">Fecha: {new Date(current.issue_date).toLocaleDateString("es-ES")}</p>
            <p className="text-slate-600">Pago: {paymentLabel(current.payment_method)}</p>
          </div>
        </header>

        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Cliente</p>
          <p className="font-medium">{clientNameFromJoin(current.clients)}</p>
        </div>

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="py-2">Concepto</th>
              <th className="py-2 text-right">Cant.</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={`${item.concept}-${idx}`} className="border-b border-slate-100">
                <td className="py-2 pr-2">{item.concept}</td>
                <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatEuroEsTwoDecimals(item.unit_price_cents / 100)}</td>
                <td className="py-2 text-right font-medium tabular-nums">{formatEuroEsTwoDecimals(item.line_total_cents / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-[72mm] space-y-1 border-t border-slate-300 pt-2">
            <p className="flex items-center justify-between text-[13px] font-semibold">
              <span>Total</span>
              <span>{formatEuroEsTwoDecimals(current.total_cents / 100)}</span>
            </p>
          </div>
        </div>

        {current.notes?.trim() ? (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Notas</p>
            <p className="mt-1 text-slate-700">{current.notes}</p>
          </div>
        ) : null}
      </section>

      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }
      `}</style>
    </main>
  );
}
