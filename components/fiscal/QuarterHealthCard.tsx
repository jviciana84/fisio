"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { formatEuroEsWhole } from "@/lib/format-es";
import { cn } from "@/lib/cn";

type LiquidityHealth = "critical" | "caution" | "ok" | "unknown";

function resolveLiquidityHealth(
  liquidityAlert: boolean,
  totalTaxesEuros: number,
  officialLiquidityEuros: number,
): LiquidityHealth {
  if (liquidityAlert) return "critical";
  if (totalTaxesEuros <= 0) return "ok";
  const cushion = officialLiquidityEuros - totalTaxesEuros;
  if (cushion < 0) return "critical";
  if (cushion < totalTaxesEuros * 0.2) return "caution";
  return "ok";
}

export function QuarterHealthCard() {
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [taxes, setTaxes] = useState<number | null>(null);
  const [net, setNet] = useState<number | null>(null);
  const [health, setHealth] = useState<LiquidityHealth>("unknown");
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
          settings?: { officialLiquidityEuros?: number };
          simulation?: { totalTaxesEuros: number; netAfterTaxesEuros: number; liquidityAlert: boolean };
        };
        if (res.ok && data.ok && data.simulation) {
          setLabel(data.quarter ?? "");
          setTaxes(data.simulation.totalTaxesEuros);
          setNet(data.simulation.netAfterTaxesEuros);
          setHealth(
            resolveLiquidityHealth(
              data.simulation.liquidityAlert,
              data.simulation.totalTaxesEuros,
              data.settings?.officialLiquidityEuros ?? 0,
            ),
          );
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
      <section className="glass-panel glass-tint-slate flex h-full min-h-[200px] flex-col rounded-2xl p-5 shadow-[0_8px_28px_-10px_rgba(15,23,42,0.18)]">
        <p className="text-sm text-slate-500">Cargando estado fiscal…</p>
      </section>
    );
  }

  const tintClass =
    health === "critical"
      ? "glass-tint-rose"
      : health === "caution" || health === "unknown"
        ? "glass-tint-amber"
        : "glass-tint-emerald";

  const cardAmbientShadow =
    health === "critical"
      ? "shadow-[0_12px_44px_-8px_rgba(225,29,72,0.42),0_6px_20px_-8px_rgba(190,18,60,0.28),0_2px_8px_-2px_rgba(190,18,60,0.2)]"
      : health === "caution" || health === "unknown"
        ? "shadow-[0_12px_44px_-8px_rgba(245,158,11,0.4),0_6px_20px_-8px_rgba(217,119,6,0.26),0_2px_8px_-2px_rgba(180,83,9,0.18)]"
        : "shadow-[0_12px_44px_-8px_rgba(16,185,129,0.36),0_6px_20px_-8px_rgba(5,150,105,0.24),0_2px_8px_-2px_rgba(4,120,87,0.16)]";

  const healthSub =
    health === "critical"
      ? "Riesgo de descubierto: el saldo orientativo no cubre lo estimado a Hacienda."
      : health === "caution"
        ? "Margen ajustado: poco colchón respecto a la carga impositiva del trimestre."
        : health === "ok"
          ? "Colchón orientativo cómodo frente a impuestos estimados."
          : "Vista rápida: lo que podrías pagar a Hacienda y el neto orientativo.";

  const liqBlock =
    health === "critical"
      ? "glass-inner ring-1 ring-rose-500/45 bg-rose-500/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_10px_32px_-6px_rgba(225,29,72,0.55),0_4px_14px_-4px_rgba(190,18,60,0.35)]"
      : health === "caution" || health === "unknown"
        ? "border border-amber-300/60 bg-gradient-to-br from-amber-100/85 via-amber-50/70 to-amber-50/50 ring-1 ring-amber-500/45 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45),0_10px_32px_-6px_rgba(245,158,11,0.5),0_4px_14px_-4px_rgba(217,119,6,0.32)]"
        : "border border-emerald-300/50 bg-gradient-to-br from-emerald-100/80 via-emerald-50/70 to-teal-50/60 ring-1 ring-emerald-500/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_10px_32px_-6px_rgba(16,185,129,0.45),0_4px_14px_-4px_rgba(5,150,105,0.28)]";

  const liqLabel =
    health === "critical"
      ? "text-rose-900/90"
      : health === "caution" || health === "unknown"
        ? "text-amber-950"
        : "text-emerald-800/90";
  const liqText =
    health === "critical"
      ? "text-rose-950"
      : health === "caution" || health === "unknown"
        ? "text-amber-950"
        : "text-emerald-950";
  const liqMessage =
    health === "critical"
      ? "Saldo en cuenta oficial insuficiente"
      : health === "caution"
        ? "Refuerza colchón o revisa importes"
        : health === "unknown"
          ? "Abre el simulador para evaluar liquidez"
          : "Cubre la carga fiscal estimada";

  return (
    <section
      className={cn(
        "glass-panel relative flex h-full min-h-0 flex-col rounded-2xl p-6 pt-5 md:p-7 md:pt-6",
        tintClass,
        cardAmbientShadow,
      )}
    >
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Salud del trimestre</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Impuestos estimados ({label})</h2>
        <p className="mt-1 max-w-xl text-xs text-slate-600">{healthSub}</p>
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
        <div className={cn("rounded-lg p-4 backdrop-blur-[1px]", liqBlock)}>
          <p className={cn("text-xs font-semibold uppercase tracking-wide", liqLabel)}>Liquidez</p>
          <p className={cn("mt-1 text-sm font-medium", liqText)}>{liqMessage}</p>
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
