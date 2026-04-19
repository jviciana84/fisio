"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/cn";
import { formatEuroEsWhole } from "@/lib/format-es";

type ChartRow = {
  monthKey: string;
  realEuros: number;
  officialEuros: number;
  cashEuros: number;
  bizumEuros: number;
  cardEuros: number;
};

type Sim = {
  declareCashPercent: number;
  realTotalEuros: number;
  officialSalesEuros: number;
  ivaToPayEuros: number;
  irpfEuros: number;
  model115Euros: number;
  totalTaxesEuros: number;
  netAfterTaxesEuros: number;
  cashPocketEuros: number;
  liquidityAlert: boolean;
  liquidityGapEuros: number;
};

type Settings = {
  declareCashPercent: number;
  rentIsLeased: boolean;
  monthlyRentEuros: number;
  officialLiquidityEuros: number;
  salesIncludeVat: boolean;
  salesVatRatePercent: number;
  useVatOnSales: boolean;
  expenseVatRecoverablePercent: number;
};

type QuarterRow = {
  quarter: number;
  label: string;
  ivaEuros: number;
  irpfEuros: number;
  model115Euros: number;
  totalTaxesEuros: number;
};

type YearProgress = {
  quarterly: QuarterRow[];
  yearToDate: {
    ivaEuros: number;
    irpfEuros: number;
    model115Euros: number;
    totalTaxesEuros: number;
    throughQuarter: number;
  };
  annualEstimate: {
    ivaEuros: number;
    irpfEuros: number;
    model115Euros: number;
    totalTaxesEuros: number;
  };
};

export function FiscalSimulatorClient() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [quarter, setQuarter] = useState("");
  const [chart, setChart] = useState<ChartRow[]>([]);
  const [sim, setSim] = useState<Sim | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [calendarYear, setCalendarYear] = useState<number | null>(null);
  const [currentQuarter, setCurrentQuarter] = useState<number | null>(null);
  const [yearProgress, setYearProgress] = useState<YearProgress | null>(null);

  const [sliderPct, setSliderPct] = useState([60]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/fiscal/summary");
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        quarter?: string;
        chart?: ChartRow[];
        simulation?: Sim;
        settings?: Settings;
        calendarYear?: number;
        currentQuarter?: number;
        yearProgress?: YearProgress;
      };
      if (!res.ok || !data.ok) {
        setErr(data.message ?? "No se pudo cargar el simulador");
        return;
      }
      setQuarter(data.quarter ?? "");
      setChart(data.chart ?? []);
      setSim(data.simulation ?? null);
      setSettings(data.settings ?? null);
      setCalendarYear(data.calendarYear ?? null);
      setCurrentQuarter(data.currentQuarter ?? null);
      setYearProgress(data.yearProgress ?? null);
      if (data.settings?.declareCashPercent != null) {
        setSliderPct([data.settings.declareCashPercent]);
      }
    } catch {
      setErr("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persistSlider = useCallback(async (value: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/fiscal/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declareCashPercent: value }),
      });
      const data = (await res.json()) as { ok?: boolean; settings?: Settings };
      if (res.ok && data.ok && data.settings) {
        setSettings(data.settings);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }, [load]);

  const maxBar = useMemo(() => {
    let m = 1;
    for (const r of chart) {
      m = Math.max(m, r.realEuros, r.officialEuros);
    }
    return m;
  }, [chart]);

  const maxQuarterTax = useMemo(() => {
    let m = 1;
    for (const q of yearProgress?.quarterly ?? []) {
      m = Math.max(m, q.ivaEuros + q.irpfEuros, q.totalTaxesEuros);
    }
    return m;
  }, [yearProgress]);

  if (loading && !sim) {
    return (
      <main className="p-6 md:p-8">
        <p className="text-slate-600">Cargando simulador…</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="p-6 md:p-8">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">{err}</p>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Hacienda · Simulación</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Tu dinero y lo que declaras
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Compara lo que entra en caja (efectivo, Bizum y tarjeta) con lo que simulas como ingreso oficial.
            El efectivo puedes ajustar con la barra: cuanto más declares, más suben los impuestos estimados.
          </p>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Orientación informativa. No sustituye asesoramiento fiscal. Criterios reales dependen de tu actividad,
            exenciones y facturas.
          </p>
        </header>

        <section className="glass-panel-strong glass-tint-blue grid gap-6 p-6 md:grid-cols-2 md:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">La hucha de efectivo</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">¿Qué parte del efectivo “blanqueas”?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Bizum y tarjeta se consideran ya trazables al 100% en esta simulación. Solo el efectivo se ajusta con el
              porcentaje.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Efectivo declarado</span>
                <span className="font-mono text-lg font-bold text-blue-700">{sliderPct[0]}%</span>
              </div>
              <Slider
                value={sliderPct}
                onValueChange={setSliderPct}
                onValueCommit={(v) => void persistSlider(v[0] ?? 60)}
                min={0}
                max={100}
                aria-label="Porcentaje de efectivo a declarar"
              />
              <p className="text-xs text-slate-500">
                {saving ? "Guardando…" : "Suelta la barra para recalcular."}
              </p>
            </div>
          </div>

          {sim ? (
            <div className="glass-inner p-5 ring-1 ring-white/55 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Si declaras el {sim.declareCashPercent}% del efectivo…
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                Hacienda (estim. trim. {quarter}): {formatEuroEsWhole(sim.totalTaxesEuros)}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Dinero limpio después de impuestos (todo lo cobrado − impuestos):{" "}
                <span className="font-semibold text-emerald-700">{formatEuroEsWhole(sim.netAfterTaxesEuros)}</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
                <li>IVA (modelo 303 aprox.): {formatEuroEsWhole(sim.ivaToPayEuros)}</li>
                <li>IRPF fraccionado (20% sobre beneficio estimado): {formatEuroEsWhole(sim.irpfEuros)}</li>
                <li>Retención alquiler (modelo 115, si aplica): {formatEuroEsWhole(sim.model115Euros)}</li>
                <li>Efectivo no declarado en simulación: {formatEuroEsWhole(sim.cashPocketEuros)}</li>
              </ul>
            </div>
          ) : null}
        </section>

        {sim?.liquidityAlert ? (
          <div
            role="alert"
            className="glass-inner rounded-lg border border-rose-300/60 bg-gradient-to-br from-rose-100/90 to-rose-50/70 px-5 py-4 text-sm text-rose-900 ring-1 ring-rose-200/50"
          >
            <p className="font-semibold">Atención: liquidez</p>
            <p className="mt-1">
              Los impuestos previstos superan el saldo orientativo en cuenta oficial (
              {formatEuroEsWhole(settings?.officialLiquidityEuros ?? 0)}). Falta aprox. {formatEuroEsWhole(sim.liquidityGapEuros)} para cubrir el
              pago sin entrar en descubierto, o bien reduce gastos / anticipa ingresos declarados.
            </p>
          </div>
        ) : null}

        {yearProgress && calendarYear != null && currentQuarter != null ? (
          <section className="glass-panel glass-tint-violet p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Año {calendarYear}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  IVA e IRPF: cómo va el año
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Suma orientativa por trimestre (IVA 303 e IRPF en pagos fraccionados ~20%). El acumulado incluye
                  solo los trimestres ya transcurridos (hasta T{currentQuarter}). La estimación anual suma los cuatro
                  trimestres con los datos que tienes ahora en caja y gastos.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="glass-inner border border-blue-200/45 bg-gradient-to-br from-blue-50/90 to-cyan-50/40 p-5 ring-1 ring-blue-200/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                  Acumulado año (hasta T{yearProgress.yearToDate.throughQuarter})
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  IVA (303) acumulado:{" "}
                  <span className="font-semibold text-slate-900">{formatEuroEsWhole(yearProgress.yearToDate.ivaEuros)}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  IRPF fraccionado (130) acumulado:{" "}
                  <span className="font-semibold text-slate-900">{formatEuroEsWhole(yearProgress.yearToDate.irpfEuros)}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Retención alquiler (115) acumulada:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatEuroEsWhole(yearProgress.yearToDate.model115Euros)}
                  </span>
                </p>
                <p className="mt-3 border-t border-blue-200/80 pt-3 text-sm font-semibold text-slate-900">
                  Total impuestos acumulados: {formatEuroEsWhole(yearProgress.yearToDate.totalTaxesEuros)}
                </p>
              </div>

              <div className="glass-inner border border-slate-200/55 bg-gradient-to-br from-white/85 to-slate-50/50 p-5 ring-1 ring-white/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Estimación año completo (T1 + T2 + T3 + T4)
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  IVA anual estimado:{" "}
                  <span className="font-semibold text-slate-900">{formatEuroEsWhole(yearProgress.annualEstimate.ivaEuros)}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  IRPF anual estimado:{" "}
                  <span className="font-semibold text-slate-900">{formatEuroEsWhole(yearProgress.annualEstimate.irpfEuros)}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Retención 115 anual estimada:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatEuroEsWhole(yearProgress.annualEstimate.model115Euros)}
                  </span>
                </p>
                <p className="mt-3 border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
                  Total impuestos estimado (año): {formatEuroEsWhole(yearProgress.annualEstimate.totalTaxesEuros)}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-medium text-slate-800">Por trimestre (visual rápido)</p>
              <div className="mt-4 overflow-x-auto">
                <div className="flex min-w-[520px] items-end gap-3" style={{ height: 200 }}>
                  {yearProgress.quarterly.map((q) => {
                    const isPast = q.quarter <= currentQuarter;
                    const hIva = maxQuarterTax > 0 ? (q.ivaEuros / maxQuarterTax) * 100 : 0;
                    const hIrpf = maxQuarterTax > 0 ? (q.irpfEuros / maxQuarterTax) * 100 : 0;
                    return (
                      <div
                        key={q.label}
                        className={cn(
                          "flex flex-1 flex-col items-center gap-2",
                          !isPast && "opacity-60",
                        )}
                      >
                        <div className="flex h-[150px] w-full items-end justify-center gap-1">
                          <div
                            className="w-2/5 rounded-t-md bg-violet-500/90"
                            style={{ height: `${hIva}%`, minHeight: q.ivaEuros > 0 ? 4 : 0 }}
                            title={`IVA ${formatEuroEsWhole(q.ivaEuros)}`}
                          />
                          <div
                            className="w-2/5 rounded-t-md bg-amber-500/90"
                            style={{ height: `${hIrpf}%`, minHeight: q.irpfEuros > 0 ? 4 : 0 }}
                            title={`IRPF ${formatEuroEsWhole(q.irpfEuros)}`}
                          />
                        </div>
                        <span className="text-center text-[11px] font-medium text-slate-600">{q.label}</span>
                        <span className="text-[10px] text-slate-500">{formatEuroEsWhole(q.totalTaxesEuros)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-violet-500" /> IVA (303)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-amber-500" /> IRPF (130)
                </span>
                <span className="text-slate-500">Importe debajo = total trimestre (incl. 115)</span>
              </div>
            </div>

            <div className="glass-inner mt-6 overflow-x-auto rounded-lg border border-slate-200/60 bg-white/45">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Trimestre</th>
                    <th className="px-4 py-3 text-right">IVA (303)</th>
                    <th className="px-4 py-3 text-right">IRPF (130)</th>
                    <th className="px-4 py-3 text-right">115 alquiler</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearProgress.quarterly.map((q) => (
                    <tr
                      key={q.quarter}
                      className={q.quarter > currentQuarter ? "text-slate-400" : "text-slate-800"}
                    >
                      <td className="px-4 py-3 font-medium">{q.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatEuroEsWhole(q.ivaEuros)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatEuroEsWhole(q.irpfEuros)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatEuroEsWhole(q.model115Euros)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatEuroEsWhole(q.totalTaxesEuros)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="glass-panel glass-tint-slate p-6 md:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Ingresos mes a mes (últimos meses)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Barras: total cobrado (real) frente a ingreso simulado como oficial.
          </p>
          <div className="mt-6 overflow-x-auto">
            <div className="flex min-w-[640px] items-end gap-2" style={{ height: 220 }}>
              {chart.map((row) => (
                <div key={row.monthKey} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-[180px] w-full items-end justify-center gap-1">
                    <div
                      className="w-1/2 rounded-t-md bg-blue-400/90"
                      style={{ height: `${(row.realEuros / maxBar) * 100}%`, minHeight: row.realEuros > 0 ? 4 : 0 }}
                      title={`Real ${formatEuroEsWhole(row.realEuros)}`}
                    />
                    <div
                      className="w-1/2 rounded-t-md bg-emerald-500/90"
                      style={{
                        height: `${(row.officialEuros / maxBar) * 100}%`,
                        minHeight: row.officialEuros > 0 ? 4 : 0,
                      }}
                      title={`Oficial simulado ${formatEuroEsWhole(row.officialEuros)}`}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{row.monthKey.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-blue-400" /> Ingresos reales (caja)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-500" /> Ingresos oficial simulado
            </span>
          </div>
        </section>

        <section className="glass-panel glass-tint-emerald p-6 md:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Ajustes de simulación</h2>
          <p className="mt-1 text-sm text-slate-600">
            Saldo en cuenta “oficial” para alertas, alquiler (retención 19%) e IVA en ventas.
          </p>
          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void (async () => {
                setSaving(true);
                try {
                  const res = await fetch("/api/admin/fiscal/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      officialLiquidityEuros: Number(fd.get("liq")),
                      monthlyRentEuros: Number(fd.get("rent")),
                      rentIsLeased: fd.get("leased") === "on",
                      useVatOnSales: fd.get("vatSales") === "on",
                      salesVatRatePercent: Number(fd.get("vatRate")),
                      expenseVatRecoverablePercent: Number(fd.get("vatRec")),
                    }),
                  });
                  if (res.ok) await load();
                } finally {
                  setSaving(false);
                }
              })();
            }}
          >
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Liquidez en cuenta oficial (€)</span>
              <input
                name="liq"
                type="number"
                step="0.01"
                min={0}
                defaultValue={settings?.officialLiquidityEuros ?? 0}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Alquiler mensual local (€)</span>
              <input
                name="rent"
                type="number"
                step="0.01"
                min={0}
                defaultValue={settings?.monthlyRentEuros ?? 0}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="leased" type="checkbox" defaultChecked={settings?.rentIsLeased} />
              Local alquilado (aplicar retención 115)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="vatSales" type="checkbox" defaultChecked={settings?.useVatOnSales} />
              Calcular IVA en ventas declaradas
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Tipo IVA ventas (%)</span>
              <input
                name="vatRate"
                type="number"
                min={0}
                max={21}
                defaultValue={settings?.salesVatRatePercent ?? 21}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">IVA gastos recuperable (%)</span>
              <input
                name="vatRec"
                type="number"
                min={0}
                max={100}
                defaultValue={settings?.expenseVatRecoverablePercent ?? 100}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700",
                  saving && "opacity-60",
                )}
              >
                Guardar ajustes y recalcular
              </button>
            </div>
          </form>
        </section>

        <p className="text-center text-xs text-slate-500">
          ¿Gastos deducibles? Ve a{" "}
          <Link href="/dashboard/configuracion/gastos" className="font-medium text-blue-700 underline">
            Alta de gastos
          </Link>{" "}
          con la guía por categoría.
        </p>
      </div>
    </main>
  );
}
