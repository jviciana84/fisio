import type { StaffGridRow } from "@/components/dashboard/StaffMetricsGrid";
import { formatEuroEsWhole, formatHoursEs } from "@/lib/format-es";

type Props = {
  rankingSales: StaffGridRow[];
  rankingHours: StaffGridRow[];
  rankingCash: StaffGridRow[];
  compact: boolean;
  metricsPeriodLabel: string;
};

export function StaffRankingAside({
  rankingSales,
  rankingHours,
  rankingCash,
  compact,
  metricsPeriodLabel,
}: Props) {
  const topSales = compact ? rankingSales.slice(0, 3) : rankingSales.slice(0, 5);
  const topHours = compact ? rankingHours.slice(0, 3) : rankingHours.slice(0, 5);
  const topCash = compact ? rankingCash.slice(0, 3) : rankingCash.slice(0, 5);
  const listItemClass = compact
    ? "flex items-center justify-between gap-1"
    : "flex items-center justify-between gap-2";

  return (
    <aside
      className={
        compact
          ? "glass-panel p-3 md:p-4 xl:col-span-2"
          : "glass-panel p-6 xl:col-span-4"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Ranking Staff</p>
      <h2 className={compact ? "mt-1 text-base font-semibold text-slate-900" : "mt-2 text-xl font-semibold text-slate-900"}>
        Top rendimiento
      </h2>
      <p
        className={
          compact ? "mt-0.5 text-[10px] capitalize leading-snug text-slate-600" : "mt-1 text-xs capitalize text-slate-600"
        }
      >
        Mes en curso: {metricsPeriodLabel}
      </p>
      {compact ? (
        <p className="mt-1 text-[10px] leading-snug text-slate-500">
          Vista compacta mientras editas una ficha (sin importes en €).
        </p>
      ) : null}

      <div className={compact ? "mt-1.5 space-y-2" : "mt-4 space-y-4"}>
        <div
          className={
            compact
              ? "rounded-lg border border-white/70 bg-white/70 p-2"
              : "rounded-xl border border-white/70 bg-white/70 p-4"
          }
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Más venden</p>
          <ol className={compact ? "mt-1 space-y-0.5 text-[11px] leading-tight" : "mt-2 space-y-1 text-sm"}>
            {topSales.map((s, i) => (
              <li key={`sales-${s.id}`} className={listItemClass}>
                <span className="min-w-0 truncate text-slate-700">
                  {i + 1}. {s.name}
                </span>
                {!compact ? (
                  <span className="shrink-0 font-semibold text-slate-900">{formatEuroEsWhole(s.totalSalesEuros)}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div
          className={
            compact
              ? "rounded-lg border border-white/70 bg-white/70 p-2"
              : "rounded-xl border border-white/70 bg-white/70 p-4"
          }
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Más horas</p>
          <ol className={compact ? "mt-1 space-y-0.5 text-[11px] leading-tight" : "mt-2 space-y-1 text-sm"}>
            {topHours.map((s, i) => (
              <li key={`hours-${s.id}`} className={listItemClass}>
                <span className="min-w-0 truncate text-slate-700">
                  {i + 1}. {s.name}
                </span>
                <span className="shrink-0 font-semibold text-slate-900">{formatHoursEs(s.workedHours)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div
          className={
            compact
              ? "rounded-lg border border-white/70 bg-white/70 p-2"
              : "rounded-xl border border-white/70 bg-white/70 p-4"
          }
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Más cobra en efectivo
          </p>
          <ol className={compact ? "mt-1 space-y-0.5 text-[11px] leading-tight" : "mt-2 space-y-1 text-sm"}>
            {topCash.map((s, i) => (
              <li key={`cash-${s.id}`} className={listItemClass}>
                <span className="min-w-0 truncate text-slate-700">
                  {i + 1}. {s.name}
                </span>
                {!compact ? (
                  <span className="shrink-0 font-semibold text-slate-900">{formatEuroEsWhole(s.cashEuros)}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  );
}
