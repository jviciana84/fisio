import { splitSalesTtc } from "@/lib/fiscal/fiscalHelper";

/** Ajustes fiscales mínimos para desglosar un ticket (alineado con `fiscal_settings`). */
export type IncomeBreakdownFiscalPrefs = {
  useVatOnSales: boolean;
  salesIncludeVat: boolean;
  salesVatRatePercent: number;
};

/** Solo carga fija / estructura asignada al ticket (sobre base imponible). */
export const DEFAULT_STRUCTURE_RESERVE_PERCENT_OF_BASE = 6;

/**
 * Prorrata orientativa sobre la base para reservar cuota de autónomo (REASEG).
 * En la práctica la cuota es mensual y depende de la base elegida; esto es una guía por cobro.
 */
export const DEFAULT_CUOTA_AUTONOMO_RESERVE_PERCENT_OF_BASE = 20;

/**
 * IRPF: reserva orientativa sobre el neto de actividad **después** de estructura y cuota SS.
 * En muchos tramos efectivos se acerca a ~19–30 %; usamos 25 % como referencia “mínima razonable”
 * (ej.: si te quedan 100 € de neto imputable, conviene apartar ~25 € para IRPF).
 */
export const DEFAULT_IRPF_RESERVE_PERCENT_OF_NET_BEFORE_IRPF = 25;

export type TicketReserveBreakdown = {
  totalCents: number;
  vatCents: number;
  baseCents: number;
  structureReserveCents: number;
  cuotaAutonomoReserveCents: number;
  /** Base − estructura − cuota (antes de reservar IRPF). */
  netBeforeIrpfCents: number;
  irpfReserveCents: number;
  /** Líquido aproximado tras las reservas anteriores (orientativo). */
  professionalNetCents: number;
  /** IVA + estructura + cuota SS + IRPF (orientación de cuánto apartar del cobro). */
  totalSuggestedReserveCents: number;
};

export function computeTicketReserveBreakdown(
  totalCents: number,
  fiscal: IncomeBreakdownFiscalPrefs,
  opts?: {
    structureReservePercentOfBase?: number;
    cuotaAutonomoReservePercentOfBase?: number;
    irpfReservePercentOfNetBeforeIrpf?: number;
  },
): TicketReserveBreakdown {
  const t = Math.max(0, Math.round(totalCents));
  const includeVatSplit = fiscal.useVatOnSales && fiscal.salesIncludeVat;
  const { baseCents, vatCents } = splitSalesTtc(
    t,
    includeVatSplit,
    fiscal.salesVatRatePercent,
  );

  const sp = opts?.structureReservePercentOfBase ?? DEFAULT_STRUCTURE_RESERVE_PERCENT_OF_BASE;
  const cq = opts?.cuotaAutonomoReservePercentOfBase ?? DEFAULT_CUOTA_AUTONOMO_RESERVE_PERCENT_OF_BASE;
  const irpfPct =
    opts?.irpfReservePercentOfNetBeforeIrpf ?? DEFAULT_IRPF_RESERVE_PERCENT_OF_NET_BEFORE_IRPF;

  const structureReserveCents = Math.round((baseCents * Math.min(100, Math.max(0, sp))) / 100);
  const cuotaAutonomoReserveCents = Math.round((baseCents * Math.min(100, Math.max(0, cq))) / 100);

  const netBeforeIrpfCents = Math.max(
    0,
    baseCents - structureReserveCents - cuotaAutonomoReserveCents,
  );
  const irpfReserveCents = Math.round(
    (netBeforeIrpfCents * Math.min(100, Math.max(0, irpfPct))) / 100,
  );
  const professionalNetCents = Math.max(0, netBeforeIrpfCents - irpfReserveCents);

  const totalSuggestedReserveCents =
    vatCents + structureReserveCents + cuotaAutonomoReserveCents + irpfReserveCents;

  return {
    totalCents: t,
    vatCents,
    baseCents,
    structureReserveCents,
    cuotaAutonomoReserveCents,
    netBeforeIrpfCents,
    irpfReserveCents,
    professionalNetCents,
    totalSuggestedReserveCents,
  };
}
