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
};

export function StaffDashboardLayout({
  gridRows,
  rankingSales,
  rankingHours,
  rankingCash,
}: Props) {
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const compactRanking = expandedStaffId !== null;

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
              Pulsa una tarjeta para ampliarla: editar datos de alta, foto web y hasta seis tarifas por hora (ej.
              fisioterapia vs acupuntura). Las cifras de ventas y horas vienen de tickets y registro de horas.
            </p>
          </div>
          <StaffAltaUsuarioModal />
        </div>

        <StaffMetricsGrid rows={gridRows} onExpandedChange={handleExpandedChange} />
      </section>

      <StaffRankingAside
        rankingSales={rankingSales}
        rankingHours={rankingHours}
        rankingCash={rankingCash}
        compact={compactRanking}
      />
    </div>
  );
}
