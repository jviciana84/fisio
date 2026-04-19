"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone } from "lucide-react";
import {
  type ChartRange,
  RANGE_LABELS,
  RANGE_ORDER,
  RANGE_SHORT,
  buildNewClientsBuckets,
  formatIncomeRangeLabel,
  maxNewClientBucketCount,
} from "@/lib/dashboard/trendChartData";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ClientRow = {
  id: string;
  clientCode: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  estadoPago: string | null;
  leadContactedAt: string | null;
};

type PendingLead = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function ClientsOverviewPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [chartRange, setChartRange] = useState<ChartRange>("month");

  const [pendingLeads, setPendingLeads] = useState<PendingLead[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<PendingLead | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients");
      const data = (await res.json()) as { ok?: boolean; clients?: ClientRow[]; message?: string };
      if (!res.ok || !data.ok || !data.clients) {
        setMessage({ type: "err", text: data.message ?? "No se pudieron cargar los clientes." });
        return;
      }
      setClients(data.clients);
    } catch {
      setMessage({ type: "err", text: "Error de red al cargar clientes." });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/admin/clients/pending-leads");
      const data = (await res.json()) as { ok?: boolean; leads?: PendingLead[] };
      if (res.ok && data.ok && data.leads) setPendingLeads(data.leads);
      else setPendingLeads([]);
    } catch {
      setPendingLeads([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
    void loadPending();
  }, [loadClients, loadPending]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q
      ? clients
      : clients.filter((c) =>
          [c.fullName, c.clientCode ?? "", c.email ?? "", c.phone ?? "", c.notes ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q),
        );
    return [...base].sort((a, b) => a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" }));
  }, [clients, search]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const chartBuckets = useMemo(
    () => buildNewClientsBuckets(chartRange, clients.map((c) => ({ created_at: c.createdAt }))),
    [clients, chartRange],
  );
  const chartMax = useMemo(() => maxNewClientBucketCount(chartBuckets), [chartBuckets]);

  const pendingCount = pendingLeads.length;
  const leadsOk = !pendingLoading && pendingCount === 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    const ids = paginatedRows.map((r) => r.id);
    const allOnPage = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPage) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function markLeadContacted(lead: PendingLead) {
    setMarkingId(lead.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/clients/${lead.id}/lead-contact`, { method: "PATCH" });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "No se pudo marcar como llamado." });
        return;
      }
      setDetailLead(null);
      setPendingModalOpen(false);
      await loadPending();
      await loadClients();
    } catch {
      setMessage({ type: "err", text: "Error de red." });
    } finally {
      setMarkingId(null);
    }
  }

  const allPageSelected =
    paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id));

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          {/* Leads pendientes — izquierda */}
          <button
            type="button"
            onClick={() => setPendingModalOpen(true)}
            className={cn(
              "glass-inner text-left shadow-sm ring-1 transition hover:bg-white/40",
              leadsOk ? "ring-emerald-300/60" : "ring-rose-300/70",
            )}
          >
            <div
              className={cn(
                "rounded-lg px-4 py-4 md:px-5 md:py-5",
                leadsOk
                  ? "bg-gradient-to-br from-emerald-500/12 via-white/30 to-teal-500/8"
                  : "bg-gradient-to-br from-rose-500/15 via-white/35 to-orange-500/8",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                Leads pendientes de contacto
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                Bonos web (pago no habilitado)
              </p>
              <p className="mt-3 text-4xl font-bold tabular-nums text-slate-900">
                {pendingLoading ? "…" : pendingCount}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {leadsOk
                  ? "Todo al día — no hay llamadas pendientes."
                  : "Hay personas esperando que les llamen. Clic para revisar."}
              </p>
            </div>
          </button>

          {/* Nuevos clientes — derecha */}
          <div className="glass-inner shadow-sm ring-1 ring-white/50">
            <div className="border-b border-slate-200/60 px-4 py-3 md:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                Nuevos clientes
              </p>
              <p className="mt-1 text-sm text-slate-600">Altas en la base (por franja temporal).</p>
              <div
                className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
                role="group"
                aria-label="Periodo del gráfico"
              >
                {RANGE_ORDER.map((k) => (
                  <button
                    key={k}
                    type="button"
                    title={RANGE_LABELS[k]}
                    aria-pressed={chartRange === k}
                    onClick={() => setChartRange(k)}
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition sm:px-2 sm:py-1 sm:text-[11px] ${
                      chartRange === k
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 ring-1 ring-blue-400/40"
                        : "border border-slate-200/80 bg-white/50 text-slate-600 hover:border-blue-300/70 hover:bg-white/90"
                    }`}
                  >
                    {RANGE_SHORT[k]}
                  </button>
                ))}
                <span className="text-[11px] text-slate-500" title={formatIncomeRangeLabel(chartRange)}>
                  {formatIncomeRangeLabel(chartRange)}
                </span>
              </div>
            </div>
            <div className="px-3 py-4 md:px-4">
              <div className="flex h-[180px] min-h-[140px] items-end gap-1 overflow-x-auto pb-1">
                {chartBuckets.map((b, i) => {
                  const hPct = chartMax > 0 ? Math.max(6, (b.count / chartMax) * 100) : 0;
                  return (
                    <div
                      key={`${chartRange}-${i}-${b.label}`}
                      className="flex min-w-[1.75rem] flex-1 flex-col items-center gap-1"
                      title={`${b.label}: ${b.count}`}
                    >
                      <div className="flex h-[140px] w-full items-end justify-center">
                        <div
                          className="w-[85%] max-w-[2.5rem] rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-500 shadow-sm"
                          style={{ height: `${hPct}%` }}
                        />
                      </div>
                      <span className="max-w-[4rem] truncate text-center text-[9px] font-medium text-slate-600 sm:text-[10px]">
                        {b.label}
                      </span>
                      <span className="text-[10px] font-semibold tabular-nums text-slate-800">{b.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <section className="glass-panel glass-tint-violet relative p-6 md:p-7">
          <Link
            href="/dashboard"
            title="Volver al panel principal"
            className={cn(
              buttonVariants({ variant: "gradient", size: "sm" }),
              "absolute right-4 top-4 z-10 inline-flex shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-sm md:right-5 md:top-5",
            )}
          >
            Panel
          </Link>

          <div className="min-w-0 pr-[5.75rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Clientes</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">Listado</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Personas registradas para caja y reservas. Marca filas con la casilla.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en la tabla…"
              className="w-full min-w-[12rem] max-w-md rounded-xl border border-slate-200/80 bg-white/75 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {message ? (
            <p
              className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                message.type === "ok"
                  ? "border border-blue-200 bg-blue-50 text-blue-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="mt-6 glass-inner overflow-hidden shadow-sm ring-1 ring-white/50">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-100/85 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-10 px-2 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectPage}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        title="Seleccionar página"
                        aria-label="Seleccionar todas las filas de esta página"
                      />
                    </th>
                    <th className="px-3 py-3">Nombre</th>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Teléfono</th>
                    <th className="px-3 py-3">Alta</th>
                    <th className="px-3 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-8 text-slate-500" colSpan={7}>
                        Cargando clientes…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-slate-500" colSpan={7}>
                        {clients.length === 0 ? "No hay clientes activos." : "Ningún resultado para la búsqueda."}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((c) => (
                      <tr
                        key={c.id}
                        className={cn(
                          "align-top transition-colors",
                          selectedIds.has(c.id) ? "bg-blue-50/80" : "hover:bg-white/40",
                        )}
                      >
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`Seleccionar ${c.fullName}`}
                          />
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-900">{c.fullName}</td>
                        <td className="px-3 py-3 tabular-nums text-slate-700">{c.clientCode ?? "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{c.email ?? "—"}</td>
                        <td className="px-3 py-3 text-slate-700">{c.phone ?? "—"}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="max-w-[12rem] px-3 py-3 text-slate-600">
                          <span className="line-clamp-2" title={c.notes ?? undefined}>
                            {c.notes?.trim() ? c.notes : "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filtered.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-slate-200/70 bg-slate-50/50 px-2 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                  <label htmlFor="clientes-page-size" className="whitespace-nowrap font-medium">
                    Filas por página
                  </label>
                  <select
                    id="clientes-page-size"
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
                  {selectedIds.size > 0 ? (
                    <span className="font-medium text-blue-700">{selectedIds.size} seleccionados</span>
                  ) : null}
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
                    <label htmlFor="clientes-goto-page" className="whitespace-nowrap text-[11px] font-medium text-slate-600">
                      Ir a
                    </label>
                    <input
                      id="clientes-goto-page"
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

          <p className="mt-2 max-w-2xl text-xs text-slate-500">
            Catálogo:{" "}
            <Link href="/dashboard/productos" className="font-medium text-blue-700 underline">
              Productos
            </Link>
            {" · "}
            <Link href="/dashboard/configuracion/productos" className="font-medium text-blue-700 underline">
              Alta de productos
            </Link>
            .
          </p>
        </section>
      </div>

      {/* Modal listado leads */}
      {pendingModalOpen ? (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clientes-leads-title"
          onClick={() => setPendingModalOpen(false)}
        >
          <div
            className="glass-panel max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/40 px-5 py-4">
              <h2 id="clientes-leads-title" className="text-lg font-semibold text-slate-900">
                Leads pendientes de llamada
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Toca una fila para ver datos y marcar como llamado.
              </p>
            </div>
            <ul className="max-h-[min(60vh,480px)] overflow-y-auto divide-y divide-slate-100">
              {pendingLeads.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-slate-500">No hay pendientes.</li>
              ) : (
                pendingLeads.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setDetailLead(l)}
                      className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-white/40"
                    >
                      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{l.fullName}</p>
                        <p className="text-sm text-slate-600">{l.phone ?? "Sin teléfono"}</p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-white/40 px-5 py-3 text-right">
              <Button type="button" variant="outline" size="sm" onClick={() => setPendingModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal detalle lead */}
      {detailLead ? (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-detail-title"
          onClick={() => setDetailLead(null)}
        >
          <div
            className="glass-panel-strong w-full max-w-md overflow-hidden rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-rose-600 to-rose-800 px-6 py-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100">Lead pendiente</p>
              <h2 id="lead-detail-title" className="mt-2 text-2xl font-bold">
                {detailLead.fullName}
              </h2>
              {detailLead.phone ? (
                <a
                  href={`tel:${detailLead.phone.replace(/\s/g, "")}`}
                  className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight text-white underline decoration-2"
                >
                  <Phone className="h-10 w-10 shrink-0" aria-hidden />
                  {detailLead.phone}
                </a>
              ) : (
                <p className="mt-4 text-rose-100">Sin teléfono registrado</p>
              )}
              {detailLead.email ? (
                <a href={`mailto:${detailLead.email}`} className="mt-3 block break-all text-lg text-rose-50">
                  {detailLead.email}
                </a>
              ) : null}
            </div>
            <div className="px-6 py-4">
              {detailLead.notes ? (
                <p className="text-sm leading-relaxed text-slate-700">{detailLead.notes}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                Alta:{" "}
                {new Date(detailLead.createdAt).toLocaleString("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200/80 bg-slate-50/80 px-6 py-4">
              <Button
                type="button"
                variant="gradient"
                disabled={markingId === detailLead.id}
                onClick={() => void markLeadContacted(detailLead)}
              >
                {markingId === detailLead.id ? "Guardando…" : "Marcar como llamado"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDetailLead(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
