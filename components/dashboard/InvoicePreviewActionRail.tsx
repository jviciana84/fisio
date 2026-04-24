"use client";

import { useCallback, useState } from "react";
import { Download, Loader2, Printer, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildInvoiceMailtoHref } from "@/lib/invoices/invoice-mailto";
import { invoicePdfSuggestedFilename } from "@/lib/invoices/invoice-pdf-filename";

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  clientDisplayName: string | null;
  clientEmail: string | null;
  totalCents: number;
  returnPath: string;
};

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function roundIconButtonClass(disabled: boolean, accent?: "download"): string {
  return cn(
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-0",
    accent === "download"
      ? "border-emerald-500/45 bg-emerald-50/95 text-emerald-900 ring-1 ring-emerald-200/50 hover:bg-emerald-100/95 hover:border-emerald-500/60"
      : "border-slate-200/90 bg-white/95 text-slate-700 ring-1 ring-white/60 hover:border-slate-300 hover:bg-white hover:text-slate-900",
    disabled && "pointer-events-none opacity-40",
  );
}

/**
 * Acciones junto a la vista previa: descarga PDF (API), impresión del navegador, mailto al cliente.
 */
export function InvoicePreviewActionRail({
  invoiceId,
  invoiceNumber,
  clientDisplayName,
  clientEmail,
  totalCents,
  returnPath,
}: Props) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedName = invoicePdfSuggestedFilename(clientDisplayName, invoiceNumber);
  const hasClientEmail = Boolean(clientEmail?.trim());

  const onDownload = useCallback(async () => {
    setError(null);
    setLoadingPdf(true);
    try {
      const res = await fetch(`/api/facturas/${encodeURIComponent(invoiceId)}/pdf`, {
        credentials: "include",
      });
      const ct = res.headers.get("content-type") ?? "";
      if (res.status === 503) {
        let msg =
          "No hay generador PDF en el servidor. Usa Imprimir o abre la vista limpia desde Facturas.";
        try {
          const j = (await res.json()) as { message?: string };
          if (j.message) {
            msg = j.message;
          }
        } catch {
          /* ignore */
        }
        setError(msg);
        return;
      }
      if (!res.ok || !ct.includes("pdf")) {
        setError("No se pudo descargar el PDF.");
        return;
      }
      const blob = await res.blob();
      triggerBlobDownload(blob, suggestedName);
    } catch {
      setError("Error de red al descargar.");
    } finally {
      setLoadingPdf(false);
    }
  }, [invoiceId, suggestedName]);

  const onPrint = useCallback(() => {
    setError(null);
    const el = document.getElementById("invoice-pdf-root");
    el?.scrollIntoView({ block: "start", behavior: "auto" });
    requestAnimationFrame(() => {
      window.print();
    });
  }, []);

  const onSend = useCallback(() => {
    setError(null);
    const email = clientEmail?.trim();
    if (!email) {
      return;
    }
    window.location.href = buildInvoiceMailtoHref({
      clientEmail: email,
      invoiceId,
      invoiceNumber,
      totalCents,
      returnPath,
      origin: window.location.origin,
    });
  }, [clientEmail, invoiceId, invoiceNumber, returnPath, totalCents]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-row items-center justify-center gap-2 md:flex-col md:gap-2">
        <button
          type="button"
          onClick={() => void onDownload()}
          disabled={loadingPdf}
          className={roundIconButtonClass(loadingPdf, "download")}
          title="Descargar PDF"
          aria-label="Descargar PDF"
        >
          {loadingPdf ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-5 w-5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onPrint}
          disabled={loadingPdf}
          className={roundIconButtonClass(loadingPdf)}
          title="Imprimir"
          aria-label="Imprimir"
        >
          <Printer className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={loadingPdf || !hasClientEmail}
          className={roundIconButtonClass(loadingPdf || !hasClientEmail)}
          title={hasClientEmail ? "Enviar por correo" : "El cliente no tiene email"}
          aria-label="Enviar por correo"
        >
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {error ? <p className="max-w-[14rem] text-center text-[11px] leading-snug text-rose-600">{error}</p> : null}
    </div>
  );
}
