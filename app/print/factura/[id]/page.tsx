import { notFound, redirect } from "next/navigation";
import { InvoicePdfContent } from "@/components/dashboard/InvoicePdfContent";
import { getStaffSession } from "@/lib/auth/get-session";
import { invoicePdfSuggestedDocumentTitle } from "@/lib/invoices/invoice-pdf-filename";
import {
  clientFromJoin,
  getInvoiceForPrint,
  paymentLabel,
} from "@/lib/invoices/invoice-for-print.server";
import { InvoicePrintPageControls } from "./print-controls";

export const dynamic = "force-dynamic";

export default async function StandaloneInvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const from = typeof sp.from === "string" ? sp.from : null;
  const autoPrintRaw = sp.autoPrint;
  const autoPrint =
    autoPrintRaw === "1" ||
    autoPrintRaw === "true" ||
    (Array.isArray(autoPrintRaw) && autoPrintRaw.some((v) => v === "1" || v === "true"));
  const embedRaw = sp.embed;
  const embed =
    embedRaw === "1" ||
    embedRaw === "true" ||
    (Array.isArray(embedRaw) && embedRaw.some((v) => v === "1" || v === "true"));

  const session = await getStaffSession();
  if (!session) {
    const next = encodeURIComponent(`/print/factura/${id}`);
    redirect(`/login?next=${next}`);
  }

  const data = await getInvoiceForPrint(id);
  if (!data) {
    notFound();
  }

  const { invoice, lines } = data;
  const backHref =
    from && from.startsWith("/")
      ? from
      : `/dashboard/facturas/${id}/imprimir`;

  const client = clientFromJoin(invoice.clients);
  const suggestedDocumentTitle = invoicePdfSuggestedDocumentTitle(
    client?.full_name,
    invoice.invoice_number,
  );

  // CSS vía inyección: si se pone @page { … } como hijo literal de <style> en JSX,
  // la `{` se lee como expresión y rompe el parseo (Turbopack/Next 16).
  const printStyles =
    "@page { size: A4 portrait; margin: 0; }" +
    " @media print { html, body { background: #fff !important; " +
    "-webkit-print-color-adjust: exact; print-color-adjust: exact; } }";

  if (embed) {
    return (
      <div className="min-h-0 bg-white p-0">
        <div className="flex justify-center print:m-0 print:block print:px-0">
          <InvoicePdfContent
            invoiceNumber={invoice.invoice_number}
            issueDate={invoice.issue_date}
            paymentLabel={paymentLabel(invoice.payment_method)}
            client={client}
            subtotalCents={invoice.subtotal_cents}
            totalCents={invoice.total_cents}
            notes={invoice.notes}
            lines={lines}
          />
        </div>
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[220mm]">
        <InvoicePrintPageControls
          backHref={backHref}
          suggestedDocumentTitle={suggestedDocumentTitle}
          autoPrint={autoPrint}
        />
        <div className="flex justify-center print:m-0 print:block print:px-0">
          <InvoicePdfContent
            invoiceNumber={invoice.invoice_number}
            issueDate={invoice.issue_date}
            paymentLabel={paymentLabel(invoice.payment_method)}
            client={client}
            subtotalCents={invoice.subtotal_cents}
            totalCents={invoice.total_cents}
            notes={invoice.notes}
            lines={lines}
          />
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
    </div>
  );
}
