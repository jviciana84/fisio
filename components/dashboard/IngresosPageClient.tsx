"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type ChartRange,
  RANGE_LABELS,
  RANGE_ORDER,
  RANGE_SHORT,
  formatIncomeRangeLabel,
  ticketInRange,
} from "@/lib/dashboard/trendChartData";

export type IncomeTicketRow = {
  id: string;
  ticket_number: string;
  total_cents: number;
  payment_method: "cash" | "bizum" | "card";
  created_at: string;
  client_name: string | null;
};

function fmtEuro(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function paymentLabel(m: IncomeTicketRow["payment_method"]): string {
  if (m === "cash") return "Efectivo";
  if (m === "bizum") return "Bizum";
  return "Tarjeta";
}

export function IngresosPageClient({ tickets }: { tickets: IncomeTicketRow[] }) {
  const [range, setRange] = useState<ChartRange>("week");

  const rangeLabel = useMemo(() => formatIncomeRangeLabel(range), [range]);

  const filtered = useMemo(
    () => tickets.filter((t) => ticketInRange(t.created_at, range)),
    [tickets, range],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [filtered]);

  const totals = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let bizum = 0;
    let tarjeta = 0;
    for (const t of filtered) {
      const eur = t.total_cents / 100;
      total += eur;
      if (t.payment_method === "cash") efectivo += eur;
      else if (t.payment_method === "bizum") bizum += eur;
      else tarjeta += eur;
    }
    return {
      total,
      efectivo,
      bizum,
      tarjeta,
      count: filtered.length,
    };
  }, [filtered]);

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-[1200px]">
        <section className="glass-panel glass-tint-violet relative rounded-2xl p-6 md:p-7">
          <Link
            href="/dashboard"
            title="Volver al panel principal"
            className="absolute right-4 top-4 z-10 inline-flex shrink-0 items-center rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700 md:right-5 md:top-5"
          >
            Panel
          </Link>

          <div className="min-w-0 pr-[5.75rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Caja</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">Ingresos detallados</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Tickets filtrados por la misma ventana temporal que el gráfico de tendencia del panel. Cambia el periodo
              para revisar cobros por canal y cliente.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200/80 glass-inner p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Resumen</p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <p className="text-[10px] font-medium uppercase text-slate-500">Total</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{fmtEuro(totals.total)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase text-slate-500">Efectivo</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-800">{fmtEuro(totals.efectivo)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase text-slate-500">Bizum</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-violet-800">{fmtEuro(totals.bizum)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase text-slate-500">Tarjeta</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-900">{fmtEuro(totals.tarjeta)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-medium uppercase text-slate-500">Tickets</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{totals.count}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Periodo</p>
            <div
              className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="Seleccionar franja temporal"
            >
              {RANGE_ORDER.map((k) => {
                const selected = range === k;
                return (
                  <button
                    key={k}
                    type="button"
                    title={RANGE_LABELS[k]}
                    aria-pressed={selected}
                    aria-label={RANGE_LABELS[k]}
                    onClick={() => setRange(k)}
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight transition sm:px-2 sm:py-1 sm:text-[11px] ${
                      selected
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-1 ring-blue-400/40"
                        : "border border-slate-200/80 bg-white/50 text-slate-600 hover:border-blue-300/70 hover:bg-white/90 hover:text-slate-800"
                    }`}
                  >
                    {RANGE_SHORT[k]}
                  </button>
                );
              })}
              <p className="min-w-0 text-[11px] font-medium leading-snug text-slate-600" title={rangeLabel}>
                {rangeLabel}
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200/70 bg-white/40">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-4 py-3">Fecha</th>
                  <th className="whitespace-nowrap px-4 py-3">Ticket</th>
                  <th className="min-w-[8rem] px-4 py-3">Cliente</th>
                  <th className="whitespace-nowrap px-4 py-3">Método</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                      No hay tickets en este periodo.
                    </td>
                  </tr>
                ) : (
                  sorted.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100/90 last:border-0 hover:bg-white/50"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-700">
                        {new Date(row.created_at).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">{row.ticket_number}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.client_name?.trim() || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">{paymentLabel(row.payment_method)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                        {fmtEuro(row.total_cents / 100)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
