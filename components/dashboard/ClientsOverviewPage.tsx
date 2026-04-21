"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import {
  type ChartRange,
  RANGE_LABELS,
  RANGE_ORDER,
  RANGE_SHORT,
  buildNewClientsBuckets,
  formatIncomeRangeLabel,
  maxNewClientBucketCount,
} from "@/lib/dashboard/trendChartData";
import { ClientDetailModal } from "@/components/dashboard/ClientDetailModal";
import { DashboardAddFabButton } from "@/components/dashboard/DashboardAddFabButton";
import { DASHBOARD_INPUT_CLASS_FORM } from "@/components/dashboard/dashboard-ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Mismo lenguaje que `DashboardSidebar`: icono lineal en caja suave. */
function SidebarStylePhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function SidebarStyleBarsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

/** Documento / consentimiento — estilo sidebar */
function SidebarStyleDocIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 13h8M10 17h8M10 9h4" />
    </svg>
  );
}

type ClientRow = {
  id: string;
  clientCode: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt?: string;
  estadoPago: string | null;
  leadContactedAt: string | null;
  origenCliente: string | null;
  rgpdConsentAt: string | null;
  rgpdConsentVersion: string | null;
};

type PendingLead = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
};

type PendingRgpd = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
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
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>("month");

  const [pendingLeads, setPendingLeads] = useState<PendingLead[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<PendingLead | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const [pendingRgpd, setPendingRgpd] = useState<PendingRgpd[]>([]);
  const [pendingRgpdLoading, setPendingRgpdLoading] = useState(true);
  const [rgpdModalOpen, setRgpdModalOpen] = useState(false);
  const [detailRgpd, setDetailRgpd] = useState<PendingRgpd | null>(null);
  const [rgpdVersionDraft, setRgpdVersionDraft] = useState("");
  const [markingRgpdId, setMarkingRgpdId] = useState<string | null>(null);

  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [ccName, setCcName] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [ccPhone, setCcPhone] = useState("");
  const [ccNotes, setCcNotes] = useState("");
  const [ccSaving, setCcSaving] = useState(false);

  const openCreateClientModal = () => {
    setMessage(null);
    setCcName("");
    setCcEmail("");
    setCcPhone("");
    setCcNotes("");
    setCreateClientOpen(true);
  };

  const loadClients = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/clients", { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; clients?: ClientRow[]; message?: string };
      if (!res.ok || !data.ok || !Array.isArray(data.clients)) {
        setMessage({ type: "err", text: data.message ?? "No se pudieron cargar los clientes." });
        setClients([]);
        return;
      }
      setClients(
        data.clients.map((c) => ({
          ...c,
          origenCliente: c.origenCliente ?? null,
          rgpdConsentAt: c.rgpdConsentAt ?? null,
          rgpdConsentVersion: c.rgpdConsentVersion ?? null,
        })),
      );
    } catch {
      setMessage({ type: "err", text: "Error de red al cargar clientes." });
      setClients([]);
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

  const loadPendingRgpd = useCallback(async () => {
    setPendingRgpdLoading(true);
    try {
      const res = await fetch("/api/admin/clients/pending-rgpd");
      const data = (await res.json()) as { ok?: boolean; pending?: PendingRgpd[] };
      if (res.ok && data.ok && data.pending) setPendingRgpd(data.pending);
      else setPendingRgpd([]);
    } catch {
      setPendingRgpd([]);
    } finally {
      setPendingRgpdLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
    void loadPending();
    void loadPendingRgpd();
  }, [loadClients, loadPending, loadPendingRgpd]);

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
    setDetailClientId(null);
  }, [page, search]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const clientsForChart = useMemo(
    () =>
      clients.filter((c) => {
        if (!c.createdAt) return false;
        const t = new Date(c.createdAt).getTime();
        return Number.isFinite(t) && t > 86400000;
      }),
    [clients],
  );

  const chartBuckets = useMemo(
    () => buildNewClientsBuckets(chartRange, clientsForChart.map((c) => ({ created_at: c.createdAt! }))),
    [clientsForChart, chartRange],
  );
  const chartMax = useMemo(() => maxNewClientBucketCount(chartBuckets), [chartBuckets]);

  const pendingCount = pendingLeads.length;
  const leadsOk = !pendingLoading && pendingCount === 0;
  /** Hay llamadas pendientes: tarjeta en tono de alerta (rojo), no verde. */
  const leadsUrgent = !pendingLoading && pendingCount > 0;
  const pendingRgpdCount = pendingRgpd.length;
  const rgpdOk = !pendingRgpdLoading && pendingRgpdCount === 0;

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

  async function markRgpdConsent(p: PendingRgpd) {
    setMarkingRgpdId(p.id);
    setMessage(null);
    const version = rgpdVersionDraft.trim();
    try {
      const res = await fetch(`/api/admin/clients/${p.id}/rgpd-consent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(version ? { version } : {}),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setMessage({ type: "err", text: data.message ?? "No se pudo registrar el consentimiento." });
        return;
      }
      setDetailRgpd(null);
      setRgpdVersionDraft("");
      setRgpdModalOpen(false);
      await loadPendingRgpd();
      await loadClients();
      setMessage({ type: "ok", text: "Consentimiento informado registrado." });
    } catch {
      setMessage({ type: "err", text: "Error de red." });
    } finally {
      setMarkingRgpdId(null);
    }
  }

  async function submitCreateClient(e: FormEvent) {
    e.preventDefault();
    const name = ccName.trim();
    if (name.length < 2) return;
    setCcSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fullName: name,
          email: ccEmail.trim() || undefined,
          phone: ccPhone.trim() || undefined,
          notes: ccNotes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; message?: string };
      if (!res.ok || !data.ok || !data.id) {
        setMessage({ type: "err", text: data.message ?? "No se pudo crear el cliente." });
        return;
      }
      setCreateClientOpen(false);
      setMessage({ type: "ok", text: "Cliente creado. Abriendo la ficha…" });
      await loadClients();
      setDetailClientId(data.id);
    } catch {
      setMessage({ type: "err", text: "Error de red al crear el cliente." });
    } finally {
      setCcSaving(false);
    }
  }

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {message?.type === "err" && clients.length === 0 && !loading ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50 via-white to-amber-50/40 px-4 py-4 shadow-md ring-1 ring-rose-200/50">
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-rose-950">{message.text}</p>
            <Button type="button" variant="gradient" size="sm" className="shrink-0" onClick={() => void loadClients()}>
              Reintentar carga
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-stretch">
          <div className="flex min-h-[320px] flex-col gap-4 lg:h-full">
            {/* Leads — ~50% alto de la columna */}
            <button
              type="button"
              onClick={() => setPendingModalOpen(true)}
              className={cn(
                "group relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl text-left backdrop-blur-xl transition",
                leadsUrgent
                  ? cn(
                      "border border-rose-300/70 bg-white/40 shadow-[0_12px_40px_-8px_rgba(190,18,60,0.22)] ring-1 ring-rose-200/60",
                      "hover:border-rose-400/85 hover:shadow-[0_18px_44px_-8px_rgba(190,18,60,0.28)]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/45",
                    )
                  : cn(
                      "border border-emerald-200/55 bg-white/35 shadow-[0_12px_40px_-8px_rgba(5,150,105,0.14)] ring-1 ring-emerald-100/50",
                      "hover:border-emerald-300/70 hover:shadow-[0_18px_44px_-8px_rgba(5,150,105,0.18)]",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
                    ),
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-90",
                  leadsUrgent
                    ? "bg-gradient-to-br from-rose-500/22 via-rose-400/8 to-transparent"
                    : "bg-gradient-to-br from-emerald-500/18 via-teal-500/6 to-transparent",
                )}
                aria-hidden
              />
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div
                  className={cn(
                    "border-b px-5 py-3",
                    leadsUrgent ? "border-rose-200/60" : "border-emerald-100/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1",
                        leadsUrgent
                          ? "bg-rose-500/15 text-rose-800 ring-rose-300/50"
                          : "bg-emerald-500/12 text-emerald-800 ring-emerald-200/45",
                      )}
                    >
                      <SidebarStylePhoneIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.16em]",
                          leadsUrgent ? "text-rose-700" : "text-emerald-700",
                        )}
                      >
                        Seguimiento
                      </p>
                      <h2 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">Leads pendientes</h2>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-600">Bonos web, pago no habilitado.</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                        leadsOk
                          ? "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
                          : "bg-rose-50 text-rose-900 ring-rose-200/80",
                      )}
                    >
                      {pendingLoading ? "…" : leadsOk ? "Al día" : "Pendiente"}
                    </span>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-5 py-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <span
                      className={cn(
                        "text-3xl font-bold tabular-nums tracking-tight",
                        leadsUrgent ? "text-rose-950" : "text-emerald-950",
                      )}
                    >
                      {pendingLoading ? "—" : pendingCount}
                    </span>
                    <span
                      className={cn(
                        "pb-0.5 text-[11px] font-medium",
                        leadsUrgent ? "text-rose-800/90" : "text-emerald-800/80",
                      )}
                    >
                      llamadas
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {leadsOk ? "Nadie esperando llamada." : "Prioriza el teléfono."}
                  </p>
                  <p
                    className={cn(
                      "mt-auto border-t pt-2 text-xs font-medium underline-offset-2 group-hover:underline",
                      leadsUrgent ? "border-rose-200/65 text-rose-800" : "border-emerald-100/60 text-emerald-800",
                    )}
                  >
                    Abrir listado
                  </p>
                </div>
              </div>
            </button>

            {/* RGPD — ~50% alto; consentimiento informado pendiente de registrar */}
            <button
              type="button"
              onClick={() => setRgpdModalOpen(true)}
              className={cn(
                "group relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl text-left",
                "border border-violet-200/55 bg-white/35 shadow-[0_12px_40px_-8px_rgba(109,40,217,0.12)] backdrop-blur-xl ring-1 ring-violet-100/50",
                "transition hover:border-violet-300/70 hover:shadow-[0_18px_44px_-8px_rgba(109,40,217,0.16)]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40",
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/14 via-fuchsia-500/5 to-transparent opacity-90"
                aria-hidden
              />
              <div className="relative flex min-h-0 flex-1 flex-col">
                <div className="border-b border-violet-100/50 px-5 py-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-900 shadow-sm ring-1 ring-violet-200/45">
                      <SidebarStyleDocIcon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Protección de datos</p>
                      <h2 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">Consentimiento informado</h2>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-600">RGPD: registrar en clínica quién firmó.</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                        rgpdOk
                          ? "bg-emerald-50 text-emerald-900 ring-emerald-200/80"
                          : "bg-amber-50 text-amber-950 ring-amber-200/80",
                      )}
                    >
                      {pendingRgpdLoading ? "…" : rgpdOk ? "Al día" : "Pendiente"}
                    </span>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-5 py-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <span className="text-3xl font-bold tabular-nums tracking-tight text-violet-950">
                      {pendingRgpdLoading ? "—" : pendingRgpdCount}
                    </span>
                    <span className="pb-0.5 text-[11px] font-medium text-violet-800/85">sin registrar</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {rgpdOk
                      ? "Todos los activos tienen fecha de registro."
                      : "Registra fecha (y versión del texto) para trazabilidad."}
                  </p>
                  <p className="mt-auto border-t border-violet-100/60 pt-2 text-xs font-medium text-violet-900 underline-offset-2 group-hover:underline">
                    Abrir listado y registrar
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Nuevos clientes — misma altura que la columna izquierda */}
          <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl border border-white/70 bg-white/35 shadow-[0_12px_40px_-8px_rgba(30,64,175,0.12)] ring-1 ring-white/55 backdrop-blur-xl">
            <div className="border-b border-white/45 px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/35 text-blue-800 shadow-sm ring-1 ring-white/40">
                  <SidebarStyleBarsIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Altas</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Nuevos clientes</h2>
                  <p className="mt-1 text-xs leading-snug text-slate-600">Registros nuevos en la base según el periodo.</p>
                </div>
                <span className="invisible shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1" aria-hidden>
                  ·
                </span>
              </div>
            </div>

            <div className="border-b border-white/35 px-6 py-3">
              <div
                className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-white/45 p-1.5 ring-1 ring-white/50"
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
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition sm:text-[11px] ${
                      chartRange === k
                        ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40"
                        : "text-slate-600 hover:bg-white/80"
                    }`}
                  >
                    {RANGE_SHORT[k]}
                  </button>
                ))}
                <span
                  className="ml-auto max-w-[min(100%,12rem)] truncate text-[10px] text-slate-500 sm:text-[11px]"
                  title={formatIncomeRangeLabel(chartRange)}
                >
                  {formatIncomeRangeLabel(chartRange)}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-6 py-5">
              <div className="flex h-[200px] min-h-[160px] flex-1 items-end gap-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {chartBuckets.map((b, i) => {
                  const hPct = chartMax > 0 ? Math.max(8, (b.count / chartMax) * 100) : 0;
                  return (
                    <div
                      key={`${chartRange}-${i}-${b.label}`}
                      className="flex min-w-[1.85rem] flex-1 flex-col items-center gap-1.5"
                      title={`${b.label}: ${b.count}`}
                    >
                      <div className="flex h-[150px] w-full items-end justify-center px-0.5">
                        <div
                          className="w-[85%] max-w-[2.75rem] rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-500 shadow-sm ring-1 ring-white/35"
                          style={{ height: `${hPct}%` }}
                        />
                      </div>
                      <span className="max-w-[4.5rem] truncate text-center text-[9px] font-medium text-slate-600 sm:text-[10px]">
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
              Personas registradas para caja y reservas. Clic en una fila para abrir la ficha (datos, bono y tickets). La
              columna RGPD indica si consta el consentimiento informado registrado en clínica.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <DashboardAddFabButton icon={UserPlus} label="Añadir cliente" onClick={openCreateClientModal} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en la tabla…"
              className="w-full min-w-[12rem] max-w-md flex-1 rounded-xl border border-slate-200/80 bg-white/75 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {message && (message.type === "ok" || clients.length > 0) ? (
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
              <table className="min-w-[820px] w-full text-left text-sm">
                <thead className="bg-slate-100/85 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-3">Nombre</th>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Teléfono</th>
                    <th className="px-3 py-3">Alta</th>
                    <th className="whitespace-nowrap px-3 py-3" title="Captación: web o clínica">
                      Origen
                    </th>
                    <th className="whitespace-nowrap px-3 py-3" title="Consentimiento informado (RGPD) registrado en clínica">
                      RGPD
                    </th>
                    <th className="px-3 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-8 text-slate-500" colSpan={8}>
                        Cargando clientes…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-slate-500" colSpan={8}>
                        {clients.length === 0 ? "No hay clientes activos." : "Ningún resultado para la búsqueda."}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((c) => (
                      <tr
                        key={c.id}
                        aria-label={`Cliente ${c.fullName}`}
                        onClick={(e) => {
                          const t = e.target as HTMLElement;
                          if (t.closest("button, input, select, textarea, label, a")) return;
                          setDetailClientId(c.id);
                        }}
                        className="cursor-pointer align-top border-b border-slate-100/90 transition-colors last:border-0 hover:bg-white/50"
                      >
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
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-700">
                          {c.origenCliente === "internet"
                            ? "Web"
                            : c.origenCliente === "fisico"
                              ? "Clínica"
                              : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">
                          {c.rgpdConsentAt ? (
                            <span className="text-slate-700" title={c.rgpdConsentVersion ?? "Consentimiento registrado"}>
                              {new Date(c.rgpdConsentAt).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                year: "2-digit",
                              })}
                              {c.rgpdConsentVersion ? (
                                <span className="ml-1 text-[10px] text-slate-500">({c.rgpdConsentVersion})</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-900 ring-1 ring-amber-200/80">
                              Pendiente
                            </span>
                          )}
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

      {/* Modal listado leads — mismo criterio que Gastos/Ingresos */}
      {pendingModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clientes-leads-title"
          onClick={() => setPendingModalOpen(false)}
        >
          <div
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
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
                      className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
                        <SidebarStylePhoneIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{l.fullName}</p>
                        <p className="text-sm text-slate-600">{l.phone ?? "Sin teléfono"}</p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-slate-200 px-5 py-3 text-right">
              <Button type="button" variant="outline" size="sm" onClick={() => setPendingModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal detalle lead — encima del listado, mismo estilo caja blanca */}
      {detailLead ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-detail-title"
          onClick={() => setDetailLead(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">Lead pendiente</p>
            <h2 id="lead-detail-title" className="mt-1 text-lg font-semibold text-slate-900">
              {detailLead.fullName}
            </h2>

            {detailLead.phone ? (
              <a
                href={`tel:${detailLead.phone.replace(/\s/g, "")}`}
                className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-semibold tabular-nums text-slate-900 underline-offset-2 hover:bg-slate-100 hover:underline"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-800 shadow-sm ring-1 ring-slate-200/80">
                  <SidebarStylePhoneIcon />
                </span>
                {detailLead.phone}
              </a>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Sin teléfono registrado
              </p>
            )}

            {detailLead.email ? (
              <a
                href={`mailto:${detailLead.email}`}
                className="mt-3 block break-all text-sm font-medium text-blue-700 underline-offset-2 hover:underline"
              >
                {detailLead.email}
              </a>
            ) : null}

            {detailLead.notes ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-700">{detailLead.notes}</p>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">
              Alta:{" "}
              {new Date(detailLead.createdAt).toLocaleString("es-ES", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
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

      {/* Modal listado RGPD */}
      {rgpdModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clientes-rgpd-title"
          onClick={() => setRgpdModalOpen(false)}
        >
          <div
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="clientes-rgpd-title" className="text-lg font-semibold text-slate-900">
                Consentimiento informado pendiente
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Clientes activos sin fecha de registro en clínica. Elige una fila para registrar la firma y, si quieres, la
                versión del texto entregado.
              </p>
            </div>
            <ul className="max-h-[min(60vh,480px)] overflow-y-auto divide-y divide-slate-100">
              {pendingRgpd.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-slate-500">No hay pendientes.</li>
              ) : (
                pendingRgpd.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailRgpd(p);
                        setRgpdVersionDraft("");
                      }}
                      className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800 ring-1 ring-violet-200/80">
                        <SidebarStyleDocIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{p.fullName}</p>
                        <p className="text-sm text-slate-600">{p.phone ?? p.email ?? "—"}</p>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-slate-200 px-5 py-3 text-right">
              <Button type="button" variant="outline" size="sm" onClick={() => setRgpdModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal detalle RGPD */}
      {detailRgpd ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rgpd-detail-title"
          onClick={() => {
            setDetailRgpd(null);
            setRgpdVersionDraft("");
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Consentimiento informado</p>
            <h2 id="rgpd-detail-title" className="mt-1 text-lg font-semibold text-slate-900">
              {detailRgpd.fullName}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Al confirmar se guarda la <strong className="font-medium text-slate-800">fecha y hora</strong> del registro (servidor)
              como prueba de que la persona fue informada según el procedimiento de la clínica.
            </p>
            <div className="mt-4">
              <label htmlFor="rgpd-version" className="text-xs font-medium text-slate-600">
                Versión del texto de privacidad (opcional)
              </label>
              <input
                id="rgpd-version"
                value={rgpdVersionDraft}
                onChange={(e) => setRgpdVersionDraft(e.target.value)}
                placeholder="Ej. v2025-04"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Alta en sistema:{" "}
              {new Date(detailRgpd.createdAt).toLocaleString("es-ES", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="gradient"
                disabled={markingRgpdId === detailRgpd.id}
                onClick={() => void markRgpdConsent(detailRgpd)}
              >
                {markingRgpdId === detailRgpd.id ? "Guardando…" : "Registrar consentimiento"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDetailRgpd(null);
                  setRgpdVersionDraft("");
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {createClientOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-client-title"
        >
          <div className="max-h-[min(90vh,36rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 id="create-client-title" className="text-lg font-semibold text-slate-900">
              Nuevo cliente
            </h3>
            <p className="mt-1 text-sm text-slate-600">Datos básicos; luego podrás completar la ficha (bono, RGPD, etc.).</p>
            <form onSubmit={(e) => void submitCreateClient(e)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="cc-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  id="cc-name"
                  value={ccName}
                  onChange={(e) => setCcName(e.target.value)}
                  className={DASHBOARD_INPUT_CLASS_FORM}
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cc-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email <span className="font-normal text-slate-500">(opcional)</span>
                  </label>
                  <input
                    id="cc-email"
                    type="email"
                    value={ccEmail}
                    onChange={(e) => setCcEmail(e.target.value)}
                    className={DASHBOARD_INPUT_CLASS_FORM}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="cc-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Teléfono <span className="font-normal text-slate-500">(opcional)</span>
                  </label>
                  <input
                    id="cc-phone"
                    type="tel"
                    value={ccPhone}
                    onChange={(e) => setCcPhone(e.target.value)}
                    className={DASHBOARD_INPUT_CLASS_FORM}
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cc-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Notas <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="cc-notes"
                  value={ccNotes}
                  onChange={(e) => setCcNotes(e.target.value)}
                  rows={3}
                  className={`${DASHBOARD_INPUT_CLASS_FORM} resize-y`}
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCreateClientOpen(false)} disabled={ccSaving}>
                  Cancelar
                </Button>
                <Button type="submit" variant="gradient" size="sm" disabled={ccSaving || ccName.trim().length < 2}>
                  {ccSaving ? "Guardando…" : "Crear cliente"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailClientId ? (
        <ClientDetailModal
          clientId={detailClientId}
          onClose={() => setDetailClientId(null)}
          onSaved={() => void loadClients()}
        />
      ) : null}
    </main>
  );
}
