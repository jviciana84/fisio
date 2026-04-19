"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
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
  /** ISO 8601; para deduplicar cargos recurrentes repetidos en el tiempo. */
  created_at: string;
};

function fmtEuro(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

/** Para ordenar / deduplicar: prioriza created_at; si falta, usa expense_date. */
function expenseRowTimestampMs(r: ExpenseDetailRow): number {
  const c = Date.parse(r.created_at);
  if (!Number.isNaN(c)) return c;
  const d = Date.parse(`${r.expense_date}T12:00:00`);
  return Number.isNaN(d) ? 0 : d;
}

/**
 * Quita sufijos de tipo seed/demo: "Concepto · Apr 26" → "Concepto".
 * El seed mensual usa `concept || ' · ' || to_char(mes, 'TMMon YY')` (ver migración 015).
 */
export function canonicalConceptForFixedKey(concept: string): string {
  const t = concept.trim();
  const idx = t.lastIndexOf(" · ");
  if (idx <= 0) return t;
  const suffix = t.slice(idx + 3).trim();
  if (/^[A-Za-zÀ-ÿ]{3,12}\.?\s+\d{2}$/.test(suffix)) {
    return t.slice(0, idx).trim();
  }
  return t;
}

function formatUltimaAlta(r: ExpenseDetailRow): string {
  const c = Date.parse(r.created_at);
  if (!Number.isNaN(c)) {
    return new Date(c).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const d = Date.parse(`${r.expense_date}T12:00:00`);
  if (!Number.isNaN(d)) {
    return new Date(d).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return "—";
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

const FIXED_RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Puntual" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

export function GastosPageClient({ expenses }: { expenses: ExpenseDetailRow[] }) {
  const router = useRouter();
  const [expenseList, setExpenseList] = useState<ExpenseDetailRow[]>(expenses);
  useEffect(() => {
    setExpenseList(expenses);
  }, [expenses]);

  const [range, setRange] = useState<ChartRange>("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [fixedPage, setFixedPage] = useState(1);
  const [fixedPageSize, setFixedPageSize] = useState(25);
  const [selectedFixedRowId, setSelectedFixedRowId] = useState<string | null>(null);

  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editRecurrence, setEditRecurrence] = useState("monthly");
  const [editAmountStr, setEditAmountStr] = useState("");
  const [fixedActionError, setFixedActionError] = useState<string | null>(null);
  const [savingFixed, setSavingFixed] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingFixed, setDeletingFixed] = useState(false);

  const [editingMainId, setEditingMainId] = useState<string | null>(null);
  const [editMainConcept, setEditMainConcept] = useState("");
  const [editMainCategory, setEditMainCategory] = useState("");
  const [editMainRecurrence, setEditMainRecurrence] = useState("monthly");
  const [editMainAmountStr, setEditMainAmountStr] = useState("");
  const [editMainDate, setEditMainDate] = useState("");
  const [mainListError, setMainListError] = useState<string | null>(null);
  const [savingMain, setSavingMain] = useState(false);
  const [deleteMainId, setDeleteMainId] = useState<string | null>(null);
  const [deletingMain, setDeletingMain] = useState(false);
  const [deleteMainModalError, setDeleteMainModalError] = useState<string | null>(null);
  const [deleteFixedModalError, setDeleteFixedModalError] = useState<string | null>(null);

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
      return expenseList.filter((e) => localDayKeyFromExpenseDate(e.expense_date) === selectedDay);
    }
    return expenseList.filter((e) => expenseDateInRange(e.expense_date, range));
  }, [expenseList, range, selectedDay]);

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

  useEffect(() => {
    setSelectedRowId((id) =>
      id != null && sorted.some((r) => r.id === id) ? id : null,
    );
  }, [sorted]);

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

  /**
   * Gastos fijos “configurados”: recurrentes deduplicados por concepto canónico + categoría + periodicidad.
   * El concepto canónico ignora sufijos tipo " · Apr 26" del seed mensual (misma línea de gasto en distintos meses).
   * Si sigue habiendo varias filas (misma clave), se queda la más reciente por created_at.
   */
  const fixedConfiguredRows = useMemo(() => {
    const recurring = expenseList.filter((e) => e.recurrence !== "none");
    const key = (r: ExpenseDetailRow) =>
      `${canonicalConceptForFixedKey(r.concept).toLowerCase()}|${(r.category ?? "").trim().toLowerCase()}|${r.recurrence}`;
    const byConfig = new Map<string, ExpenseDetailRow>();
    for (const r of recurring) {
      const k = key(r);
      const prev = byConfig.get(k);
      if (!prev || expenseRowTimestampMs(r) > expenseRowTimestampMs(prev)) {
        byConfig.set(k, r);
      }
    }
    return [...byConfig.values()].sort((a, b) =>
      canonicalConceptForFixedKey(a.concept).localeCompare(canonicalConceptForFixedKey(b.concept), "es"),
    );
  }, [expenseList]);

  useEffect(() => {
    setSelectedFixedRowId((id) =>
      id != null && fixedConfiguredRows.some((r) => r.id === id) ? id : null,
    );
  }, [fixedConfiguredRows]);

  useEffect(() => {
    setEditingMainId((id) =>
      id != null && expenseList.some((e) => e.id === id) ? id : null,
    );
  }, [expenseList]);

  const fixedTotalRows = fixedConfiguredRows.length;
  const fixedTotalPages = Math.max(1, Math.ceil(fixedTotalRows / fixedPageSize) || 1);

  useEffect(() => {
    setFixedPage((p) => Math.min(Math.max(1, p), fixedTotalPages));
  }, [fixedTotalPages, fixedPageSize]);

  const fixedPaginatedRows = useMemo(() => {
    const start = (fixedPage - 1) * fixedPageSize;
    return fixedConfiguredRows.slice(start, start + fixedPageSize);
  }, [fixedConfiguredRows, fixedPage, fixedPageSize]);

  function startEditFixed(row: ExpenseDetailRow) {
    setEditingMainId(null);
    setSelectedFixedRowId(row.id);
    setEditingFixedId(row.id);
    setEditCategory(row.category?.trim() || "");
    setEditRecurrence(row.recurrence || "monthly");
    setEditAmountStr((row.amount_cents / 100).toFixed(2).replace(".", ","));
    setFixedActionError(null);
  }

  function startEditMain(row: ExpenseDetailRow) {
    setEditingFixedId(null);
    setSelectedRowId(row.id);
    setEditingMainId(row.id);
    setEditMainConcept(row.concept);
    setEditMainCategory(row.category?.trim() || "");
    setEditMainRecurrence(row.recurrence || "monthly");
    setEditMainAmountStr((row.amount_cents / 100).toFixed(2).replace(".", ","));
    setEditMainDate(row.expense_date?.slice(0, 10) || "");
    setMainListError(null);
  }

  function cancelEditMain() {
    setEditingMainId(null);
    setMainListError(null);
  }

  function cancelEditFixed() {
    setEditingFixedId(null);
    setFixedActionError(null);
  }

  useEffect(() => {
    if (!editingFixedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingFixedId(null);
        setFixedActionError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingFixedId]);

  useEffect(() => {
    if (!editingMainId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingMainId(null);
        setMainListError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingMainId]);

  async function saveMainEdit(id: string) {
    const raw = editMainAmountStr.replace(/\s/g, "").replace(",", ".");
    const amountEuros = parseFloat(raw);
    const concept = editMainConcept.trim();
    if (concept.length < 2) {
      setMainListError("Indica un concepto (mín. 2 caracteres).");
      return;
    }
    if (!editMainCategory.trim()) {
      setMainListError("Indica una categoría.");
      return;
    }
    if (!editMainDate || !/^\d{4}-\d{2}-\d{2}$/.test(editMainDate)) {
      setMainListError("Indica una fecha válida.");
      return;
    }
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      setMainListError("Indica un importe válido mayor que cero.");
      return;
    }
    setSavingMain(true);
    setMainListError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          expenseDate: editMainDate,
          category: editMainCategory.trim(),
          recurrence: editMainRecurrence,
          amountEuros,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMainListError(data.message ?? "No se pudo guardar");
        return;
      }
      const amountCents = Math.round(amountEuros * 100);
      setExpenseList((list) =>
        list.map((e) =>
          e.id === id
            ? {
                ...e,
                concept,
                expense_date: editMainDate,
                category: editMainCategory.trim(),
                recurrence: editMainRecurrence,
                amount_cents: amountCents,
              }
            : e,
        ),
      );
      setEditingMainId(null);
      router.refresh();
    } catch {
      setMainListError("Error de red");
    } finally {
      setSavingMain(false);
    }
  }

  async function confirmDeleteMain() {
    if (!deleteMainId) return;
    setDeletingMain(true);
    setMainListError(null);
    setDeleteMainModalError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${deleteMainId}`, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      let data: { ok?: boolean; message?: string } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as { ok?: boolean; message?: string };
      } catch {
        setDeleteMainModalError("Respuesta inválida del servidor");
        return;
      }
      if (!res.ok || data.ok !== true) {
        const msg = data.message ?? `No se pudo eliminar (${res.status})`;
        setDeleteMainModalError(msg);
        setMainListError(msg);
        return;
      }
      setExpenseList((list) => list.filter((e) => e.id !== deleteMainId));
      setSelectedRowId((rid) => (rid === deleteMainId ? null : rid));
      if (editingMainId === deleteMainId) setEditingMainId(null);
      setDeleteMainId(null);
      router.refresh();
    } catch {
      const msg = "Error de red";
      setDeleteMainModalError(msg);
      setMainListError(msg);
    } finally {
      setDeletingMain(false);
    }
  }

  async function saveFixedEdit(id: string) {
    const raw = editAmountStr.replace(/\s/g, "").replace(",", ".");
    const amountEuros = parseFloat(raw);
    if (!editCategory.trim()) {
      setFixedActionError("Indica una categoría.");
      return;
    }
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      setFixedActionError("Indica un importe válido mayor que cero.");
      return;
    }
    setSavingFixed(true);
    setFixedActionError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editCategory.trim(),
          recurrence: editRecurrence,
          amountEuros,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setFixedActionError(data.message ?? "No se pudo guardar");
        return;
      }
      const amountCents = Math.round(amountEuros * 100);
      setExpenseList((list) =>
        list.map((e) =>
          e.id === id
            ? { ...e, category: editCategory.trim(), recurrence: editRecurrence, amount_cents: amountCents }
            : e,
        ),
      );
      setEditingFixedId(null);
      router.refresh();
    } catch {
      setFixedActionError("Error de red");
    } finally {
      setSavingFixed(false);
    }
  }

  async function confirmDeleteFixed() {
    if (!deleteTargetId) return;
    setDeletingFixed(true);
    setFixedActionError(null);
    setDeleteFixedModalError(null);
    try {
      const res = await fetch(`/api/admin/expenses/${deleteTargetId}`, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      let data: { ok?: boolean; message?: string } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as { ok?: boolean; message?: string };
      } catch {
        setDeleteFixedModalError("Respuesta inválida del servidor");
        return;
      }
      if (!res.ok || data.ok !== true) {
        const msg = data.message ?? `No se pudo eliminar (${res.status})`;
        setDeleteFixedModalError(msg);
        setFixedActionError(msg);
        return;
      }
      setExpenseList((list) => list.filter((e) => e.id !== deleteTargetId));
      setSelectedFixedRowId((id) => (id === deleteTargetId ? null : id));
      if (editingFixedId === deleteTargetId) setEditingFixedId(null);
      setDeleteTargetId(null);
      router.refresh();
    } catch {
      const msg = "Error de red";
      setDeleteFixedModalError(msg);
      setFixedActionError(msg);
    } finally {
      setDeletingFixed(false);
    }
  }

  const deleteTargetRow = deleteTargetId
    ? expenseList.find((e) => e.id === deleteTargetId)
    : undefined;

  const deleteMainTargetRow = deleteMainId
    ? expenseList.find((e) => e.id === deleteMainId)
    : undefined;

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
              Filtra por periodo, día o categoría; clic en una fila para resaltarla.
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
              <p className="border-b border-slate-100/90 bg-slate-50/40 px-3 py-2 text-[11px] leading-snug text-slate-500 md:px-3">
                Lista completa de apuntes; edita o elimina desde Acciones. Abajo se agrupan los gastos fijos
                recurrentes.
              </p>
              {mainListError ? (
                <p className="border-b border-rose-100/80 bg-rose-50/50 px-3 py-2 text-sm text-rose-800" role="alert">
                  {mainListError}
                </p>
              ) : null}
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="whitespace-nowrap px-2 py-2 md:px-3">Fecha</th>
                    <th className="min-w-[6rem] px-2 py-2 md:px-3">Concepto</th>
                    <th className="whitespace-nowrap px-2 py-2 md:px-3">Categoría</th>
                    <th className="whitespace-nowrap px-2 py-2 md:px-3">Recurrencia</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right md:px-3">Importe</th>
                    <th
                      className="whitespace-nowrap px-2 py-2 text-right md:px-2"
                      title="Editar o eliminar este apunte."
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-600">
                        {filtered.length === 0
                          ? selectedDay
                            ? "No hay gastos en este día."
                            : "No hay gastos en este periodo."
                          : "No hay gastos en esta categoría."}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {paginatedRows.map((row) => {
                        const isSelected = selectedRowId === row.id;
                        const isEditing = editingMainId === row.id;
                        const inputCls =
                          "w-full min-w-[4.5rem] rounded-md border border-slate-200/90 bg-white px-1.5 py-1 text-[12px] text-slate-900 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 md:px-2";
                        return (
                          <tr
                            key={row.id}
                            aria-selected={isSelected}
                            aria-label={`Gasto ${row.concept}`}
                            onClick={(e) => {
                              const t = e.target as HTMLElement;
                              if (t.closest("button, input, select, textarea, label")) return;
                              if (editingMainId === row.id) return;
                              setSelectedRowId((prev) => (prev === row.id ? null : row.id));
                            }}
                            className={`cursor-pointer border-b border-slate-100/90 transition-colors last:border-0 ${
                              isSelected
                                ? "bg-rose-600/12 ring-1 ring-inset ring-rose-500/35 hover:bg-rose-600/15"
                                : "hover:bg-slate-50/90"
                            }`}
                          >
                            <td
                              className="whitespace-nowrap px-2 py-1.5 tabular-nums text-slate-700 md:px-3 md:py-2"
                              title="Clic para editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditMain(row);
                              }}
                            >
                              {isEditing ? (
                                <input
                                  type="date"
                                  className={`${inputCls} min-w-[9rem]`}
                                  value={editMainDate}
                                  onChange={(e) => setEditMainDate(e.target.value)}
                                  aria-label="Fecha del gasto"
                                />
                              ) : (
                                new Date(row.expense_date + "T12:00:00").toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              )}
                            </td>
                            <td
                              className="max-w-[10rem] px-2 py-1.5 font-medium text-slate-900 md:max-w-[14rem] md:px-3 md:py-2"
                              title="Clic para editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditMain(row);
                              }}
                            >
                              {isEditing ? (
                                <input
                                  className={inputCls}
                                  value={editMainConcept}
                                  onChange={(e) => setEditMainConcept(e.target.value)}
                                  aria-label="Concepto"
                                />
                              ) : (
                                <span className="line-clamp-2 md:truncate">{row.concept}</span>
                              )}
                            </td>
                            <td
                              className="max-w-[8rem] px-2 py-1.5 md:px-3 md:py-2"
                              title="Clic para editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditMain(row);
                              }}
                            >
                              {isEditing ? (
                                <input
                                  className={inputCls}
                                  value={editMainCategory}
                                  onChange={(e) => setEditMainCategory(e.target.value)}
                                  aria-label="Categoría"
                                />
                              ) : (
                                <span className="text-slate-700">{row.category?.trim() || "—"}</span>
                              )}
                            </td>
                            <td
                              className="whitespace-nowrap px-2 py-1.5 md:px-3 md:py-2"
                              title="Clic para editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditMain(row);
                              }}
                            >
                              {isEditing ? (
                                <select
                                  className={`${inputCls} min-w-[6.5rem]`}
                                  value={editMainRecurrence}
                                  onChange={(e) => setEditMainRecurrence(e.target.value)}
                                  aria-label="Recurrencia"
                                >
                                  {FIXED_RECURRENCE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-700">{recurrenceLabel(row.recurrence)}</span>
                              )}
                            </td>
                            <td
                              className="whitespace-nowrap px-2 py-1.5 text-right md:px-3 md:py-2"
                              title="Clic para editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditMain(row);
                              }}
                            >
                              {isEditing ? (
                                <input
                                  className={`${inputCls} text-right tabular-nums`}
                                  inputMode="decimal"
                                  value={editMainAmountStr}
                                  onChange={(e) => setEditMainAmountStr(e.target.value)}
                                  aria-label="Importe en euros"
                                />
                              ) : (
                                <span className="font-semibold tabular-nums text-slate-900">
                                  {fmtEuro(row.amount_cents / 100)}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-1 py-1 text-right md:px-2 md:py-1.5">
                              <div className="inline-flex items-center gap-0.5">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      title="Guardar"
                                      disabled={savingMain}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void saveMainEdit(row.id);
                                      }}
                                      className="inline-flex rounded-md p-1.5 text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40"
                                    >
                                      <Check className="h-4 w-4" aria-hidden />
                                      <span className="sr-only">Guardar</span>
                                    </button>
                                    <button
                                      type="button"
                                      title="Cancelar"
                                      disabled={savingMain}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        cancelEditMain();
                                      }}
                                      className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                                    >
                                      <X className="h-4 w-4" aria-hidden />
                                      <span className="sr-only">Cancelar</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    title="Editar"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditMain(row);
                                    }}
                                    className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-800"
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden />
                                    <span className="sr-only">Editar</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Eliminar"
                                  disabled={savingMain || deletingMain}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMainListError(null);
                                    setDeleteMainModalError(null);
                                    if (editingMainId === row.id) setEditingMainId(null);
                                    setDeleteMainId(row.id);
                                  }}
                                  className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden />
                                  <span className="sr-only">Eliminar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
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

          <div className="mt-8 border-t border-slate-200/70 pt-8">
            <div className="min-w-0 pr-[5.75rem] md:pr-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600">
                Configuración
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900 md:text-xl">Gastos fijos configurados</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Un cargo por gasto fijo; edita o elimina desde{" "}
                <span className="font-medium text-slate-700">Acciones</span>
                {" · "}
                <Link
                  href="/dashboard/configuracion/gastos"
                  className="font-medium text-rose-700 underline decoration-rose-300/80 underline-offset-2 hover:text-rose-900"
                >
                  Nueva alta
                </Link>
              </p>
            </div>

            {fixedActionError ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {fixedActionError}
              </p>
            ) : null}

            <div className="mt-4 min-w-0 overflow-x-auto rounded-xl border border-slate-200/70 bg-white/40">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="min-w-[8rem] px-3 py-2.5 md:px-4">Concepto</th>
                    <th className="min-w-[7rem] px-3 py-2.5 md:px-4">Categoría</th>
                    <th className="whitespace-nowrap px-3 py-2.5 md:px-4">Periodicidad</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right md:px-4">Importe</th>
                    <th className="whitespace-nowrap px-3 py-2.5 md:px-4">Última alta</th>
                    <th
                      className="whitespace-nowrap px-3 py-2.5 text-right md:px-4"
                      title="Editar categoría, periodicidad o importe; eliminar el cargo."
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fixedConfiguredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                        No hay gastos recurrentes configurados.{" "}
                        <Link
                          href="/dashboard/configuracion/gastos"
                          className="font-medium text-rose-700 underline hover:text-rose-900"
                        >
                          Dar de alta un cargo
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    fixedPaginatedRows.map((row) => {
                      const isSelected = selectedFixedRowId === row.id;
                      const isEditing = editingFixedId === row.id;
                      const label = canonicalConceptForFixedKey(row.concept);
                      const inputCls =
                        "w-full min-w-[5.5rem] rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[13px] text-slate-900 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400";
                      return (
                        <tr
                          key={row.id}
                          aria-selected={isSelected}
                          aria-label={`Gasto fijo ${label}`}
                          onClick={(e) => {
                            const t = e.target as HTMLElement;
                            if (t.closest("button, input, select, textarea, a, label")) return;
                            setSelectedFixedRowId((prev) => (prev === row.id ? null : row.id));
                          }}
                          className={`cursor-pointer border-b border-slate-100/90 transition-colors last:border-0 ${
                            isSelected
                              ? "bg-rose-600/12 ring-1 ring-inset ring-rose-500/35 hover:bg-rose-600/15"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-900 md:px-4">{label}</td>
                          <td
                            className="max-w-[12rem] px-3 py-2 text-slate-700 md:px-4"
                            title="Clic para editar"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditFixed(row);
                            }}
                          >
                            {isEditing ? (
                              <input
                                className={inputCls}
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                aria-label="Categoría"
                              />
                            ) : (
                              <span className="block py-0.5">{row.category?.trim() || "—"}</span>
                            )}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2 md:px-4"
                            title="Clic para editar"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditFixed(row);
                            }}
                          >
                            {isEditing ? (
                              <select
                                className={`${inputCls} min-w-[7.5rem]`}
                                value={editRecurrence}
                                onChange={(e) => setEditRecurrence(e.target.value)}
                                aria-label="Periodicidad"
                              >
                                {FIXED_RECURRENCE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="block py-0.5 text-slate-700">
                                {recurrenceLabel(row.recurrence)}
                              </span>
                            )}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2 text-right md:px-4"
                            title="Clic para editar"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditFixed(row);
                            }}
                          >
                            {isEditing ? (
                              <input
                                className={`${inputCls} text-right tabular-nums`}
                                inputMode="decimal"
                                value={editAmountStr}
                                onChange={(e) => setEditAmountStr(e.target.value)}
                                aria-label="Importe en euros"
                              />
                            ) : (
                              <span className="block py-0.5 font-semibold tabular-nums text-slate-900">
                                {fmtEuro(row.amount_cents / 100)}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700 md:px-4">
                            {formatUltimaAlta(row)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right md:px-3">
                            <div className="inline-flex items-center gap-0.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    title="Guardar"
                                    disabled={savingFixed}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void saveFixedEdit(row.id);
                                    }}
                                    className="inline-flex rounded-md p-1.5 text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40"
                                  >
                                    <Check className="h-4 w-4" aria-hidden />
                                    <span className="sr-only">Guardar</span>
                                  </button>
                                  <button
                                    type="button"
                                    title="Cancelar"
                                    disabled={savingFixed}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelEditFixed();
                                    }}
                                    className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    <X className="h-4 w-4" aria-hidden />
                                    <span className="sr-only">Cancelar</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  title="Editar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditFixed(row);
                                  }}
                                  className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-800"
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                  <span className="sr-only">Editar</span>
                                </button>
                              )}
                              <button
                                type="button"
                                title="Eliminar"
                                disabled={savingFixed || deletingFixed}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFixedActionError(null);
                                  setDeleteFixedModalError(null);
                                  if (editingFixedId === row.id) setEditingFixedId(null);
                                  setDeleteTargetId(row.id);
                                }}
                                className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {fixedConfiguredRows.length > 0 ? (
                <div className="flex flex-col gap-3 border-t border-slate-200/70 bg-slate-50/50 px-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <label htmlFor="gastos-fixed-page-size" className="whitespace-nowrap font-medium">
                      Filas por página
                    </label>
                    <select
                      id="gastos-fixed-page-size"
                      value={fixedPageSize}
                      onChange={(e) => {
                        setFixedPageSize(Number(e.target.value));
                        setFixedPage(1);
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
                      {(fixedPage - 1) * fixedPageSize + 1}–{Math.min(fixedPage * fixedPageSize, fixedTotalRows)} de{" "}
                      {fixedTotalRows}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFixedPage(1)}
                        disabled={fixedPage <= 1}
                        className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Primera página"
                      >
                        ««
                      </button>
                      <button
                        type="button"
                        onClick={() => setFixedPage((p) => Math.max(1, p - 1))}
                        disabled={fixedPage <= 1}
                        className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span className="rounded-md bg-white/80 px-2 py-1 text-[11px] font-medium tabular-nums text-slate-700">
                        Página {fixedPage} / {fixedTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFixedPage((p) => Math.min(fixedTotalPages, p + 1))}
                        disabled={fixedPage >= fixedTotalPages}
                        className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                      <button
                        type="button"
                        onClick={() => setFixedPage(fixedTotalPages)}
                        disabled={fixedPage >= fixedTotalPages}
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
                        setFixedPage(Math.min(Math.max(1, n), fixedTotalPages));
                      }}
                    >
                      <label htmlFor="gastos-fixed-goto-page" className="whitespace-nowrap text-[11px] font-medium text-slate-600">
                        Ir a
                      </label>
                      <input
                        id="gastos-fixed-goto-page"
                        name="goto"
                        type="number"
                        min={1}
                        max={fixedTotalPages}
                        placeholder={String(fixedPage)}
                        className="w-14 rounded-md border border-slate-200/90 bg-white px-2 py-1 text-center text-[12px] tabular-nums text-slate-800 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                        aria-label="Número de página (gastos fijos)"
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

          {deleteMainId && deleteMainTargetRow ? (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gastos-delete-main-expense-title"
              onClick={() => {
                if (!deletingMain) {
                  setDeleteMainId(null);
                  setDeleteMainModalError(null);
                }
              }}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 id="gastos-delete-main-expense-title" className="text-lg font-semibold text-slate-900">
                  ¿Eliminar este apunte?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Se eliminará «{deleteMainTargetRow.concept}» ({fmtEuro(deleteMainTargetRow.amount_cents / 100)}).
                  Esta acción no se puede deshacer.
                </p>
                {deleteMainModalError ? (
                  <p className="mt-3 text-sm text-rose-700" role="alert">
                    {deleteMainModalError}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={deletingMain}
                    onClick={() => {
                      setDeleteMainId(null);
                      setDeleteMainModalError(null);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deletingMain}
                    onClick={() => void confirmDeleteMain()}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deletingMain ? "Eliminando…" : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {deleteTargetId && deleteTargetRow ? (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="gastos-delete-expense-title"
              onClick={() => {
                if (!deletingFixed) {
                  setDeleteTargetId(null);
                  setDeleteFixedModalError(null);
                }
              }}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 id="gastos-delete-expense-title" className="text-lg font-semibold text-slate-900">
                  ¿Eliminar este gasto?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Se eliminará del registro «{canonicalConceptForFixedKey(deleteTargetRow.concept)}» (
                  {fmtEuro(deleteTargetRow.amount_cents / 100)}). Esta acción no se puede deshacer.
                </p>
                {deleteFixedModalError ? (
                  <p className="mt-3 text-sm text-rose-700" role="alert">
                    {deleteFixedModalError}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={deletingFixed}
                    onClick={() => {
                      setDeleteTargetId(null);
                      setDeleteFixedModalError(null);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deletingFixed}
                    onClick={() => void confirmDeleteFixed()}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deletingFixed ? "Eliminando…" : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
