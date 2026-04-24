"use client";

import { Leaf, Star } from "lucide-react";
import { formatEuroFromCents } from "@/lib/format-es";
import { PUBLIC_LEGAL_IDENTITY } from "@/lib/legal-public";

/** Titular / datos en factura (NIF ficticio a sustituir si lo validáis con gestoría). */
const INVOICE_TITULAR_NAME = "Anna-Esther Catalan Calvo";
const INVOICE_TITULAR_NIF = "47283916X";

const LOGO_SRC = "/images/logo-frb3-texto-oscuro.svg";
/** Mismo activo que `Ficheros fisio/logo FRB3 TEXTO OSCURO.svg` (copia en repo: `public/images/watermark-logo-frb3-texto-oscuro.svg`). */
const WATERMARK_SRC = "/images/watermark-logo-frb3-texto-oscuro.svg";

/** Degradados factura: mint → cyan → azul (tonos marca intranet) */
const BAND_GRADIENT =
  "linear-gradient(128deg, #c8f5e8 0%, #8ee4d9 28%, #5ec4e0 58%, #3b9fd9 88%, #2d8bc9 100%)";
const FOOTER_GRADIENT =
  "linear-gradient(308deg, #2d8bc9 0%, #4eb8dc 35%, #7dd9cf 65%, #c8f5e8 100%)";

/** Diagonales un poco más bajas para caber en la hoja fija A4 */
const HEADER_CLIP = "polygon(0 0, 100% 0, 100% 78%, 0 44%)";
const FOOTER_CLIP = "polygon(0 26%, 100% 16%, 100% 100%, 0 100%)";

const SHEET_PAD = "9mm";
const SHEET_PAD_TOP = "7mm";

/** Sombra apilada tipo hoja sobre mesa (solo pantalla; impresión/PDF sin sombra extra) */
const PAPER_SHADOW =
  "0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.06), 0 14px 36px -6px rgba(15, 23, 42, 0.1), 0 28px 56px -12px rgba(15, 42, 71, 0.12)";

export type InvoicePdfLine = {
  concept: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

/** Datos de cliente en factura (no incluye `notes` del cliente). */
export type InvoicePdfClient = {
  full_name: string | null;
  tax_id: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  client_code: string | null;
};

function issueDateLongEs(issueDate: string): string {
  const d = new Date(`${issueDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return issueDate.slice(0, 10);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

/** Misma anchura de columnas que la tabla de líneas. */
const INVOICE_LINE_GRID_CLASS =
  "grid w-full grid-cols-[minmax(0,11fr)_minmax(0,49fr)_minmax(0,20fr)_minmax(0,20fr)] gap-x-2";

function ClientInvoiceBlock({ client }: { client: InvoicePdfClient | null }) {
  if (!client) {
    return <p className="text-[9px] text-slate-600">Sin asignar</p>;
  }
  const name = client.full_name?.trim();
  const tax = client.tax_id?.trim();
  const addr = client.address?.trim();
  const phone = client.phone?.trim();
  const email = client.email?.trim();
  const code = client.client_code?.trim();
  const hasAny = name || tax || addr || phone || email || code;
  if (!hasAny) {
    return <p className="text-[9px] text-slate-600">Sin datos</p>;
  }
  return (
    <div className="flex flex-col gap-0 text-[9px] leading-tight text-slate-700 [&>p+p]:mt-0.5">
      {name ? (
        <p className="font-serif text-[12px] font-bold leading-tight tracking-tight text-slate-950">{name}</p>
      ) : null}
      {tax ? <p className="tabular-nums leading-tight text-slate-800">{tax}</p> : null}
      {addr ? <p className="whitespace-pre-line leading-tight text-slate-800">{addr}</p> : null}
      {phone ? <p className="leading-tight text-slate-800">{phone}</p> : null}
      {email ? <p className="break-all leading-tight text-slate-800">{email}</p> : null}
      {code ? <p className="tabular-nums leading-tight text-slate-600">{code}</p> : null}
    </div>
  );
}

type Props = {
  invoiceNumber: string;
  issueDate: string;
  paymentLabel: string;
  client: InvoicePdfClient | null;
  subtotalCents: number;
  totalCents: number;
  notes: string | null;
  lines: InvoicePdfLine[];
};

/**
 * Factura en vista previa: **exactamente una hoja DIN A4** (210×297 mm), sombra tipo papel,
 * cabecera/pie con degradados recortados al alto del bloque. La tabla usa scroll interno si hay muchas líneas.
 * Al descargar PDF se aplica `invoice-pdf-capture-expand` (ver `globals.css` + `invoice-pdf.ts`) para capturar todo.
 */
export function InvoicePdfContent({
  invoiceNumber,
  issueDate,
  paymentLabel,
  client,
  subtotalCents,
  totalCents,
  notes,
  lines,
}: Props) {
  const ivaCents = Math.max(0, totalCents - subtotalCents);
  const ivaPercent =
    subtotalCents > 0 ? Math.round((ivaCents / subtotalCents) * 100) : 21;

  const issueLabelLong = issueDateLongEs(issueDate);

  return (
    <section
      id="invoice-pdf-root"
      className="relative flex h-[297mm] max-h-[297mm] w-[210mm] min-w-[210mm] max-w-[210mm] flex-col overflow-hidden rounded-sm border border-slate-300/85 bg-white text-[10.5px] leading-snug text-slate-900 print:h-auto print:max-h-none print:min-h-0 print:w-full print:min-w-0 print:max-w-none print:flex-none print:overflow-visible print:rounded-none print:border-0"
      style={{ boxShadow: PAPER_SHADOW }}
    >
      <style>{`
        @media print {
          #invoice-pdf-root { box-shadow: none !important; }
        }
      `}</style>

      {/* Marca de agua: logo FRB3 texto oscuro (SVG completo, centrado en la hoja) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden print:block"
        aria-hidden
      >
        <img
          src={WATERMARK_SRC}
          alt=""
          className="absolute left-1/2 top-1/2 h-auto w-auto max-h-[min(100%,297mm)] max-w-[min(100%,210mm)] origin-center -translate-x-1/2 -translate-y-1/2 scale-110 object-contain object-center opacity-[0.042]"
        />
      </div>

      <div
        className="relative z-[1] flex h-full min-h-0 flex-col pb-0"
        style={{
          paddingLeft: SHEET_PAD,
          paddingRight: SHEET_PAD,
          paddingTop: SHEET_PAD_TOP,
        }}
      >
        <header
          className="relative z-[1] mb-2 shrink-0 overflow-visible pb-7 pt-3 text-slate-900"
          style={{
            marginLeft: `-${SHEET_PAD}`,
            marginRight: `-${SHEET_PAD}`,
            marginTop: `-${SHEET_PAD_TOP}`,
            paddingLeft: SHEET_PAD,
            paddingRight: SHEET_PAD,
          }}
        >
          {/* Solo el fondo lleva clip-path; el logo y el texto quedan encima y no se recortan */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background: BAND_GRADIENT,
              clipPath: HEADER_CLIP,
            }}
          />
          {/* Logo ~81% alto del bloque derecho, ancho tope ~14.5rem. */}
          <div className="relative z-[1] flex gap-3">
            <div className="flex min-h-0 min-w-0 flex-1 items-start justify-start self-stretch overflow-hidden">
              <img
                src={LOGO_SRC}
                alt="Fisioterapia Roc Blanc"
                width={280}
                height={120}
                className="max-h-[min(100%,81%)] w-auto max-w-[min(100%,14.5rem)] object-contain object-left object-top drop-shadow-sm"
                decoding="async"
              />
            </div>
            <div className="flex shrink-0 flex-col items-end text-right">
              <h1 className="text-5xl font-black leading-none tracking-tight text-slate-950">FACTURA</h1>
              <div className="mt-2 max-w-[14.5rem] space-y-0.5 text-[8.5px] leading-tight text-slate-800">
                <p className="font-bold uppercase tracking-wide text-slate-950">{PUBLIC_LEGAL_IDENTITY.brand}</p>
                <p className="font-semibold text-slate-800">{INVOICE_TITULAR_NAME}</p>
                <p className="font-bold tabular-nums text-slate-900">NIF: {INVOICE_TITULAR_NIF}</p>
                {PUBLIC_LEGAL_IDENTITY.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <p className="tabular-nums">Tel. {PUBLIC_LEGAL_IDENTITY.phoneDisplay}</p>
                <p className="break-all">
                  <a
                    href={`mailto:${PUBLIC_LEGAL_IDENTITY.email}`}
                    className="text-slate-800 no-underline visited:text-slate-800 hover:text-slate-800 active:text-slate-800"
                  >
                    {PUBLIC_LEGAL_IDENTITY.email}
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-[1] mt-2">
            <div className="mb-8">
              <p className="text-[8px] font-bold uppercase tracking-wide text-slate-800/90">Cliente</p>
              <div className="mt-1">
                <ClientInvoiceBlock client={client} />
              </div>
            </div>
            <div className="mb-3 grid w-full grid-cols-[1fr_auto_1fr] items-start gap-x-3 gap-y-1 text-[10px]">
              <div className="min-w-0 text-left">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-800/90">Fecha</p>
                <p className="mt-0.5 whitespace-nowrap text-left text-[10px] font-semibold leading-none text-slate-950">
                  {issueLabelLong}
                </p>
              </div>
              <div className="min-w-0 shrink-0 px-1 text-center">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-800/90">N.º de factura</p>
                <p className="mt-0.5 text-base font-black tabular-nums leading-tight text-slate-950">
                  {invoiceNumber}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-800/90">Forma de pago</p>
                <p className="mt-0.5 font-medium leading-snug text-slate-900">{paymentLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="invoice-mid-column flex min-h-0 flex-1 flex-col overflow-hidden pt-6">
          <div className="invoice-inner-scroll min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            <table className="w-full table-fixed border-collapse text-left text-[10px]">
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "49%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead className="sticky top-0 z-[2] bg-transparent print:static">
                <tr className="border-b border-sky-600/55">
                  <th className="pb-1 pr-1.5 text-[8.5px] font-bold uppercase tracking-wide text-sky-800">
                    Cantidad
                  </th>
                  <th className="pb-1 pr-1.5 text-[8.5px] font-bold uppercase tracking-wide text-sky-800">
                    Descripción
                  </th>
                  <th className="pb-1 pr-1.5 text-right text-[8.5px] font-bold uppercase tracking-wide text-sky-800">
                    P. unit.
                  </th>
                  <th className="pb-1 text-right text-[8.5px] font-bold uppercase tracking-wide text-sky-800">
                    Total línea
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((item, idx) => (
                  <tr key={`${item.concept}-${idx}`} className="border-b border-slate-200">
                    <td className="py-0.5 pr-1.5 tabular-nums text-slate-800">{item.quantity}</td>
                    <td className="py-0.5 pr-1.5 text-slate-800">{item.concept}</td>
                    <td className="py-0.5 pr-1.5 text-right tabular-nums text-slate-800">
                      {formatEuroFromCents(item.unit_price_cents)}
                    </td>
                    <td className="py-0.5 text-right text-[10px] font-medium tabular-nums text-slate-900">
                      {formatEuroFromCents(item.line_total_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={`${INVOICE_LINE_GRID_CLASS} mt-9 shrink-0 pt-0`}>
              <div className="col-span-2" />
              <div className="col-span-2 text-right">
                <div className="ml-auto inline-block min-w-[10.5rem] space-y-0 text-right text-[10px] leading-none">
                  <div className="flex justify-between gap-4 py-0 tabular-nums">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-900">
                      {formatEuroFromCents(subtotalCents)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 py-0 tabular-nums">
                    <span className="text-slate-600">IVA ({ivaPercent}%)</span>
                    <span className="font-medium text-slate-900">
                      {formatEuroFromCents(ivaCents)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-sky-600/55 pt-0.5 text-[11px] font-bold tabular-nums text-slate-950">
                    <span>Total</span>
                    <span>{formatEuroFromCents(totalCents)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {notes?.trim() ? (
            <div className="mt-1.5 shrink-0 rounded-md border border-slate-200 bg-amber-50/60 px-2 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wide text-amber-900/80">Notas</p>
              <p className="mt-0.5 line-clamp-3 text-[9.5px] leading-snug text-slate-800">{notes}</p>
            </div>
          ) : null}

          <div className="relative z-[1] mt-1.5 shrink-0 border-t border-slate-200/90 bg-white/95 py-2">
            <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-2">
              <div className="flex shrink-0 justify-center gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-amber-400 stroke-amber-500"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <p className="max-w-[95%] text-[9.5px] italic leading-snug text-slate-700">
                Tu opinión nos ayuda a mejorar. Si puedes, déjanos una reseña en Google.
              </p>
            </div>
          </div>
        </div>

        <footer
          className="-mx-[9mm] mt-auto shrink-0 px-[9mm] pb-3.5 pt-7 text-slate-50"
          style={{
            marginLeft: `-${SHEET_PAD}`,
            marginRight: `-${SHEET_PAD}`,
            background: FOOTER_GRADIENT,
            clipPath: FOOTER_CLIP,
          }}
        >
          <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-2">
            <Leaf className="h-4 w-4 shrink-0 text-emerald-100" strokeWidth={2.25} aria-hidden />
            <p className="max-w-[95%] text-[9.5px] font-medium leading-snug text-white/95">
              Gracias por colaborar con el medio ambiente. Evita imprimir esta factura si no es necesario.
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
