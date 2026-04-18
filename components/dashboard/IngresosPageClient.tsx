"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IngresosDayCalendar, localDayKeyFromIso } from "@/components/dashboard/IngresosDayCalendar";
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

type PaymentFilter = "all" | IncomeTicketRow["payment_method"];

export function IngresosPageClient({ tickets }: { tickets: IncomeTicketRow[] }) {
  const [range, setRange] = useState<ChartRange>("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  const rangeLabel = useMemo(() => {
    if (selectedDay) {
      const [y, m, d] = selectedDay.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return `Día ${dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
    }
    return formatIncomeRangeLabel(range);
  }, [range, selectedDay]);

  const filtered = useMemo(() => {
    if (selectedDay) {
      return tickets.filter((t) => localDayKeyFromIso(t.created_at) === selectedDay);
    }
    return tickets.filter((t) => ticketInRange(t.created_at, range));
  }, [tickets, range, selectedDay]);

  const paymentFiltered = useMemo(() => {
    if (paymentFilter === "all") return filtered;
    return filtered.filter((t) => t.payment_method === paymentFilter);
  }, [filtered, paymentFilter]);

  const sorted = useMemo(() => {
    return [...paymentFiltered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [paymentFiltered]);

  useEffect(() => {
    setSelectedRowId((id) =>
      id != null && sorted.some((r) => r.id === id) ? id : null,
    );
  }, [sorted]);

  const totals = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let bizum = 0;
    let tarjeta = 0;
    for (const t of paymentFiltered) {
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
      count: paymentFiltered.length,
    };
  }, [paymentFiltered]);

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
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
              Usa el periodo como en el panel o el calendario para filtrar por un día concreto. La tabla y el resumen se
              actualizan al instante.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:items-start">
            {/* Col izq fila 1: Resumen | Col der filas 1–2: Calendario (alto) */}
            <div className="min-w-0 rounded-2xl border border-slate-200/70 glass-inner p-4 md:p-5 md:row-start-1 md:col-start-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Resumen</p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2 md:flex-nowrap md:gap-3">
                <div className="relative min-w-[5.25rem] flex-1 overflow-hidden rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-600/12 to-cyan-500/8 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Total</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-slate-900 md:text-lg">{fmtEuro(totals.total)}</p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-emerald-200/55 bg-gradient-to-br from-emerald-500/12 to-teal-500/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Efectivo</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-emerald-800 md:text-lg">{fmtEuro(totals.efectivo)}</p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-500/10 to-purple-500/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Bizum</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-violet-900 md:text-lg">{fmtEuro(totals.bizum)}</p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-amber-200/55 bg-gradient-to-br from-amber-500/12 to-orange-500/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Tarjeta</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-amber-950 md:text-lg">{fmtEuro(totals.tarjeta)}</p>
                </div>
                <div className="relative min-w-[4.5rem] flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-white/55 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Tickets</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-slate-900 md:text-lg">{totals.count}</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200/70 glass-inner p-2.5 md:p-3 md:row-start-1 md:row-span-2 md:col-start-2 md:self-stretch">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Calendario</p>
              <div className="mt-2">
                <IngresosDayCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />
              </div>
            </div>

            {/* Fila 2 col izq: Periodo + card método (misma altura) */}
            <div className="flex min-w-0 flex-col gap-3 md:row-start-2 md:col-start-1 md:flex-row md:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200/70 glass-inner p-3 md:p-4">
                <div className="flex min-w-0 items-center justify-between gap-x-3 gap-y-1">
                  <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Periodo
                  </p>
                  <p
                    className="min-w-0 truncate text-right text-[11px] font-medium leading-snug text-slate-600"
                    title={rangeLabel}
                  >
                    {rangeLabel}
                  </p>
                </div>
                <div
                  className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="group"
                  aria-label="Seleccionar franja temporal"
                >
                  {RANGE_ORDER.map((k) => {
                    const selected = range === k && !selectedDay;
                    return (
                      <button
                        key={k}
                        type="button"
                        title={RANGE_LABELS[k]}
                        aria-pressed={selected}
                        aria-label={RANGE_LABELS[k]}
                        onClick={() => {
                          setSelectedDay(null);
                          setRange(k);
                        }}
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
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200/70 glass-inner p-3 md:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Método</p>
                <div
                  className="mt-2 flex min-w-0 flex-wrap gap-2"
                  role="group"
                  aria-label="Filtrar por forma de pago"
                >
                  {(
                    [
                      { key: "cash" as const, label: "Efectivo" },
                      { key: "bizum" as const, label: "Bizum" },
                      { key: "card" as const, label: "Tarjeta" },
                    ] as const
                  ).map(({ key, label }) => {
                    const active = paymentFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        aria-label={`Solo ${label}`}
                        onClick={() =>
                          setPaymentFilter((prev) => (prev === key ? "all" : key))
                        }
                        className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold leading-tight transition sm:text-[11px] ${
                          active
                            ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-1 ring-blue-400/40"
                            : "border border-slate-200/80 bg-white/50 text-slate-600 hover:border-blue-300/70 hover:bg-white/90 hover:text-slate-800"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fila 3: tabla 100% justo debajo del calendario */}
            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200/70 bg-white/40 md:col-span-2 md:row-start-3 md:col-start-1">
              <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-2 py-2 md:px-3">Fecha</th>
                  <th className="whitespace-nowrap px-2 py-2 md:px-3">Ticket</th>
                  <th className="min-w-[6rem] px-2 py-2 md:px-3">Cliente</th>
                  <th className="whitespace-nowrap px-2 py-2 md:px-3">Método</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right md:px-3">Importe</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-600">
                      {filtered.length === 0
                        ? selectedDay
                          ? "No hay tickets en este día."
                          : "No hay tickets en este periodo."
                        : "No hay tickets con ese método de pago en la selección actual."}
                    </td>
                  </tr>
                ) : (
                  sorted.map((row) => {
                    const isSelected = selectedRowId === row.id;
                    return (
                    <tr
                      key={row.id}
                      aria-selected={isSelected}
                      aria-label={`Ticket ${row.ticket_number}`}
                      onClick={() =>
                        setSelectedRowId((prev) => (prev === row.id ? null : row.id))
                      }
                      className={`cursor-pointer border-b border-slate-100/90 transition-colors last:border-0 ${
                        isSelected
                          ? "bg-blue-600/12 ring-1 ring-inset ring-blue-500/35 hover:bg-blue-600/15"
                          : "hover:bg-white/50"
                      }`}
                    >
                      <td className="whitespace-nowrap px-2 py-2 tabular-nums text-slate-700 md:px-3">
                        {new Date(row.created_at).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-900 md:px-3">{row.ticket_number}</td>
                      <td className="px-2 py-2 text-slate-700 md:px-3">{row.client_name?.trim() || "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-700 md:px-3">{paymentLabel(row.payment_method)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums text-slate-900 md:px-3">
                        {fmtEuro(row.total_cents / 100)}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
