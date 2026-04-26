"use client";

import { useCallback, useState } from "react";
import { StaffAltaUsuarioModal } from "@/components/dashboard/StaffAltaUsuarioModal";
import { StaffMetricsGrid, type StaffGridRow } from "@/components/dashboard/StaffMetricsGrid";
import { StaffRankingAside } from "@/components/dashboard/StaffRankingAside";
import { cn } from "@/lib/cn";

type Props = {
  gridRows: StaffGridRow[];
  rankingSales: StaffGridRow[];
  rankingHours: StaffGridRow[];
  rankingCash: StaffGridRow[];
  /** Mes en curso (Europe/Madrid) para métricas de tarjetas y ranking. */
  metricsPeriodLabel: string;
};

export function StaffDashboardLayout({
  gridRows,
  rankingSales,
  rankingHours,
  rankingCash,
  metricsPeriodLabel,
}: Props) {
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [staffFilter, setStaffFilter] = useState<"active" | "inactive" | "all">("active");
  const compactRanking = expandedStaffId !== null;

  const filteredGridRows = gridRows.filter((row) => {
    if (staffFilter === "all") return true;
    return staffFilter === "active" ? row.is_active : !row.is_active;
  });
  const visibleIds = new Set(filteredGridRows.map((row) => row.id));
  const filteredRankingSales = rankingSales.filter((row) => visibleIds.has(row.id));
  const filteredRankingHours = rankingHours.filter((row) => visibleIds.has(row.id));
  const filteredRankingCash = rankingCash.filter((row) => visibleIds.has(row.id));

  const handleExpandedChange = useCallback((id: string | null) => {
    setExpandedStaffId(id);
  }, []);

  return (
    <div className="mx-auto grid max-w-[1300px] grid-cols-1 gap-5 xl:grid-cols-12">
      <section
        className={cn(
          "glass-panel p-6 md:p-8",
          compactRanking ? "xl:col-span-10" : "xl:col-span-8",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Staff</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Ventas, horas y cobros por persona
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Pulsa una tarjeta para ampliarla: editar datos de alta, baja, foto web y hasta seis tarifas por hora
              (ej. fisioterapia vs acupuntura). Las cifras ({metricsPeriodLabel}) vienen de tickets de caja y
              registro de horas.
            </p>
            <div
              className="mt-3 flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Mostrar personal por estado (altas o bajas)"
            >
              <span className="text-xs font-medium text-slate-500">Listado:</span>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/90 p-0.5 shadow-inner">
                {(
                  [
                    { id: "active" as const, label: "Altas" },
                    { id: "inactive" as const, label: "Bajas" },
                    { id: "all" as const, label: "Todos" },
                  ] as const
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStaffFilter(id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      staffFilter === id
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                        : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <StaffAltaUsuarioModal />
          </div>
        </div>

        <StaffMetricsGrid
          rows={filteredGridRows}
          metricsPeriodLabel={metricsPeriodLabel}
          onExpandedChange={handleExpandedChange}
        />
      </section>

      <StaffRankingAside
        rankingSales={filteredRankingSales}
        rankingHours={filteredRankingHours}
        rankingCash={filteredRankingCash}
        compact={compactRanking}
        metricsPeriodLabel={metricsPeriodLabel}
      />
    </div>
  );
}
