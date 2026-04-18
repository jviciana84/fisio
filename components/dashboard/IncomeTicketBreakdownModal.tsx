"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { IncomeTicketRow } from "@/components/dashboard/IngresosPageClient";
import {
  DEFAULT_CUOTA_AUTONOMO_RESERVE_PERCENT_OF_BASE,
  DEFAULT_IRPF_RESERVE_PERCENT_OF_NET_BEFORE_IRPF,
  DEFAULT_STRUCTURE_RESERVE_PERCENT_OF_BASE,
  type TicketReserveBreakdown,
} from "@/lib/dashboard/incomeTicketBreakdown";

function fmtEuroFromCents(cents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function paymentLabel(m: IncomeTicketRow["payment_method"]): string {
  if (m === "cash") return "Efectivo";
  if (m === "bizum") return "Bizum";
  return "Tarjeta";
}

type Props = {
  open: boolean;
  onClose: () => void;
  ticket: IncomeTicketRow | null;
  breakdown: TicketReserveBreakdown | null;
};

export function IncomeTicketBreakdownModal({ open, onClose, ticket, breakdown }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !ticket || !breakdown) return null;

  const rows: { label: string; amountCents: number; hint?: string }[] = [
    {
      label: "Total cobrado (ticket)",
      amountCents: breakdown.totalCents,
      hint: "Importe que pagó el cliente",
    },
    {
      label: "IVA repercutido (estimado)",
      amountCents: breakdown.vatCents,
      hint: "Según ajustes fiscales (IVA en ventas)",
    },
    {
      label: "Base imponible (estimada)",
      amountCents: breakdown.baseCents,
      hint: "Tras separar IVA del total",
    },
    {
      label: `Gastos de estructura (${DEFAULT_STRUCTURE_RESERVE_PERCENT_OF_BASE}% base)`,
      amountCents: breakdown.structureReserveCents,
      hint: "Solo carga fija / estructura asignada a este cobro (orientativo)",
    },
    {
      label: `Cuota autónomo — reserva (${DEFAULT_CUOTA_AUTONOMO_RESERVE_PERCENT_OF_BASE}% base)`,
      amountCents: breakdown.cuotaAutonomoReserveCents,
      hint:
        "Prorrata orientativa sobre la base; la cuota real REASEG es mensual. Ajusta el % cuando tengas tu cuota cerrada.",
    },
    {
      label: "Neto de actividad (antes de IRPF)",
      amountCents: breakdown.netBeforeIrpfCents,
      hint: "Base menos estructura y reserva de cuotas de autónomo",
    },
    {
      label: `Reserva IRPF (${DEFAULT_IRPF_RESERVE_PERCENT_OF_NET_BEFORE_IRPF}% de ese neto)`,
      amountCents: breakdown.irpfReserveCents,
      hint:
        "En España el IRPF sobre renta de actividad suele ser mucho más alto que un 5 % sobre la base: aquí usamos ~25 % del neto anterior como referencia mínima (ej. 100 € netos → ~25 € a apartar).",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="income-breakdown-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 md:px-5">
          <div className="min-w-0">
            <p id="income-breakdown-title" className="text-base font-semibold text-slate-900">
              Desglose del cobro
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              Ticket <span className="font-medium text-slate-800">{ticket.ticket_number}</span>
              <span className="text-slate-400"> · </span>
              {paymentLabel(ticket.payment_method)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-5">
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.label}
                className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-slate-800">{r.label}</span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                    {fmtEuroFromCents(r.amountCents)}
                  </span>
                </div>
                {r.hint ? <p className="text-[11px] leading-snug text-slate-500">{r.hint}</p> : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-3 rounded-xl border border-blue-200/70 bg-gradient-to-br from-blue-600/8 to-cyan-500/5 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">Total a reservar (orientativo)</span>
              <span className="text-lg font-bold tabular-nums text-blue-800">
                {fmtEuroFromCents(breakdown.totalSuggestedReserveCents)}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              IVA estimado + estructura + cuota autónomo + IRPF. No incluye otros gastos deducibles ni tu tramo
              real; es una guía para apartar liquidez.
            </p>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2 rounded-xl border border-emerald-200/60 bg-emerald-500/8 px-3 py-2.5">
            <span className="text-sm font-semibold text-emerald-950">Neto líquido estimado (tras reservas)</span>
            <span className="text-lg font-bold tabular-nums text-emerald-900">
              {fmtEuroFromCents(breakdown.professionalNetCents)}
            </span>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Cálculo orientativo. Más adelante podrás fijar <strong className="font-medium text-slate-600">€/hora</strong>{" "}
            y <strong className="font-medium text-slate-600">nómina</strong>, y sustituir el % de cuota REASEG por tu
            cuota mensual real.
          </p>
        </div>
      </div>
    </div>
  );
}
