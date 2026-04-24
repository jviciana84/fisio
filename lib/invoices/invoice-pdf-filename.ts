/**
 * Nombres de archivo PDF de factura (solo lógica de cadena; usable en servidor y cliente).
 */

const MAX_FILENAME = 200;
const MAX_TITLE = 180;

/** Fragmento seguro para rutas Windows/macOS (sin extensión). */
export function sanitizeInvoiceFilenameSegment(raw: string): string {
  const t = raw
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return t.slice(0, 80);
}

export function safeInvoicePdfFilename(invoiceNumber: string): string {
  return `Factura-${invoiceNumber.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
}

/** `Factura-{número}-{cliente}.pdf` — cliente opcional si no hay nombre. */
export function invoicePdfSuggestedFilename(
  clientFullName: string | null | undefined,
  invoiceNumber: string,
): string {
  const num = invoiceNumber.replace(/[\\/:*?"<>|]+/g, "-").trim();
  const name = clientFullName?.trim() ? sanitizeInvoiceFilenameSegment(clientFullName) : "";
  const base = name ? `Factura-${num}-${name}` : `Factura-${num}`;
  const withExt = `${base}.pdf`;
  return withExt.length <= MAX_FILENAME ? withExt : withExt.slice(0, MAX_FILENAME);
}

/**
 * Sin `.pdf`: para `document.title`; muchos navegadores sugieren «título.pdf» al guardar como PDF.
 */
export function invoicePdfSuggestedDocumentTitle(
  clientFullName: string | null | undefined,
  invoiceNumber: string,
): string {
  const num = invoiceNumber.replace(/[\\/:*?"<>|]+/g, "-").trim();
  const name = clientFullName?.trim() ? sanitizeInvoiceFilenameSegment(clientFullName) : "";
  const base = name ? `Factura-${num}-${name}` : `Factura-${num}`;
  return base.length <= MAX_TITLE ? base : base.slice(0, MAX_TITLE);
}
