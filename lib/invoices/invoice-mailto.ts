import { formatEuroFromCents } from "@/lib/format-es";

/** URL `mailto:` para enviar al cliente enlace a la factura (sesión del centro). */
export function buildInvoiceMailtoHref(input: {
  clientEmail: string;
  invoiceId: string;
  invoiceNumber: string;
  totalCents: number;
  returnPath: string;
  origin: string;
}): string {
  const { clientEmail, invoiceId, invoiceNumber, totalCents, returnPath, origin } = input;
  const printUrl = new URL(`/print/factura/${encodeURIComponent(invoiceId)}`, origin);
  printUrl.searchParams.set("from", returnPath);
  const subject = encodeURIComponent(`Factura ${invoiceNumber}`);
  const body = encodeURIComponent(
    [
      "Hola,",
      "",
      `Te enviamos la factura ${invoiceNumber} por un importe de ${formatEuroFromCents(totalCents)}.`,
      "",
      "Puedes consultar la factura en este enlace (inicio de sesión del centro):",
      printUrl.toString(),
      "",
      "Un saludo,",
      "Fisioterapia Roc Blanc",
    ].join("\n"),
  );
  return `mailto:${clientEmail}?subject=${subject}&body=${body}`;
}
