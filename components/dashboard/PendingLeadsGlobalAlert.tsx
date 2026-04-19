"use client";

import { useCallback, useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const DISMISS_KEY = "fisio_pending_leads_alert_dismissed";

type Lead = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
};

export function PendingLeadsGlobalAlert() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients/pending-leads");
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
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => void load(), 120_000);
    return () => clearInterval(t);
  }, [load]);

  const pendingCount = leads?.length ?? 0;
  const visible = !loading && pendingCount > 0 && !dismissed;

  if (!visible) return null;

  const first = leads![0]!;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex justify-center p-3 sm:p-4"
      role="alert"
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-lg overflow-hidden rounded-xl border-2 border-rose-400/90 bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 p-4 text-white shadow-2xl shadow-rose-900/50",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-100">
              Atención
            </p>
            <p className="mt-1 text-lg font-bold leading-tight">
              {pendingCount === 1
                ? "Hay 1 lead pendiente de llamar"
                : `Hay ${pendingCount} leads pendientes de llamar`}
            </p>
            <p className="mt-1 text-sm text-rose-100">
              Interesados en bono con pago no habilitado en web. Contacta cuanto antes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem(DISMISS_KEY, "1");
              } catch {
                /* ignore */
              }
              setDismissed(true);
            }}
            className="shrink-0 rounded-lg p-1.5 text-rose-100 transition hover:bg-white/10"
            aria-label="Cerrar aviso"
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
          <ul className="mt-3 max-h-[min(50vh,22rem)] space-y-3 overflow-y-auto rounded-lg bg-black/20 p-3">
            {leads!.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-sm"
              >
                <p className="font-semibold text-white">{l.fullName}</p>
                {l.phone ? (
                  <a
                    href={`tel:${l.phone.replace(/\s/g, "")}`}
                    className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-white underline decoration-2 underline-offset-2"
                  >
                    <Phone className="h-7 w-7 shrink-0" aria-hidden />
                    {l.phone}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-rose-100">Sin teléfono</p>
                )}
                {l.email ? (
                  <a
                    href={`mailto:${l.email}`}
                    className="mt-2 block break-all text-base font-medium text-rose-50 underline"
                  >
                    {l.email}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-lg bg-black/20 p-3">
            <p className="text-xs text-rose-100">Último:</p>
            <p className="text-lg font-bold">{first.fullName}</p>
            {first.phone ? (
              <a
                href={`tel:${first.phone.replace(/\s/g, "")}`}
                className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums text-white"
              >
                <Phone className="h-8 w-8" aria-hidden />
                {first.phone}
              </a>
            ) : null}
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
