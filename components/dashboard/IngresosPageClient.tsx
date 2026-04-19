"use client";

import Link from "next/link";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  type IncomeBreakdownFiscalPrefs,
  computeTicketReserveBreakdown,
} from "@/lib/dashboard/incomeTicketBreakdown";
import { IncomeTicketBreakdownModal } from "@/components/dashboard/IncomeTicketBreakdownModal";

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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const PAYMENT_EDIT_OPTIONS: { value: IncomeTicketRow["payment_method"]; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "bizum", label: "Bizum" },
  { value: "card", label: "Tarjeta" },
];

export function IngresosPageClient({
  tickets,
  fiscalPrefs,
}: {
  tickets: IncomeTicketRow[];
  fiscalPrefs: IncomeBreakdownFiscalPrefs;
}) {
  const router = useRouter();
  const [ticketList, setTicketList] = useState<IncomeTicketRow[]>(tickets);
  useEffect(() => {
    setTicketList(tickets);
  }, [tickets]);

  const [range, setRange] = useState<ChartRange>("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [modalTicket, setModalTicket] = useState<IncomeTicketRow | null>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<IncomeTicketRow["payment_method"]>("cash");
  const [editTotalStr, setEditTotalStr] = useState("");
  const [ingresosActionError, setIngresosActionError] = useState<string | null>(null);
  const [savingTicket, setSavingTicket] = useState(false);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [deleteTicketModalError, setDeleteTicketModalError] = useState<string | null>(null);

  const modalBreakdown = useMemo(() => {
    if (!modalTicket) return null;
    return computeTicketReserveBreakdown(modalTicket.total_cents, fiscalPrefs);
  }, [modalTicket, fiscalPrefs]);

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
      return ticketList.filter((t) => localDayKeyFromIso(t.created_at) === selectedDay);
    }
    return ticketList.filter((t) => ticketInRange(t.created_at, range));
  }, [ticketList, range, selectedDay]);

  const paymentFiltered = useMemo(() => {
    if (paymentFilter === "all") return filtered;
    return filtered.filter((t) => t.payment_method === paymentFilter);
  }, [filtered, paymentFilter]);

  const sorted = useMemo(() => {
    return [...paymentFiltered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [paymentFiltered]);

  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [range, selectedDay, paymentFilter]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => {
    setSelectedRowId((id) =>
      id != null && sorted.some((r) => r.id === id) ? id : null,
    );
  }, [sorted]);

  useEffect(() => {
    setEditingTicketId((id) =>
      id != null && ticketList.some((t) => t.id === id) ? id : null,
    );
  }, [ticketList]);

  function startEditTicket(row: IncomeTicketRow) {
    setEditingTicketId(row.id);
    setEditPayment(row.payment_method);
    setEditTotalStr((row.total_cents / 100).toFixed(2).replace(".", ","));
    setIngresosActionError(null);
  }

  function cancelEditTicket() {
    setEditingTicketId(null);
    setIngresosActionError(null);
  }

  useEffect(() => {
    if (!editingTicketId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingTicketId(null);
        setIngresosActionError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingTicketId]);

  async function saveTicketEdit(id: string) {
    const raw = editTotalStr.replace(/\s/g, "").replace(",", ".");
    const euros = parseFloat(raw);
    if (!Number.isFinite(euros) || euros <= 0) {
      setIngresosActionError("Indica un importe válido mayor que cero.");
      return;
    }
    setSavingTicket(true);
    setIngresosActionError(null);
    try {
      const res = await fetch(`/api/admin/cash/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: editPayment, totalEuros: euros }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setIngresosActionError(data.message ?? "No se pudo guardar");
        return;
      }
      const amountCents = Math.round(euros * 100);
      setTicketList((list) =>
        list.map((t) =>
          t.id === id ? { ...t, payment_method: editPayment, total_cents: amountCents } : t,
        ),
      );
      setModalTicket((prev) =>
        prev?.id === id ? { ...prev, payment_method: editPayment, total_cents: amountCents } : prev,
      );
      setEditingTicketId(null);
      router.refresh();
    } catch {
      setIngresosActionError("Error de red");
    } finally {
      setSavingTicket(false);
    }
  }

  async function confirmDeleteTicket() {
    if (!deleteTicketId) return;
    setDeletingTicket(true);
    setIngresosActionError(null);
    setDeleteTicketModalError(null);
    try {
      const res = await fetch(`/api/admin/cash/tickets/${encodeURIComponent(deleteTicketId)}`, {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      let data: { ok?: boolean; message?: string } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as { ok?: boolean; message?: string };
      } catch {
        setDeleteTicketModalError("Respuesta inválida del servidor");
        setIngresosActionError("Respuesta inválida del servidor");
        return;
      }
      if (!res.ok || data.ok !== true) {
        const msg = data.message ?? `No se pudo eliminar (${res.status})`;
        setDeleteTicketModalError(msg);
        setIngresosActionError(msg);
        return;
      }
      setTicketList((list) => list.filter((t) => t.id !== deleteTicketId));
      setSelectedRowId((x) => (x === deleteTicketId ? null : x));
      setModalTicket((prev) => (prev?.id === deleteTicketId ? null : prev));
      if (editingTicketId === deleteTicketId) setEditingTicketId(null);
      setDeleteTicketId(null);
      router.refresh();
    } catch {
      const msg = "Error de red";
      setDeleteTicketModalError(msg);
      setIngresosActionError(msg);
    } finally {
      setDeletingTicket(false);
    }
  }

  const deleteTargetTicket = deleteTicketId
    ? ticketList.find((t) => t.id === deleteTicketId)
    : undefined;

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
              Filtra por periodo o día; clic en una fila para el desglose o usa Acciones para editar, borrar o ver
              detalle.
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
              <p className="border-b border-slate-100/90 bg-slate-50/40 px-3 py-2 text-[11px] leading-snug text-slate-500 md:px-3">
                Clic en fila para desglose fiscal; edita método o importe (reescala líneas) o elimina el ticket desde
                Acciones.
              </p>
              {ingresosActionError ? (
                <p className="border-b border-rose-100/80 bg-rose-50/50 px-3 py-2 text-sm text-rose-800" role="alert">
                  {ingresosActionError}
                </p>
              ) : null}
              <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="whitespace-nowrap px-2 py-2 md:px-3">Fecha</th>
                  <th className="whitespace-nowrap px-2 py-2 md:px-3">Ticket</th>
                  <th className="min-w-[6rem] px-2 py-2 md:px-3">Cliente</th>
                  <th className="whitespace-nowrap px-2 py-2 md:px-3">Método</th>
                  <th className="whitespace-nowrap px-2 py-2 text-right md:px-3">Importe</th>
                  <th
                    className="whitespace-nowrap px-2 py-2 text-right md:px-3"
                    title="Editar método o importe; eliminar ticket; o ver desglose al editar con el lápiz y guardar."
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
                          ? "No hay tickets en este día."
                          : "No hay tickets en este periodo."
                        : "No hay tickets con ese método de pago en la selección actual."}
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isSelected = selectedRowId === row.id;
                    const isEditing = editingTicketId === row.id;
                    const inputCls =
                      "w-full min-w-[5rem] rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[13px] text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400";
                    return (
                    <tr
                      key={row.id}
                      aria-selected={isSelected}
                      aria-label={`Ticket ${row.ticket_number}`}
                      onClick={(e) => {
                        const t = e.target as HTMLElement;
                        if (t.closest("button, input, select, textarea, label")) return;
                        if (editingTicketId === row.id) return;
                        if (editingTicketId != null) cancelEditTicket();
                        setSelectedRowId(row.id);
                        setModalTicket(row);
                      }}
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
                      <td
                        className="max-w-[9rem] px-2 py-2 md:px-3"
                        title="Clic para editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditTicket(row);
                        }}
                      >
                        {isEditing ? (
                          <select
                            className={`${inputCls} min-w-[6.5rem]`}
                            value={editPayment}
                            onChange={(e) =>
                              setEditPayment(e.target.value as IncomeTicketRow["payment_method"])
                            }
                            aria-label="Forma de pago"
                          >
                            {PAYMENT_EDIT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="block py-0.5 text-slate-700">{paymentLabel(row.payment_method)}</span>
                        )}
                      </td>
                      <td
                        className="whitespace-nowrap px-2 py-2 text-right md:px-3"
                        title="Clic para editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditTicket(row);
                        }}
                      >
                        {isEditing ? (
                          <input
                            className={`${inputCls} text-right tabular-nums`}
                            inputMode="decimal"
                            value={editTotalStr}
                            onChange={(e) => setEditTotalStr(e.target.value)}
                            aria-label="Importe en euros"
                          />
                        ) : (
                          <span className="block py-0.5 font-semibold tabular-nums text-slate-900">
                            {fmtEuro(row.total_cents / 100)}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-1 py-1.5 text-right md:px-2">
                        <div className="inline-flex items-center gap-0.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                title="Guardar"
                                disabled={savingTicket}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void saveTicketEdit(row.id);
                                }}
                                className="inline-flex rounded-md p-1.5 text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40"
                              >
                                <Check className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Guardar</span>
                              </button>
                              <button
                                type="button"
                                title="Cancelar"
                                disabled={savingTicket}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditTicket();
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
                                startEditTicket(row);
                              }}
                              className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-800"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                              <span className="sr-only">Editar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            title="Eliminar ticket"
                            disabled={savingTicket || deletingTicket}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIngresosActionError(null);
                              setDeleteTicketModalError(null);
                              if (editingTicketId === row.id) setEditingTicketId(null);
                              setDeleteTicketId(row.id);
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

              {sorted.length > 0 ? (
                <div className="flex flex-col gap-3 border-t border-slate-200/70 bg-slate-50/50 px-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <label htmlFor="ingresos-page-size" className="whitespace-nowrap font-medium">
                      Filas por página
                    </label>
                    <select
                      id="ingresos-page-size"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded-md border border-slate-200/90 bg-white px-2 py-1 text-[12px] font-medium text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                      <label htmlFor="ingresos-goto-page" className="whitespace-nowrap text-[11px] font-medium text-slate-600">
                        Ir a
                      </label>
                      <input
                        id="ingresos-goto-page"
                        name="goto"
                        type="number"
                        min={1}
                        max={totalPages}
                        placeholder={String(page)}
                        className="w-14 rounded-md border border-slate-200/90 bg-white px-2 py-1 text-center text-[12px] tabular-nums text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        aria-label="Número de página"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
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

      {deleteTicketId && deleteTargetTicket ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ingresos-delete-ticket-title"
          onClick={() => {
            if (!deletingTicket) {
              setDeleteTicketId(null);
              setDeleteTicketModalError(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ingresos-delete-ticket-title" className="text-lg font-semibold text-slate-900">
              ¿Eliminar este ticket?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Se eliminará el ticket {deleteTargetTicket.ticket_number} (
              {fmtEuro(deleteTargetTicket.total_cents / 100)}). Esta acción no se puede deshacer.
            </p>
            {deleteTicketModalError ? (
              <p className="mt-3 text-sm text-rose-700" role="alert">
                {deleteTicketModalError}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={deletingTicket}
                onClick={() => {
                  setDeleteTicketId(null);
                  setDeleteTicketModalError(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingTicket}
                onClick={() => void confirmDeleteTicket()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingTicket ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <IncomeTicketBreakdownModal
        open={modalTicket != null}
        onClose={() => setModalTicket(null)}
        ticket={modalTicket}
        breakdown={modalBreakdown}
      />
    </main>
  );
}
