"use client";

import Link from "next/link";
import { Check, Pencil, Printer, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

function paymentLabel(m: PaymentMethod): string {
  if (m === "cash") return "Efectivo";
  if (m === "bizum") return "Bizum";
  return "Tarjeta";
}

export function FacturasPageClient({
  invoices: initialInvoices,
  ticketOptions,
}: {
  invoices: InvoiceRow[];
  ticketOptions: TicketOptionRow[];
}) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
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

  const totalFacturado = useMemo(
    () => invoices.reduce((sum, inv) => sum + inv.total_cents / 100, 0),
    [invoices],
  );

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
            <h1 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">Facturas (PSF A4)</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Genera factura desde ticket y después la puedes modificar o eliminar. Cada factura incluye enlace de
              impresión en plantilla A4.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:items-start">
            <div className="glass-inner p-4 shadow-sm ring-1 ring-white/50 md:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Generar factura</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
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
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  disabled={!selectedTicketId || creating}
                  onClick={() => void handleCreateInvoice()}
                >
                  {creating ? "Generando…" : "Generar"}
                </Button>
              </div>
            </div>

            <div className="glass-inner p-4 text-sm shadow-sm ring-1 ring-white/50 md:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Resumen</p>
              <p className="mt-2 text-slate-600">Facturas: {invoices.length}</p>
              <p className="text-slate-600">Importe total: {formatEuroEsTwoDecimals(totalFacturado)}</p>
            </div>

            {actionMessage ? (
              <div
                className={`md:col-span-2 rounded-xl px-3 py-2 text-sm ${
                  actionMessage.type === "ok"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {actionMessage.text}
              </div>
            ) : null}

            <div className="md:col-span-2 min-w-0 overflow-x-auto rounded-xl border border-slate-200/70 bg-white/40">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Factura</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Método</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                    <th className="px-3 py-2">Notas</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-600">
                        Aún no hay facturas.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((row) => {
                      const isEditing = editingInvoiceId === row.id;
                      return (
                        <tr key={row.id} className="border-b border-slate-100/90 last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {new Date(row.issue_date).toLocaleDateString("es-ES")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{row.invoice_number}</td>
                          <td className="px-3 py-2 text-slate-700">{row.client_name ?? "—"}</td>
                          <td className="px-3 py-2">
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
                          <td className="whitespace-nowrap px-3 py-2 text-right">
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
                          <td className="px-3 py-2">
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
                          <td className="whitespace-nowrap px-2 py-1.5 text-right">
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
                                title="Imprimir A4"
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
              <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => setDeleteInvoiceId(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" size="sm" disabled={deleting} onClick={() => void handleDeleteInvoice()}>
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
