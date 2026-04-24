import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireStaffOrAdminApi } from "@/lib/auth/require-admin";
import {
  clientFromJoin,
  getInvoiceForPrint,
} from "@/lib/invoices/invoice-for-print.server";
import { invoicePdfSuggestedFilename } from "@/lib/invoices/invoice-pdf-filename";
import { renderPrintPageUrlToPdf } from "@/lib/invoices/invoice-pdf-chromium";

export const runtime = "nodejs";
export const maxDuration = 60;

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || (url.protocol === "https:" ? "https" : "http");
  return `${proto}://${host}`;
}

function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[\x00-\x1F\x7F"\\]+/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffOrAdminApi();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await context.params;
  if (!id || !isUuid(id)) {
    return NextResponse.json({ ok: false, message: "Identificador no válido" }, { status: 400 });
  }

  const data = await getInvoiceForPrint(id);
  if (!data) {
    return NextResponse.json({ ok: false, message: "Factura no encontrada" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const sessionVal = cookieStore.get("staff_session")?.value;
  if (!sessionVal) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  const client = clientFromJoin(data.invoice.clients);
  const filename = invoicePdfSuggestedFilename(client?.full_name, data.invoice.invoice_number);
  const origin = getRequestOrigin(_request);
  const printPageUrl = `${origin}/print/factura/${encodeURIComponent(id)}?embed=1`;

  const result = await renderPrintPageUrlToPdf({
    printPageUrl,
    origin,
    sessionCookie: { name: "staff_session", value: sessionVal },
  });

  if (typeof result === "object" && result !== null && "error" in result) {
    return NextResponse.json(
      {
        ok: false,
        code: "NO_CHROME",
        message:
          "No hay Chromium/Chrome en el servidor. En local instala Google Chrome, o en producción despliega con entorno Vercel y @sparticuz/chromium, o define PUPPETEER_EXECUTABLE_PATH. Desde la ficha usa «Vista previa / imprimir» para generar el PDF con el navegador.",
      },
      { status: 503 },
    );
  }

  if (!Buffer.isBuffer(result)) {
    return NextResponse.json(
      { ok: false, message: "Error interno al generar el PDF" },
      { status: 500 },
    );
  }

  return new NextResponse(new Uint8Array(result), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDispositionAttachment(filename),
      "Cache-Control": "private, no-store",
    },
  });
}
