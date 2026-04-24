"use client";

import Link from "next/link";
import { Check, Pencil, Printer, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IngresosDayCalendar } from "@/components/dashboard/IngresosDayCalendar";
import {
  type ChartRange,
  RANGE_LABELS,
  RANGE_ORDER,
  RANGE_SHORT,
  formatIncomeRangeLabel,
  ticketInRange,
} from "@/lib/dashboard/trendChartData";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatEuroEsTwoDecimals, parseSpanishDecimalInput } from "@/lib/format-es";

type PaymentMethod = "cash" | "bizum" | "card";

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  ticket_id: string | null;
  issue_date: string;
  payment_method: PaymentMethod;
  total_cents: number;
  notes: string | null;
  created_at: string;
  client_name: string | null;
};

export type TicketOptionRow = {
  id: string;
  ticket_number: string;
  total_cents: number;
  created_at: string;
  client_name: string | null;
};

const PAYMENT_EDIT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "bizum", label: "Bizum" },
  { value: "card", label: "Tarjeta" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type PaymentFilter = "all" | PaymentMethod;

function paymentLabel(m: PaymentMethod): string {
  if (m === "cash") return "Efectivo";
  if (m === "bizum") return "Bizum";
  return "Tarjeta";
}

function issueDateYmd(issueDate: string): string {
  return issueDate.length >= 10 ? issueDate.slice(0, 10) : issueDate;
}

/** Filtro por franja (usa fecha de emisión de la factura). */
function invoiceIssueInRange(issueDate: string, range: ChartRange, nowInput?: Date): boolean {
  return ticketInRange(`${issueDateYmd(issueDate)}T12:00:00`, range, nowInput);
}

export function FacturasPageClient({
  invoices: initialInvoices,
  ticketOptions,
}: {
  invoices: InvoiceRow[];
  ticketOptions: TicketOptionRow[];
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  const [range, setRange] = useState<ChartRange>("week");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editPayment, setEditPayment] = useState<PaymentMethod>("cash");
  const [editTotal, setEditTotal] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      return invoices.filter((inv) => issueDateYmd(inv.issue_date) === selectedDay);
    }
    return invoices.filter((inv) => invoiceIssueInRange(inv.issue_date, range));
  }, [invoices, range, selectedDay]);

  const paymentFiltered = useMemo(() => {
    if (paymentFilter === "all") return filtered;
    return filtered.filter((inv) => inv.payment_method === paymentFilter);
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

  const totals = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let bizum = 0;
    let tarjeta = 0;
    for (const inv of paymentFiltered) {
      const eur = inv.total_cents / 100;
      total += eur;
      if (inv.payment_method === "cash") efectivo += eur;
      else if (inv.payment_method === "bizum") bizum += eur;
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

  function startEdit(row: InvoiceRow) {
    setEditingInvoiceId(row.id);
    setEditPayment(row.payment_method);
    setEditTotal((row.total_cents / 100).toFixed(2).replace(".", ","));
    setEditNotes(row.notes ?? "");
    setActionMessage(null);
  }

  async function handleCreateInvoice() {
    if (!selectedTicketId) return;
    setCreating(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicketId }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setActionMessage({ type: "err", text: data.message ?? "No se pudo generar la factura" });
        return;
      }
      setActionMessage({ type: "ok", text: "Factura generada correctamente desde ticket." });
      setSelectedTicketId("");
      router.refresh();
    } catch {
      setActionMessage({ type: "err", text: "Error de red al crear factura." });
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(invoiceId: string) {
    const euros = parseSpanishDecimalInput(editTotal);
    if (!Number.isFinite(euros) || euros <= 0) {
      setActionMessage({ type: "err", text: "Indica un importe válido mayor que cero." });
      return;
    }
    setSaving(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: editPayment,
          totalEuros: euros,
          notes: editNotes.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setActionMessage({ type: "err", text: data.message ?? "No se pudo actualizar la factura" });
        return;
      }
      const newCents = Math.round(euros * 100);
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, payment_method: editPayment, total_cents: newCents, notes: editNotes.trim() || null }
            : inv,
        ),
      );
      setEditingInvoiceId(null);
      setActionMessage({ type: "ok", text: "Factura actualizada." });
      router.refresh();
    } catch {
      setActionMessage({ type: "err", text: "Error de red al actualizar factura." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteInvoice() {
    if (!deleteInvoiceId) return;
    setDeleting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/invoices/${deleteInvoiceId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setActionMessage({ type: "err", text: data.message ?? "No se pudo eliminar la factura" });
        return;
      }
      setInvoices((prev) => prev.filter((inv) => inv.id !== deleteInvoiceId));
      setDeleteInvoiceId(null);
      setActionMessage({ type: "ok", text: "Factura eliminada." });
      router.refresh();
    } catch {
      setActionMessage({ type: "err", text: "Error de red al eliminar factura." });
    } finally {
      setDeleting(false);
    }
  }

  const deleteTarget = deleteInvoiceId ? invoices.find((inv) => inv.id === deleteInvoiceId) : null;

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <section className="glass-panel glass-tint-cyan relative p-6 md:p-7">
          <Link
            href="/dashboard/ingresos"
            title="Volver a ingresos"
            className={cn(
              buttonVariants({ variant: "gradient", size: "sm" }),
              "absolute right-4 top-4 z-10 inline-flex shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-sm md:right-5 md:top-5",
            )}
          >
            Ingresos
          </Link>

          <div className="min-w-0 pr-[6.5rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Administración</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">Facturas</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Filtra por periodo, día o método de pago; genera factura desde un ticket; edita, imprime o elimina en
              Acciones.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:items-start">
            <div className="min-w-0 glass-inner p-4 shadow-sm ring-1 ring-white/50 md:p-5 md:row-start-1 md:col-start-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Resumen</p>
              <div className="mt-3 flex min-w-0 flex-wrap gap-2 md:flex-nowrap md:gap-3">
                <div className="relative min-w-[5.25rem] flex-1 overflow-hidden rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-600/12 to-cyan-500/8 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Total</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-slate-900 md:text-lg">
                    {formatEuroEsTwoDecimals(totals.total)}
                  </p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-emerald-200/55 bg-gradient-to-br from-emerald-500/12 to-teal-500/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Efectivo</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-emerald-800 md:text-lg">
                    {formatEuroEsTwoDecimals(totals.efectivo)}
                  </p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-500/10 to-purple-500/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Bizum</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-violet-900 md:text-lg">
                    {formatEuroEsTwoDecimals(totals.bizum)}
                  </p>
                </div>
                <div className="relative min-w-[5rem] flex-1 overflow-hidden rounded-xl border border-amber-200/55 bg-gradient-to-br from-amber-500/12 to-orange-500/5 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Tarjeta</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-amber-950 md:text-lg">
                    {formatEuroEsTwoDecimals(totals.tarjeta)}
                  </p>
                </div>
                <div className="relative min-w-[4.5rem] flex-1 overflow-hidden rounded-xl border border-slate-200/70 bg-white/55 px-3 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600">Facturas</p>
                  <p className="mt-1 text-base font-bold tabular-nums text-slate-900 md:text-lg">{totals.count}</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 glass-inner p-2.5 shadow-sm ring-1 ring-white/50 md:row-start-1 md:row-span-3 md:col-start-2 md:self-stretch md:p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Calendario</p>
              <div className="mt-2">
                <IngresosDayCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 md:row-start-2 md:col-start-1 md:flex-row md:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col glass-inner p-3 shadow-sm ring-1 ring-white/50 md:p-4">
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
                    const periodSelected = range === k && !selectedDay;
                    return (
                      <button
                        key={k}
                        type="button"
                        title={RANGE_LABELS[k]}
                        aria-pressed={periodSelected}
                        aria-label={RANGE_LABELS[k]}
                        onClick={() => {
                          setSelectedDay(null);
                          setRange(k);
                        }}
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight transition sm:px-2 sm:py-1 sm:text-[11px] ${
                          periodSelected
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

              <div className="flex min-h-0 min-w-0 flex-1 flex-col glass-inner p-3 shadow-sm ring-1 ring-white/50 md:p-4">
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
                        onClick={() => setPaymentFilter((prev) => (prev === key ? "all" : key))}
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

            <div className="min-w-0 w-full glass-inner p-3 shadow-sm ring-1 ring-white/50 md:row-start-3 md:col-start-1 md:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Generar factura</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Desde un ticket aún sin facturar</p>
              <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="factura-ticket-generar" className="sr-only">
                    Ticket sin facturar
                  </label>
                  <select
                    id="factura-ticket-generar"
                    value={selectedTicketId}
                    onChange={(e) => setSelectedTicketId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="">Selecciona ticket sin factura</option>
                    {ticketOptions.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.ticket_number} · {ticket.client_name ?? "Sin cliente"} ·{" "}
                        {formatEuroEsTwoDecimals(ticket.total_cents / 100)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto sm:min-w-[7.5rem]"
                  disabled={!selectedTicketId || creating}
                  onClick={() => void handleCreateInvoice()}
                >
                  {creating ? "Generando…" : "Generar factura"}
                </Button>
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto rounded-xl border border-slate-200/70 bg-white/40 md:col-span-2 md:row-start-4 md:col-start-1">
              <p className="border-b border-slate-100/90 bg-slate-50/40 px-3 py-2 text-[11px] leading-snug text-slate-500 md:px-3">
                Listado con los filtros de arriba; en Acciones editar, imprimir o eliminar.
              </p>
              {actionMessage ? (
                <p
                  className={
                    actionMessage.type === "ok"
                      ? "border-b border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-800"
                      : "border-b border-rose-100/80 bg-rose-50/50 px-3 py-2 text-sm text-rose-800"
                  }
                  role="alert"
                >
                  {actionMessage.text}
                </p>
              ) : null}
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2 md:px-3">Fecha</th>
                    <th className="px-2 py-2 md:px-3">Factura</th>
                    <th className="px-2 py-2 md:px-3">Cliente</th>
                    <th className="px-2 py-2 md:px-3">Método</th>
                    <th className="px-2 py-2 text-right md:px-3">Importe</th>
                    <th className="px-2 py-2 md:px-3">Notas</th>
                    <th className="px-2 py-2 text-right md:px-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-600">
                        {filtered.length === 0
                          ? selectedDay
                            ? "No hay facturas con esta fecha de emisión."
                            : "No hay facturas en este periodo."
                          : "No hay facturas con ese método de pago en la selección actual."}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const isEditing = editingInvoiceId === row.id;
                      return (
                        <tr key={row.id} className="border-b border-slate-100/90 last:border-0">
                          <td className="whitespace-nowrap px-2 py-2 text-slate-700 md:px-3">
                            {new Date(`${issueDateYmd(row.issue_date)}T12:00:00`).toLocaleDateString("es-ES")}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-900 md:px-3">
                            {row.invoice_number}
                          </td>
                          <td className="px-2 py-2 text-slate-700 md:px-3">{row.client_name ?? "—"}</td>
                          <td className="px-2 py-2 md:px-3">
                            {isEditing ? (
                              <select
                                className="w-full min-w-[6.5rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px]"
                                value={editPayment}
                                onChange={(e) => setEditPayment(e.target.value as PaymentMethod)}
                              >
                                {PAYMENT_EDIT_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span>{paymentLabel(row.payment_method)}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right md:px-3">
                            {isEditing ? (
                              <input
                                className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-[13px]"
                                value={editTotal}
                                onChange={(e) => setEditTotal(e.target.value)}
                                inputMode="decimal"
                              />
                            ) : (
                              <span className="font-semibold tabular-nums text-slate-900">
                                {formatEuroEsTwoDecimals(row.total_cents / 100)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 md:px-3">
                            {isEditing ? (
                              <input
                                className="w-full min-w-[10rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px]"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Notas opcionales"
                              />
                            ) : (
                              <span className="text-slate-600">{row.notes?.trim() || "—"}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-1 py-1.5 text-right md:px-2">
                            <div className="inline-flex items-center gap-0.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    title="Guardar"
                                    disabled={saving}
                                    onClick={() => void handleSaveEdit(row.id)}
                                    className="inline-flex rounded-md p-1.5 text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40"
                                  >
                                    <Check className="h-4 w-4" aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    title="Cancelar"
                                    disabled={saving}
                                    onClick={() => setEditingInvoiceId(null)}
                                    className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    <X className="h-4 w-4" aria-hidden />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  title="Editar"
                                  onClick={() => startEdit(row)}
                                  className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-blue-50 hover:text-blue-800"
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </button>
                              )}

                              <Link
                                href={`/dashboard/facturas/${row.id}/imprimir`}
                                title="Imprimir factura"
                                className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Printer className="h-4 w-4" aria-hidden />
                              </Link>

                              <button
                                type="button"
                                title="Eliminar factura"
                                disabled={saving || deleting}
                                onClick={() => setDeleteInvoiceId(row.id)}
                                className="inline-flex rounded-md p-1.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
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
                    <label htmlFor="facturas-page-size" className="whitespace-nowrap font-medium">
                      Filas por página
                    </label>
                    <select
                      id="facturas-page-size"
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
                      <label htmlFor="facturas-goto-page" className="whitespace-nowrap text-[11px] font-medium text-slate-600">
                        Ir a
                      </label>
                      <input
                        id="facturas-goto-page"
                        name="goto"
                        type="number"
                        min={1}
                        max={totalPages}
                        placeholder={String(page)}
                        className="w-14 rounded-md border border-slate-200/90 bg-white px-2 py-1 text-center text-[12px] tabular-nums text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        aria-label="Número de página"
                      />
                      <Button type="submit" variant="gradient" size="sm" className="h-7 px-2.5 text-[11px]">
                        Ir
                      </Button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">¿Eliminar factura?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Se eliminará la factura {deleteTarget.invoice_number}. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setDeleteInvoiceId(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleting}
                onClick={() => void handleDeleteInvoice()}
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
