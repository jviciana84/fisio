"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { formatEuroEsWhole } from "@/lib/format-es";
import { cn } from "@/lib/cn";

export function QuarterHealthCard() {
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [taxes, setTaxes] = useState<number | null>(null);
  const [net, setNet] = useState<number | null>(null);
  const [alert, setAlert] = useState(false);
  const [ytdIva, setYtdIva] = useState<number | null>(null);
  const [ytdIrpf, setYtdIrpf] = useState<number | null>(null);
  const [yearLabel, setYearLabel] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/fiscal/summary");
        const data = (await res.json()) as {
          ok?: boolean;
          quarter?: string;
          calendarYear?: number;
          yearProgress?: {
            yearToDate: { ivaEuros: number; irpfEuros: number };
          };
          simulation?: { totalTaxesEuros: number; netAfterTaxesEuros: number; liquidityAlert: boolean };
        };
        if (res.ok && data.ok && data.simulation) {
          setLabel(data.quarter ?? "");
          setTaxes(data.simulation.totalTaxesEuros);
          setNet(data.simulation.netAfterTaxesEuros);
          setAlert(data.simulation.liquidityAlert);
          setYearLabel(data.calendarYear ?? null);
          setYtdIva(data.yearProgress?.yearToDate.ivaEuros ?? null);
          setYtdIrpf(data.yearProgress?.yearToDate.irpfEuros ?? null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="glass-panel glass-tint-amber flex h-full min-h-[200px] flex-col p-5">
        <p className="text-sm text-slate-500">Cargando estado fiscal…</p>
      </section>
    );
  }

  return (
    <section className="glass-panel glass-tint-amber relative flex h-full min-h-0 flex-col rounded-2xl p-6 pt-5 md:p-7 md:pt-6">
      <Link
        href="/dashboard/fiscal"
        title="Abrir simulador fiscal"
        className={cn(
          buttonVariants({ variant: "gradient", size: "sm" }),
          "absolute right-4 top-4 z-10 inline-flex shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-sm md:right-5 md:top-5",
        )}
      >
        Simulador
      </Link>
      <div className="min-w-0 pr-[5.75rem]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Salud del trimestre</p>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-900">Impuestos estimados ({label})</h2>
        <p className="mt-1 text-sm text-slate-600">
          Vista rápida: lo que podrías pagar a Hacienda y el dinero neto orientativo.
        </p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="glass-inner p-4 shadow-sm ring-1 ring-white/45">
          <p className="text-xs uppercase text-slate-500">Hacienda (estim.)</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{taxes != null ? formatEuroEsWhole(taxes) : "—"}</p>
        </div>
        <div className="glass-inner p-4 shadow-sm ring-1 ring-white/45">
          <p className="text-xs uppercase text-slate-500">Dinero limpio (estim.)</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{net != null ? formatEuroEsWhole(net) : "—"}</p>
        </div>
        <div
          className={`rounded-lg p-4 ${
            alert
              ? "glass-inner ring-1 ring-rose-400/45 bg-rose-500/[0.12] shadow-sm"
              : "border border-emerald-300/50 bg-gradient-to-br from-emerald-100/80 via-emerald-50/70 to-teal-50/60 ring-1 ring-emerald-400/35 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)] backdrop-blur-[2px]"
          }`}
        >
          <p className={`text-xs font-semibold uppercase tracking-wide ${alert ? "text-slate-600" : "text-emerald-800/90"}`}>
            Liquidez
          </p>
          <p className={`mt-1 text-sm font-medium ${alert ? "text-slate-800" : "text-emerald-950"}`}>
            {alert ? "Revisa saldo en cuenta oficial" : "Sin alerta de descubierto"}
          </p>
        </div>
      </div>
      {yearLabel != null && (ytdIva != null || ytdIrpf != null) ? (
        <div className="glass-inner mt-4 px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-white/45">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acumulado {yearLabel} (estim.)</p>
          <p className="mt-1">
            IVA acumulado: <span className="font-semibold text-slate-900">{formatEuroEsWhole(ytdIva ?? 0)}</span>
            {" · "}
            IRPF acumulado: <span className="font-semibold text-slate-900">{formatEuroEsWhole(ytdIrpf ?? 0)}</span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
