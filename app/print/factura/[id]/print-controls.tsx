"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type Props = {
  /** Vuelta a la ficha o listado. */
  backHref: string;
  /** Título del documento al guardar como PDF (sin `.pdf`). */
  suggestedDocumentTitle: string;
  /** Si es true, abre el diálogo de impresión al cargar (menos clics desde intranet). */
  autoPrint?: boolean;
};

/**
 * Controles visibles en pantalla; al imprimir / guardar como PDF, el cromo se oculta
 * (`print:hidden`) y solo queda el bloque de la factura.
 */
export function InvoicePrintPageControls({
  backHref,
  suggestedDocumentTitle,
  autoPrint = false,
}: Props) {
  const didAutoPrint = useRef(false);

  useEffect(() => {
    const prev = document.title;
    document.title = suggestedDocumentTitle;
    return () => {
      document.title = prev;
    };
  }, [suggestedDocumentTitle]);

  useEffect(() => {
    if (!autoPrint || didAutoPrint.current) {
      return;
    }
    const id = window.setTimeout(() => {
      didAutoPrint.current = true;
      window.print();
    }, 450);
    return () => window.clearTimeout(id);
  }, [autoPrint]);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="text-sm text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
      >
        Volver
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          Imprimir / Guardar como PDF
        </button>
      </div>
    </div>
  );
}
