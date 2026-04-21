"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { playPendingLeadChime } from "@/lib/sound/playPendingLeadChime";

function leadsFingerprint(leads: Lead[]): string {
  return [...leads]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((l) => `${l.id}:${(l.notes ?? "").length}:${l.createdAt}`)
    .join("|");
}

type Lead = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
};

function formatLeadShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

/** Notas del lead en una sola columna compacta (saltos → separador). */
function notesCompactOneBlock(notes: string | null): string {
  if (!notes) return "";
  return notes
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" | ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Columna derecha fija: fecha + metadatos (notas), sin ensanchar el modal. */
function LeadPendingMetaColumn({ createdAt, notes }: { createdAt: string; notes: string | null }) {
  const date = formatLeadShortDate(createdAt);
  const meta = notesCompactOneBlock(notes);
  return (
    <div
      className="flex min-h-0 w-[38%] max-w-[9.75rem] shrink-0 flex-col gap-1 border-l border-white/20 pl-2 text-left"
      aria-label="Resumen del lead"
    >
      {date ? (
        <p className="text-[9px] font-semibold leading-tight text-rose-50/95 tabular-nums">{date}</p>
      ) : null}
      {meta ? (
        <p className="max-h-[5.25rem] min-h-0 overflow-y-auto break-words text-[9px] leading-[1.25] text-rose-100/85 [overflow-wrap:anywhere]">
          {meta}
        </p>
      ) : (
        <p className="text-[9px] leading-tight text-rose-200/55">—</p>
      )}
    </div>
  );
}

/** Tras cerrar el aviso, no se vuelve a mostrar hasta esta fecha (o antes si cambias de página / lista). */
const SUPPRESS_MS = 120_000;

export function PendingLeadsGlobalAlert() {
  const pathname = usePathname();
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);
  /** Si es un instante futuro, el modal está oculto hasta entonces. */
  const [hideUntil, setHideUntil] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const prevAlertVisibleRef = useRef(false);
  const leadsFpRef = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients/pending-leads", { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; leads?: Lead[] };
      if (res.ok && data.ok && data.leads) setLeads(data.leads);
      else setLeads([]);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => void load(), SUPPRESS_MS);
    return () => clearInterval(t);
  }, [load]);

  /** Al navegar: mostrar de nuevo si hay pendientes. */
  useEffect(() => {
    setHideUntil(null);
  }, [pathname]);

  /** Lista de pendientes distinta (nuevo lead, notas…): mostrar ya. */
  useEffect(() => {
    if (leads === null || leads.length === 0) {
      leadsFpRef.current = "";
      return;
    }
    const fp = leadsFingerprint(leads);
    if (leadsFpRef.current !== "" && fp !== leadsFpRef.current) {
      setHideUntil(null);
    }
    leadsFpRef.current = fp;
  }, [leads]);

  /** Ya no hay pendientes: quitar cualquier ocultación. */
  useEffect(() => {
    if ((leads?.length ?? 0) === 0) setHideUntil(null);
  }, [leads]);

  /** Cuando hideUntil pasa a futuro, programar volver a mostrar. */
  useEffect(() => {
    if (hideUntil === null) return;
    const ms = hideUntil - Date.now();
    if (ms <= 0) {
      setHideUntil(null);
      return;
    }
    const t = window.setTimeout(() => setHideUntil(null), ms);
    return () => window.clearTimeout(t);
  }, [hideUntil]);

  const pendingCount = leads?.length ?? 0;
  const hiddenByTimer = hideUntil !== null && Date.now() < hideUntil;
  const visible = !loading && pendingCount > 0 && !hiddenByTimer;

  useEffect(() => {
    if (visible && !prevAlertVisibleRef.current) {
      void playPendingLeadChime();
    }
    prevAlertVisibleRef.current = visible;
  }, [visible]);

  const suppress = useCallback(() => {
    setHideUntil(Date.now() + SUPPRESS_MS);
  }, []);

  if (!visible) return null;

  const first = leads![0]!;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/45 p-4 sm:p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="pending-leads-alert-title"
      onClick={suppress}
    >
      <div
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-2xl border-2 border-rose-400/90 bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 p-4 text-white shadow-2xl shadow-rose-900/55 sm:p-5",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100">
              Atención
            </p>
            <p id="pending-leads-alert-title" className="mt-1 text-lg font-bold leading-tight">
              {pendingCount === 1
                ? "Hay 1 lead pendiente de llamar"
                : `Hay ${pendingCount} leads pendientes de llamar`}
            </p>
            <p className="mt-1 text-sm text-rose-100">
              Interesados en bono con pago no habilitado en web. Contacta cuanto antes.
            </p>
            <p className="mt-2 text-[11px] leading-snug text-rose-100/90">
              Puedes cerrar este aviso; volverá al cambiar de página o pasados 2 minutos mientras quede alguno
              pendiente. Deja de mostrarse cuando marques como llamados en Clientes.
            </p>
          </div>
          <button
            type="button"
            onClick={suppress}
            className="shrink-0 rounded-lg p-1.5 text-rose-100 transition hover:bg-white/10"
            aria-label="Cerrar aviso temporalmente"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-lg bg-white/15 px-3 py-2 text-left text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
        >
          {expanded ? "Ocultar datos de contacto ▲" : "Ver datos de contacto ▼"}
        </button>

        {expanded ? (
          <ul className="mt-3 max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto rounded-lg bg-black/20 p-2.5">
            {leads!.map((l) => (
              <li
                key={l.id}
                className="flex items-start gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 backdrop-blur-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-white">{l.fullName}</p>
                  {l.phone ? (
                    <a
                      href={`tel:${l.phone.replace(/\s/g, "")}`}
                      className="mt-1.5 flex items-center gap-1.5 text-lg font-bold tracking-tight text-white underline decoration-2 underline-offset-2"
                    >
                      <Phone className="h-5 w-5 shrink-0" aria-hidden />
                      {l.phone}
                    </a>
                  ) : (
                    <p className="mt-1.5 text-xs text-rose-100">Sin teléfono</p>
                  )}
                  {l.email ? (
                    <a
                      href={`mailto:${l.email}`}
                      className="mt-1 block break-all text-xs font-medium text-rose-50 underline"
                    >
                      {l.email}
                    </a>
                  ) : null}
                </div>
                <LeadPendingMetaColumn createdAt={l.createdAt} notes={l.notes} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-black/20 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-rose-100">Último:</p>
              <p className="text-lg font-bold leading-tight text-white">{first.fullName}</p>
              {first.phone ? (
                <a
                  href={`tel:${first.phone.replace(/\s/g, "")}`}
                  className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums text-white"
                >
                  <Phone className="h-7 w-7" aria-hidden />
                  {first.phone}
                </a>
              ) : null}
              {first.email ? (
                <a href={`mailto:${first.email}`} className="mt-1 block truncate text-xs text-rose-50 underline">
                  {first.email}
                </a>
              ) : null}
            </div>
            <LeadPendingMetaColumn createdAt={first.createdAt} notes={first.notes} />
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="bg-white text-rose-900 hover:bg-rose-50"
            onClick={() => {
              window.location.href = "/dashboard/clientes";
            }}
          >
            Ir a Clientes
          </Button>
        </div>
      </div>
    </div>
  );
}
