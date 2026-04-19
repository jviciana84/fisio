"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  type ChartRange,
  type TicketRow,
  RANGE_LABELS,
  RANGE_ORDER,
  RANGE_SHORT,
  formatIncomeRangeLabel,
  ticketInRange,
} from "@/lib/dashboard/trendChartData";
import { formatEuroEsWhole, formatIntegerEs } from "@/lib/format-es";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function DashboardIncomeCards({ tickets }: { tickets: TicketRow[] }) {
  const [range, setRange] = useState<ChartRange>("week");

  const rangeLabel = useMemo(() => formatIncomeRangeLabel(range), [range]);

  const totals = useMemo(() => {
    const filtered = tickets.filter((t) => ticketInRange(t.created_at, range));
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
    return { total, efectivo, bizum, tarjeta, count: filtered.length };
  }, [tickets, range]);

  const items = [
    {
      label: "Total ingresos",
      value: formatEuroEsWhole(totals.total),
      sub: `${formatIntegerEs(totals.count)} ticket${totals.count === 1 ? "" : "s"}`,
      accent: "from-blue-600/15 to-cyan-500/10",
      border: "border-blue-200/60",
    },
    {
      label: "Efectivo",
      value: formatEuroEsWhole(totals.efectivo),
      sub: "Cobros en metálico",
      accent: "from-emerald-500/15 to-teal-500/5",
      border: "border-emerald-200/60",
    },
    {
      label: "Bizum",
      value: formatEuroEsWhole(totals.bizum),
      sub: "Pagos instantáneos",
      accent: "from-violet-500/12 to-purple-500/8",
      border: "border-violet-200/60",
    },
    {
      label: "Tarjeta",
      value: formatEuroEsWhole(totals.tarjeta),
      sub: "TPV / datáfono",
      accent: "from-slate-500/12 to-slate-600/8",
      border: "border-slate-200/60",
    },
  ];

  return (
    <section className="glass-panel glass-tint-slate relative flex h-full min-h-0 flex-col rounded-2xl p-5 md:p-6">
      <Link
        href="/dashboard/ingresos"
        title="Abrir ingresos detallados"
        className={cn(
          buttonVariants({ variant: "gradient", size: "sm" }),
          "absolute right-4 top-4 z-10 inline-flex shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-sm md:right-5 md:top-5",
        )}
      >
        Ingresos
      </Link>

      <div className="min-w-0 pr-[5.75rem]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Ingresos</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Caja</h2>
        <p className="mt-1 max-w-xl text-xs text-slate-600">
          Misma ventana temporal que el gráfico de tendencia. Cambia el periodo para ver totales y reparto por canal.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Periodo</p>
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Seleccionar franja temporal de ingresos"
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.label}
            className={`relative overflow-hidden rounded-2xl border ${it.border} glass-inner`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${it.accent} opacity-[0.65]`}
              aria-hidden
            />
            <div className="relative px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{it.label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{it.value}</p>
              <p className="mt-1 text-xs text-slate-600">{it.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
