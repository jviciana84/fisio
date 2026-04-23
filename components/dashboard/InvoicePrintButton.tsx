"use client";

export function InvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-blue-300 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
    >
      Imprimir A4
    </button>
  );
}
