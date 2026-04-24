"use client";

import { useCallback, useState } from "react";
import { downloadInvoiceElementPdf, safeInvoicePdfFilename } from "@/lib/invoice-pdf";

type Props = {
  invoiceNumber: string;
  /** Elemento con el HTML de la factura (DIN A4). */
  contentId?: string;
};

export function InvoicePrintButton({ invoiceNumber, contentId = "invoice-pdf-root" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDownload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const name = safeInvoicePdfFilename(invoiceNumber);
      await downloadInvoiceElementPdf(contentId, name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [contentId, invoiceNumber]);

  return (
    <div className="flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={() => void onDownload()}
        disabled={loading}
        className="rounded-md border border-blue-300 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Generando PDF…" : "Descargar PDF"}
      </button>
      {error ? <p className="max-w-xs text-right text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
