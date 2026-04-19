"use client";

import { useCallback, useMemo, useState } from "react";
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
} from "@/lib/dashboard/trendChartData";

const COLORS = {
  ingresos: "#2563eb",
  gastos: "#ef4444",
  bizum: "#8b5cf6",
  efectivo: "#16a34a",
  tarjeta: "#f59e0b",
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

function fmtEuro(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
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

export function DashboardTrendChart({
  tickets,
  expenses,
}: {
  tickets: TicketRow[];
  expenses: ExpenseRow[];
}) {
  const [range, setRange] = useState<ChartRange>("month");
  const [hover, setHover] = useState<{
    index: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const points = useMemo(
    () => buildTrendSeries(range, tickets, expenses),
    [range, tickets, expenses],
  );

  const rangeLabel = useMemo(() => formatIncomeRangeLabel(range), [range]);

  const maxY = useMemo(() => maxTrendValue(points), [points]);

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
    const m = maxY;
    return {
      gastos: buildLinePath(g, m, plotW, plotH),
      ingresos: buildLinePath(ing, m, plotW, plotH),
      bizum: buildLinePath(bz, m, plotW, plotH),
      efectivo: buildLinePath(ef, m, plotW, plotH),
      tarjeta: buildLinePath(tj, m, plotW, plotH),
    };
  }, [points, maxY, plotW, plotH]);

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
    () =>
      hoverPoint
        ? [
            { label: "Ingresos acumulados", v: hoverPoint.ingresos, c: COLORS.ingresos },
            { label: "Gastos acumulados", v: hoverPoint.gastos, c: COLORS.gastos },
            { label: "Bizum acumulado", v: hoverPoint.bizum, c: COLORS.bizum },
            { label: "Efectivo acumulado", v: hoverPoint.efectivo, c: COLORS.efectivo },
            { label: "Tarjeta acumulada", v: hoverPoint.tarjeta, c: COLORS.tarjeta },
          ]
        : [],
    [hoverPoint],
  );

  const tooltipPos = useMemo(() => {
    if (!hover) return { left: 0, top: 0 };
    const pad = 14;
    const boxW = 252;
    const boxH = 200;
    if (typeof window === "undefined") return { left: hover.clientX + pad, top: hover.clientY + pad };
    let left = hover.clientX + pad;
    let top = hover.clientY + pad;
    left = Math.min(left, window.innerWidth - boxW - 8);
    left = Math.max(8, left);
    top = Math.min(top, window.innerHeight - boxH - 8);
    top = Math.max(8, top);
    return { left, top };
  }, [hover]);

  return (
    <section className="glass-panel glass-tint-violet xl:col-span-12 rounded-2xl p-6 md:p-7">
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
        <div className="glass-inner min-w-[min(100%,920px)] rounded-xl p-2 md:p-3">
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
                  {fmtEuro(v)}
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
              <path d={paths.ingresos} stroke={COLORS.ingresos} />
              <path d={paths.gastos} stroke={COLORS.gastos} />
              <path d={paths.bizum} stroke={COLORS.bizum} strokeDasharray="6 4" strokeWidth={1.85} />
              <path d={paths.efectivo} stroke={COLORS.efectivo} strokeDasharray="4 3" strokeWidth={1.85} />
              <path d={paths.tarjeta} stroke={COLORS.tarjeta} strokeDasharray="2 4" strokeWidth={1.85} />
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
                ].map((s, i) => (
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
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.c }} />
                    {row.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">{fmtEuro(row.v)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-800">Ingresos (acum.)</span>
        <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">Gastos (acum.)</span>
        <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">Bizum (acum.)</span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">Efectivo (acum.)</span>
        <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">Tarjeta (acum.)</span>
      </div>
    </section>
  );
}
