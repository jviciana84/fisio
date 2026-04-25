"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ChartRange,
  type ExpenseRow,
  type TicketRow,
  RANGE_LABELS,
  RANGE_ORDER,
  RANGE_SHORT,
  buildTrendSeries,
  formatIncomeRangeLabel,
  maxTrendValue,
  niceCeiling,
} from "@/lib/dashboard/trendChartData";
import { formatEuroEsWhole } from "@/lib/format-es";

const COLORS = {
  ingresos: "#2563eb",
  gastos: "#ef4444",
  bizum: "#8b5cf6",
  efectivo: "#16a34a",
  tarjeta: "#f59e0b",
  salarios: "#0f766e",
  margen: "#334155",
} as const;

function buildLinePath(values: number[], maxValue: number, plotW: number, plotH: number): string {
  if (values.length === 0) return "";
  const max = maxValue || 1;
  if (values.length === 1) {
    const y = plotH - (values[0] / max) * plotH;
    return `M 0 ${y.toFixed(2)} L ${plotW.toFixed(2)} ${y.toFixed(2)}`;
  }
  const stepX = plotW / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = plotH - (v / max) * plotH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function indexFromSvgX(svgX: number, n: number, plotW: number, ml: number): number {
  const rx = svgX - ml;
  if (n <= 0) return -1;
  if (n === 1) return rx >= 0 && rx <= plotW ? 0 : -1;
  if (rx < 0 || rx > plotW) return -1;
  const step = plotW / (n - 1);
  const i = Math.round(rx / step);
  return Math.max(0, Math.min(n - 1, i));
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const dow = x.getDay();
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDays(x, -daysFromMonday);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

function startOfSemester(d: Date): Date {
  return d.getMonth() < 6 ? new Date(d.getFullYear(), 0, 1) : new Date(d.getFullYear(), 6, 1);
}

export function DashboardTrendChart({
  tickets,
  expenses,
}: {
  tickets: TicketRow[];
  expenses: ExpenseRow[];
}) {
  type SeriesKey = "ingresos" | "gastos" | "bizum" | "efectivo" | "tarjeta" | "salarios" | "margen";
  const [range, setRange] = useState<ChartRange>("month");
  const [hover, setHover] = useState<{
    index: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [fiscalOverlay, setFiscalOverlay] = useState<{
    quarterTaxesEuros: number;
    monthlySalaryEuros: number;
    quarterDays: number;
  } | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    ingresos: true,
    gastos: true,
    bizum: true,
    efectivo: true,
    tarjeta: true,
    salarios: true,
    margen: true,
  });

  const points = useMemo(
    () => buildTrendSeries(range, tickets, expenses),
    [range, tickets, expenses],
  );

  const rangeLabel = useMemo(() => formatIncomeRangeLabel(range), [range]);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/fiscal/summary");
        const data = (await res.json()) as {
          ok?: boolean;
          simulation?: { totalTaxesEuros?: number };
          payrollPreview?: { totals?: { quarterEmployerCostEuros?: number; monthlyEquivalentEuros?: number } };
        };
        if (!res.ok || !data.ok) return;
        const now = new Date();
        const startMonth = Math.floor(now.getMonth() / 3) * 3;
        const quarterStart = new Date(now.getFullYear(), startMonth, 1);
        const msPerDay = 24 * 60 * 60 * 1000;
        const quarterDays = Math.max(1, Math.floor((now.getTime() - quarterStart.getTime()) / msPerDay) + 1);
        if (!disposed) {
          setFiscalOverlay({
            quarterTaxesEuros: Number(data.simulation?.totalTaxesEuros ?? 0),
            monthlySalaryEuros: Number(data.payrollPreview?.totals?.monthlyEquivalentEuros ?? 0),
            quarterDays,
          });
        }
      } catch {
        // Gráfico usable aunque falle la carga del overlay fiscal.
      }
    })();
    return () => {
      disposed = true;
    };
  }, []);

  const overlaySeries = useMemo(() => {
    const n = points.length;
    if (!n || !fiscalOverlay) {
      return {
        salarios: Array.from({ length: n }, () => 0),
        margenReal: points.map((p) => p.ingresos - p.gastos),
      };
    }

    const now = new Date();
    const pointDates: Date[] = [];
    if (range === "day") {
      for (let h = 23; h >= 0; h--) {
        const slot = new Date(now);
        slot.setMinutes(0, 0, 0);
        slot.setHours(slot.getHours() - h);
        pointDates.push(slot);
      }
    } else if (range === "week") {
      const monday = startOfWeekMonday(now);
      for (let i = 0; i < 7; i++) pointDates.push(addDays(monday, i));
    } else {
      const start =
        range === "month"
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : range === "quarter"
            ? startOfQuarter(now)
            : range === "semester"
              ? startOfSemester(now)
              : new Date(now.getFullYear(), 0, 1);
      const endDay = startOfDay(now);
      for (let day = startOfDay(start); day.getTime() <= endDay.getTime(); day = addDays(day, 1)) {
        pointDates.push(day);
      }
    }

    const taxesDaily = fiscalOverlay.quarterTaxesEuros / fiscalOverlay.quarterDays;
    const impuestos = pointDates.map((d) => {
      const msPerDay = 24 * 60 * 60 * 1000;
      const elapsedDays = Math.max(1, Math.floor((startOfDay(d).getTime() - startOfQuarter(d).getTime()) / msPerDay) + 1);
      return taxesDaily * elapsedDays;
    });

    // Salarios reales: salto el día 1 de cada mes (carga de nómina).
    let acumuladoSalarios = 0;
    let lastMonthKey = "";
    const salarios = pointDates.map((d) => {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (d.getDate() === 1 && monthKey !== lastMonthKey) {
        acumuladoSalarios += fiscalOverlay.monthlySalaryEuros;
        lastMonthKey = monthKey;
      }
      return acumuladoSalarios;
    });

    // Margen operativo real acumulado (antes de nómina): ingresos - gastos - impuestos.
    const margenReal = points.map((p, i) => p.ingresos - p.gastos - (impuestos[i] ?? 0));

    return { salarios, margenReal };
  }, [points, fiscalOverlay, range]);

  const maxY = useMemo(() => {
    let m = 0;
    for (let i = 0; i < points.length; i++) {
      if (visibleSeries.ingresos) m = Math.max(m, points[i]?.ingresos ?? 0);
      if (visibleSeries.gastos) m = Math.max(m, points[i]?.gastos ?? 0);
      if (visibleSeries.bizum) m = Math.max(m, points[i]?.bizum ?? 0);
      if (visibleSeries.efectivo) m = Math.max(m, points[i]?.efectivo ?? 0);
      if (visibleSeries.tarjeta) m = Math.max(m, points[i]?.tarjeta ?? 0);
      if (visibleSeries.salarios) m = Math.max(m, overlaySeries.salarios[i] ?? 0);
      if (visibleSeries.margen) m = Math.max(m, overlaySeries.margenReal[i] ?? 0);
    }
    return niceCeiling(Math.max(m, maxTrendValue(points), 1));
  }, [points, overlaySeries, visibleSeries]);

  const W = 920;
  const H = 340;
  const ml = 56;
  const mr = 12;
  const mt = 16;
  const mb = 48;
  const plotW = W - ml - mr;
  const plotH = H - mt - mb;

  const ticks = 5;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (maxY * (ticks - i)) / ticks);

  const yGrid = (i: number) => mt + (plotH * i) / ticks;

  const paths = useMemo(() => {
    const g = points.map((p) => p.gastos);
    const ing = points.map((p) => p.ingresos);
    const bz = points.map((p) => p.bizum);
    const ef = points.map((p) => p.efectivo);
    const tj = points.map((p) => p.tarjeta);
    const sal = overlaySeries.salarios;
    const mar = overlaySeries.margenReal;
    const m = maxY;
    return {
      gastos: buildLinePath(g, m, plotW, plotH),
      ingresos: buildLinePath(ing, m, plotW, plotH),
      bizum: buildLinePath(bz, m, plotW, plotH),
      efectivo: buildLinePath(ef, m, plotW, plotH),
      tarjeta: buildLinePath(tj, m, plotW, plotH),
      salarios: buildLinePath(sal, m, plotW, plotH),
      margen: buildLinePath(mar, m, plotW, plotH),
    };
  }, [points, overlaySeries, maxY, plotW, plotH]);

  const n = Math.max(points.length, 1);
  const xAt = (i: number) => {
    if (n <= 1) return ml + plotW / 2;
    return ml + (i * plotW) / (n - 1);
  };

  const yAtValue = useCallback(
    (v: number) => mt + plotH - (v / maxY) * plotH,
    [mt, plotH, maxY],
  );

  const xLabelEvery = n <= 8 ? 1 : n <= 16 ? 2 : n <= 31 ? 5 : Math.ceil(n / 8);

  const handleSvgPointer = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * W;
      const svgY = ((e.clientY - rect.top) / rect.height) * H;
      if (svgX < ml || svgX > ml + plotW || svgY < mt || svgY > mt + plotH) {
        setHover(null);
        return;
      }
      const idx = indexFromSvgX(svgX, points.length, plotW, ml);
      if (idx < 0) {
        setHover(null);
        return;
      }
      setHover({ index: idx, clientX: e.clientX, clientY: e.clientY });
    },
    [W, H, ml, mt, plotW, plotH, points.length],
  );

  const clearHover = useCallback(() => setHover(null), []);

  const hoverPoint = hover != null ? points[hover.index] : null;
  const vx = hover != null ? xAt(hover.index) : 0;

  const tooltipSeries = useMemo(
    () => {
      if (!hover || !hoverPoint) return [];
      const idx = hover.index;
      const rows: Array<{ key: SeriesKey; label: string; v: number; c: string; dash?: string; w?: number }> = [
        { key: "ingresos", label: "Ingresos acumulados", v: hoverPoint.ingresos, c: COLORS.ingresos, w: 2.25 },
        { key: "gastos", label: "Gastos acumulados", v: hoverPoint.gastos, c: COLORS.gastos, w: 2.25 },
        { key: "bizum", label: "Bizum acumulado", v: hoverPoint.bizum, c: COLORS.bizum, dash: "6 4", w: 1.85 },
        { key: "efectivo", label: "Efectivo acumulado", v: hoverPoint.efectivo, c: COLORS.efectivo, dash: "4 3", w: 1.85 },
        { key: "tarjeta", label: "Tarjeta acumulada", v: hoverPoint.tarjeta, c: COLORS.tarjeta, dash: "2 4", w: 1.85 },
        {
          key: "salarios",
          label: "Salarios acumulados",
          v: overlaySeries.salarios[idx] ?? 0,
          c: COLORS.salarios,
          dash: "8 5",
          w: 1.75,
        },
        {
          key: "margen",
          label: "Margen acumulado",
          v: overlaySeries.margenReal[idx] ?? 0,
          c: COLORS.margen,
          w: 2.1,
        },
      ];
      return rows.filter((row) => visibleSeries[row.key]);
    },
    [hover, hoverPoint, overlaySeries, visibleSeries],
  );

  const tooltipPos = useMemo(() => {
    if (!hover) return { left: 0, top: 0 };
    const pad = 20;
    const avoidLineGap = 72;
    const boxW = 252;
    const boxH = 200;
    if (typeof window === "undefined") return { left: hover.clientX + pad, top: hover.clientY + pad };
    const placeRight = hover.clientX <= window.innerWidth / 2;
    let left = placeRight ? hover.clientX + avoidLineGap : hover.clientX - boxW - avoidLineGap;
    if (left + boxW > window.innerWidth - 8) left = hover.clientX - boxW - avoidLineGap;
    if (left < 8) left = hover.clientX + avoidLineGap;
    left = Math.max(8, Math.min(left, window.innerWidth - boxW - 8));
    let top = hover.clientY - boxH / 2;
    top = Math.min(top, window.innerHeight - boxH - 8);
    top = Math.max(8, top);
    return { left, top };
  }, [hover]);

  return (
    <section className="glass-panel glass-tint-violet xl:col-span-12 p-6 md:p-7">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase leading-none tracking-[0.16em] text-blue-600">Tendencia</p>
        <div className="mt-1 flex flex-row flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-slate-900">Gastos e ingresos</h2>
            <p className="mt-1 max-w-xl text-xs leading-snug text-slate-600">
              Líneas acumulativas: cada punto suma todo lo anterior en el periodo (hora a hora o día a día), para ver si
              los gastos se acercan o superan a los ingresos y cómo crece efectivo frente a Bizum.
            </p>
          </div>
          <div className="flex min-w-0 max-w-full shrink-0 flex-col items-end gap-2 sm:max-w-[min(100%,36rem)]">
            <p className="w-full text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Periodo
            </p>
            <div
              className="flex w-full flex-wrap items-center justify-end gap-x-2 gap-y-1"
              role="group"
              aria-label="Seleccionar periodo del gráfico"
            >
              {RANGE_ORDER.map((k) => {
                const selected = range === k;
                return (
                  <button
                    key={k}
                    type="button"
                    title={RANGE_LABELS[k]}
                    aria-pressed={selected}
                    aria-label={RANGE_LABELS[k]}
                    onClick={() => setRange(k)}
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
              <p className="min-w-0 text-right text-[11px] font-medium leading-snug text-slate-600" title={rangeLabel}>
                {rangeLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 overflow-x-auto">
        <div className="glass-inner min-w-[min(100%,920px)] p-2 shadow-sm ring-1 ring-white/50 md:p-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[clamp(260px,50vh,380px)] w-full cursor-crosshair"
            role="img"
            aria-label="Tendencia acumulada de gastos e ingresos en el periodo"
            onMouseMove={handleSvgPointer}
            onMouseLeave={clearHover}
          >
            {/* Fondo rejilla */}
            <g stroke="#94a3b8" strokeOpacity={0.35} strokeWidth={1}>
              {Array.from({ length: ticks + 1 }, (_, i) => (
                <line key={`h-${i}`} x1={ml} y1={yGrid(i)} x2={ml + plotW} y2={yGrid(i)} />
              ))}
              {points.map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={xAt(i)}
                  y1={mt}
                  x2={xAt(i)}
                  y2={mt + plotH}
                  strokeDasharray="3 3"
                />
              ))}
            </g>

            {/* Eje Y */}
            <g fill="#64748b" fontSize="10" textAnchor="end">
              {tickVals.map((v, i) => (
                <text key={`y-${i}`} x={ml - 8} y={yGrid(i) + 4}>
                  {formatEuroEsWhole(v)}
                </text>
              ))}
            </g>

            {/* Eje X */}
            <g fill="#64748b" fontSize="9" textAnchor="middle">
              {points.map((p, i) =>
                i % xLabelEvery === 0 || i === points.length - 1 ? (
                  <text key={`x-${i}`} x={xAt(i)} y={H - 12}>
                    {p.label}
                  </text>
                ) : null,
              )}
            </g>

            {/* Eje base (cero) más marcado */}
            <line
              x1={ml}
              y1={mt + plotH}
              x2={ml + plotW}
              y2={mt + plotH}
              stroke="#64748b"
              strokeOpacity={0.6}
              strokeWidth={1.75}
            />

            <g transform={`translate(${ml},${mt})`} fill="none" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              {visibleSeries.ingresos ? <path d={paths.ingresos} stroke={COLORS.ingresos} /> : null}
              {visibleSeries.gastos ? <path d={paths.gastos} stroke={COLORS.gastos} /> : null}
              {visibleSeries.bizum ? <path d={paths.bizum} stroke={COLORS.bizum} strokeDasharray="6 4" strokeWidth={1.85} /> : null}
              {visibleSeries.efectivo ? (
                <path d={paths.efectivo} stroke={COLORS.efectivo} strokeDasharray="4 3" strokeWidth={1.85} />
              ) : null}
              {visibleSeries.tarjeta ? (
                <path d={paths.tarjeta} stroke={COLORS.tarjeta} strokeDasharray="2 4" strokeWidth={1.85} />
              ) : null}
              {visibleSeries.salarios ? (
                <path d={paths.salarios} stroke={COLORS.salarios} strokeDasharray="8 5" strokeWidth={1.75} />
              ) : null}
              {visibleSeries.margen ? <path d={paths.margen} stroke={COLORS.margen} strokeDasharray="1 0" strokeWidth={2.1} /> : null}
            </g>

            {/* Línea vertical + puntos al hover */}
            {hover != null && hoverPoint != null ? (
              <g pointerEvents="none">
                <line
                  x1={vx}
                  y1={mt}
                  x2={vx}
                  y2={mt + plotH}
                  stroke="#0f172a"
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                {[
                  { v: hoverPoint.ingresos, c: COLORS.ingresos },
                  { v: hoverPoint.gastos, c: COLORS.gastos },
                  { v: hoverPoint.bizum, c: COLORS.bizum },
                  { v: hoverPoint.efectivo, c: COLORS.efectivo },
                  { v: hoverPoint.tarjeta, c: COLORS.tarjeta },
                  { v: overlaySeries.salarios[hover.index] ?? 0, c: COLORS.salarios },
                  { v: overlaySeries.margenReal[hover.index] ?? 0, c: COLORS.margen },
                ]
                  .filter((_, i) => {
                    const keys: SeriesKey[] = ["ingresos", "gastos", "bizum", "efectivo", "tarjeta", "salarios", "margen"];
                    return visibleSeries[keys[i] as SeriesKey];
                  })
                  .map((s, i) => (
                  <circle
                    key={`dot-${i}`}
                    cx={vx}
                    cy={yAtValue(s.v)}
                    r={5}
                    fill={s.c}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </g>
            ) : null}
          </svg>
        </div>

        {/* Tooltip HTML (fuera del SVG para tipografía clara) */}
        {hover != null && hoverPoint != null ? (
          <div
            className="pointer-events-none fixed z-50 w-[252px] max-w-[min(252px,calc(100vw-24px))] rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-xs shadow-xl shadow-slate-900/15 backdrop-blur-sm"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            <p className="border-b border-slate-200/80 pb-1.5 font-semibold text-slate-800">{hoverPoint.label}</p>
            <ul className="mt-2 space-y-1">
              {tooltipSeries.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-600">
                    <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true" className="shrink-0">
                      <line
                        x1="1"
                        y1="4"
                        x2="15"
                        y2="4"
                        stroke={row.c}
                        strokeWidth={row.w ?? 2}
                        strokeDasharray={row.dash}
                        strokeLinecap="round"
                      />
                    </svg>
                    {row.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">{formatEuroEsWhole(row.v)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          { key: "ingresos", label: "Ingresos", color: COLORS.ingresos, dash: undefined, width: 2.25, bg: "bg-blue-100", text: "text-blue-800" },
          { key: "gastos", label: "Gastos", color: COLORS.gastos, dash: undefined, width: 2.25, bg: "bg-red-100", text: "text-red-700" },
          { key: "bizum", label: "Bizum", color: COLORS.bizum, dash: "6 4", width: 1.85, bg: "bg-violet-100", text: "text-violet-700" },
          { key: "efectivo", label: "Efectivo", color: COLORS.efectivo, dash: "4 3", width: 1.85, bg: "bg-emerald-100", text: "text-emerald-700" },
          { key: "tarjeta", label: "Tarjeta", color: COLORS.tarjeta, dash: "2 4", width: 1.85, bg: "bg-amber-100", text: "text-amber-800" },
          { key: "salarios", label: "Salarios", color: COLORS.salarios, dash: "8 5", width: 1.75, bg: "bg-teal-100", text: "text-teal-800" },
          { key: "margen", label: "Margen", color: COLORS.margen, dash: undefined, width: 2.1, bg: "bg-slate-200", text: "text-slate-800" },
        ].map((item) => {
          const key = item.key as SeriesKey;
          const active = visibleSeries[key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }))}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium transition ${
                active ? `${item.bg} ${item.text}` : "bg-slate-100 text-slate-400"
              }`}
              aria-pressed={active}
              title={active ? "Ocultar serie" : "Mostrar serie"}
            >
              <svg width="18" height="8" viewBox="0 0 18 8" aria-hidden="true">
                <line
                  x1="1"
                  y1="4"
                  x2="17"
                  y2="4"
                  stroke={active ? item.color : "#94a3b8"}
                  strokeWidth={item.width}
                  strokeDasharray={item.dash}
                  strokeLinecap="round"
                />
              </svg>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
