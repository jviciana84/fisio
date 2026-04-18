"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IngresosDayCalendar } from "@/components/dashboard/IngresosDayCalendar";
import {
  type ChartRange,
  RANGE_LABELS,
  RANGE_ORDER,
  RANGE_SHORT,
  expenseDateInRange,
  formatIncomeRangeLabel,
  localDayKeyFromExpenseDate,
} from "@/lib/dashboard/trendChartData";

export type ExpenseDetailRow = {
  id: string;
  concept: string;
  notes: string | null;
  category: string;
  amount_cents: number;
  expense_date: string;
  recurrence: string;
};

function fmtEuro(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function recurrenceLabel(r: string): string {
  const map: Record<string, string> = {
    none: "Puntual",
    weekly: "Semanal",
    monthly: "Mensual",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    annual: "Anual",
  };
  return map[r] ?? r;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function GastosPageClient({ expenses }: { expenses: ExpenseDetailRow[] }) {
  const [range, setRange] = useState<ChartRange>("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

  const rangeLabel = useMemo(() => {
    if (selectedDay) {
      const [y, m, d] = selectedDay.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    return formatIncomeRangeLabel(range);
  }, [range, selectedDay]);

  const filtered = useMemo(() => {
    if (selectedDay) {
      return expenses.filter((e) => localDayKeyFromExpenseDate(e.expense_date) === selectedDay);
    }
    return expenses.filter((e) => expenseDateInRange(e.expense_date, range));
  }, [expenses, range, selectedDay]);

  const categoriesInPeriod = useMemo(() => {
    const set = new Set<string>();
    for (const e of filtered) set.add(e.category?.trim() || "General");
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [filtered]);

  const categoryFiltered = useMemo(() => {
    if (categoryFilter === "all") return filtered;
    return filtered.filter((e) => (e.category?.trim() || "General") === categoryFilter);
  }, [filtered, categoryFilter]);

  const sorted = useMemo(() => {
    return [...categoryFiltered].sort((a, b) => {
      const c = b.expense_date.localeCompare(a.expense_date);
      if (c !== 0) return c;
      return b.id.localeCompare(a.id);
    });
  }, [categoryFiltered]);

  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [range, selectedDay, categoryFilter]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const totals = useMemo(() => {
    let total = 0;
    let puntuales = 0;
    let recurrentes = 0;
    for (const e of categoryFiltered) {
      const eur = e.amount_cents / 100;
      total += eur;
      if (e.recurrence === "none") puntuales += eur;
      else recurrentes += eur;
    }
    return {
      total,
      puntuales,
      recurrentes,
      count: categoryFiltered.length,
    };
  }, [categoryFiltered]);

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600">Caja</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">Gastos detallados</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Misma vista que ingresos: periodo, calendario y tabla. El detalle al hacer clic lo definiremos más adelante.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:items-start">
            <div className="min-w-0 rounded-2xl border border-slate-200/70 glass-inner p-4 md:p-5 md:row-start-1 md:col-start-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">Resumen</p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2 md:flex-nowrap md:gap-3">
                <div className="relative min-w-[5.25rem] flex-1 overflow-hidden rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-500/12 to-orange-500/8 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Total</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-slate-900 md:text-lg">{fmtEuro(totals.total)}</p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-500/10 to-slate-600/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Puntuales</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-slate-900 md:text-lg">{fmtEuro(totals.puntuales)}</p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-amber-200/55 bg-gradient-to-br from-amber-500/12 to-orange-500/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Recurrentes</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-amber-950 md:text-lg">{fmtEuro(totals.recurrentes)}</p>
                </div>
                <div className="relative min-w-[4.5rem] flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-white/55 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Registros</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-slate-900 md:text-lg">{totals.count}</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200/70 glass-inner p-2.5 md:p-3 md:row-start-1 md:row-span-2 md:col-start-2 md:self-stretch">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">Calendario</p>
              <div className="mt-2">
                <IngresosDayCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 md:row-start-2 md:col-start-1 md:flex-row md:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200/70 glass-inner p-3 md:p-4">
                <div className="flex min-w-0 items-center justify-between gap-x-3 gap-y-1">
                  <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Periodo</p>
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
                            ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30 ring-1 ring-rose-400/40"
                            : "border border-slate-200/80 bg-white/50 text-slate-600 hover:border-rose-300/70 hover:bg-white/90 hover:text-slate-800"
                        }`}
                      >
                        {RANGE_SHORT[k]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200/70 glass-inner p-3 md:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Categoría</p>
                <div className="mt-2 flex min-w-0 flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
                  <button
                    type="button"
                    aria-pressed={categoryFilter === "all"}
                    onClick={() => setCategoryFilter("all")}
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition sm:text-[11px] ${
                      categoryFilter === "all"
                        ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30 ring-1 ring-rose-400/40"
                        : "border border-slate-200/80 bg-white/50 text-slate-600 hover:border-rose-300/70 hover:bg-white/90"
                    }`}
                  >
                    Todas
                  </button>
                  {categoriesInPeriod.map((cat) => {
                    const active = categoryFilter === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={active}
                        title={cat}
                        onClick={() => setCategoryFilter((prev) => (prev === cat ? "all" : cat))}
                        className={`max-w-[10rem] shrink-0 truncate rounded-md px-2 py-1 text-[10px] font-semibold transition sm:text-[11px] ${
                          active
                            ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30 ring-1 ring-rose-400/40"
                            : "border border-slate-200/80 bg-white/50 text-slate-600 hover:border-rose-300/70 hover:bg-white/90"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200/70 bg-white/40 md:col-span-2 md:row-start-3 md:col-start-1">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="whitespace-nowrap px-2 py-2 md:px-3">Fecha</th>
                    <th className="min-w-[6rem] px-2 py-2 md:px-3">Concepto</th>
                    <th className="whitespace-nowrap px-2 py-2 md:px-3">Categoría</th>
                    <th className="whitespace-nowrap px-2 py-2 md:px-3">Recurrencia</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right md:px-3">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-600">
                        {filtered.length === 0
                          ? selectedDay
                            ? "No hay gastos en este día."
                            : "No hay gastos en este periodo."
                          : "No hay gastos en esta categoría."}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100/90 transition-colors last:border-0 hover:bg-slate-50/90"
                      >
                        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-slate-700 md:px-3">
                          {new Date(row.expense_date + "T12:00:00").toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </td>
                        <td className="max-w-[14rem] truncate px-2 py-2 font-medium text-slate-900 md:max-w-none md:px-3">
                          {row.concept}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-slate-700 md:px-3">
                          {row.category?.trim() || "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-slate-700 md:px-3">
                          {recurrenceLabel(row.recurrence)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums text-slate-900 md:px-3">
                          {fmtEuro(row.amount_cents / 100)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {sorted.length > 0 ? (
                <div className="flex flex-col gap-3 border-t border-slate-200/70 bg-slate-50/50 px-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <label htmlFor="gastos-page-size" className="whitespace-nowrap font-medium">
                      Filas por página
                    </label>
                    <select
                      id="gastos-page-size"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[12px] font-medium text-slate-800 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span className="tabular-nums text-slate-500">
                      {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRows)} de {totalRows}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage(1)}
                        disabled={page <= 1}
                        className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Primera página"
                      >
                        ««
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium tabular-nums text-slate-700">
                        Página {page} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        disabled={page >= totalPages}
                        className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Última página"
                      >
                        »»
                      </button>
                    </div>

                    <form
                      className="flex items-center gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const raw = String(fd.get("goto") ?? "").trim();
                        const n = parseInt(raw, 10);
                        if (!Number.isFinite(n)) return;
                        setPage(Math.min(Math.max(1, n), totalPages));
                      }}
                    >
                      <label htmlFor="gastos-goto-page" className="whitespace-nowrap text-[11px] font-medium text-slate-600">
                        Ir a
                      </label>
                      <input
                        id="gastos-goto-page"
                        name="goto"
                        type="number"
                        min={1}
                        max={totalPages}
                        placeholder={String(page)}
                        className="w-14 rounded-md border border-slate-200/90 bg-white px-2 py-1 text-center text-[12px] tabular-nums text-slate-800 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                        aria-label="Número de página"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-rose-700"
                      >
                        Ir
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
