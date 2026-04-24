import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { InvoicePdfContent } from "@/components/dashboard/InvoicePdfContent";
import { InvoicePreviewActionRail } from "@/components/dashboard/InvoicePreviewActionRail";
import { cn } from "@/lib/cn";
import { formatEuroFromCents } from "@/lib/format-es";
import {
  clientFromJoin,
  getInvoiceForPrint,
  paymentLabel,
} from "@/lib/invoices/invoice-for-print.server";

export const dynamic = "force-dynamic";

const PRINT_PAGE_STYLES = "@page { size: A4 portrait; margin: 0; }";

/** Mismo perfil que los iconos del rail (botón redondo neutro). */
const roundBackClass = cn(
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-sm ring-1 ring-white/60 transition",
  "hover:border-slate-300 hover:bg-white hover:text-slate-900",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-0",
);

/** Columnas de acciones: sticky junto a la factura al hacer scroll (sin “card” extra). */
const stickyActionsCol = cn(
  "md:sticky md:top-24 md:z-30 md:self-start",
  "print:static print:z-auto",
);

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getInvoiceForPrint(id);
  if (!data) {
    notFound();
  }

  const { invoice, lines } = data;
  const returnPath = `/dashboard/facturas/${id}/imprimir`;
  const client = clientFromJoin(invoice.clients);
  const clientLabel = client?.full_name?.trim() || "Sin cliente asignado";
  const payLabel = paymentLabel(invoice.payment_method);

  return (
    <main className="p-6 md:p-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-7xl print:max-w-none">
        <section
          className={cn(
            "glass-panel glass-tint-cyan invoice-print-panel relative p-6 md:p-7",
            "print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none",
          )}
        >
          <div className="border-b border-white/25 pb-5 print:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
              Facturación
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Factura {invoice.invoice_number}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Vista previa, impresión y descarga. {clientLabel} — {payLabel} —{" "}
              <span className="font-medium text-slate-800 tabular-nums">
                {formatEuroFromCents(invoice.total_cents)}
              </span>
            </p>
          </div>

          <div
            className={cn(
              "mt-6 min-w-0 print:mt-0",
              "glass-inner rounded-2xl p-2 shadow-sm ring-1 ring-white/50 md:p-3",
              "print:mt-0 print:rounded-none print:bg-white print:p-0 print:shadow-none print:ring-0",
            )}
          >
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-start md:justify-center md:gap-4 print:block">
              <div
                className={cn(
                  "order-2 flex shrink-0 justify-center md:order-1 md:justify-end print:hidden",
                  stickyActionsCol,
                )}
              >
                <Link
                  href="/dashboard/facturas"
                  className={roundBackClass}
                  title="Volver a facturas"
                  aria-label="Volver a facturas"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden />
                </Link>
              </div>
              <div className="order-1 min-w-0 flex-1 overflow-x-auto overflow-y-visible md:order-2 md:max-w-[210mm] md:flex-none md:shrink-0 print:order-none print:block print:overflow-visible">
                <div className="flex justify-center print:block">
                  <InvoicePdfContent
                    invoiceNumber={invoice.invoice_number}
                    issueDate={invoice.issue_date}
                    paymentLabel={payLabel}
                    client={client}
                    subtotalCents={invoice.subtotal_cents}
                    totalCents={invoice.total_cents}
                    notes={invoice.notes}
                    lines={lines}
                  />
                </div>
              </div>
              <div
                className={cn(
                  "order-3 flex shrink-0 justify-center md:order-3 md:justify-start print:hidden",
                  stickyActionsCol,
                )}
              >
                <InvoicePreviewActionRail
                  invoiceId={id}
                  invoiceNumber={invoice.invoice_number}
                  clientDisplayName={client?.full_name ?? null}
                  clientEmail={client?.email ?? null}
                  totalCents={invoice.total_cents}
                  returnPath={returnPath}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_PAGE_STYLES }} />
    </main>
  );
}
