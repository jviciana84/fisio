"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CircleHelp, Loader2, Save, ShieldAlert, Wallet, TrendingUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatEuroEsTwoDecimals, formatEuroEsWhole, parseSpanishDecimalInput } from "@/lib/format-es";

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
  netBeforeIrpfEuros: number;
  ivaToPayEuros: number;
  ivaOutputEuros: number;
  ivaInputEuros: number;
  ivaNetEuros: number;
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
  employeeIrpfRetentionPercent: number;
  employeeSocialSecurityPercent: number;
  employerSocialSecurityPercent: number;
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

type PayrollPreview = {
  assumptions: {
    employeeIrpfRetentionPercent: number;
    employeeSocialSecurityPercent: number;
    employerSocialSecurityPercent: number;
  };
  salariedProfiles: Array<{
    name: string;
    annualGrossEuros: number;
    monthlyEquivalentEuros: number;
  }>;
  totals: {
    salariedCount: number;
    annualGrossEuros: number;
    monthlyEquivalentEuros: number;
    quarterGrossEuros: number;
    quarterNetPayrollEuros: number;
    quarterEmployerCostEuros: number;
    quarterEmployeeIrpfRetentionEuros: number;
    quarterEmployeeSocialSecurityEuros: number;
    quarterEmployerSocialSecurityEuros: number;
    model111QuarterEuros: number;
    model190YearEuros: number;
  };
};

type QuarterCash = {
  totalEuros: number;
  invoicedEuros: number;
  freeEuros: number;
};

type ModelWarning = {
  model: "303" | "130" | "115" | "111" | "190";
  message: string;
};

type FiscalSnapshotRow = {
  id: string;
  calendar_year: number;
  quarter: number;
  quarter_label: string | null;
  declare_cash_percent: number;
  payload: Record<string, unknown>;
  created_at: string;
};

type FiscalPeriodOptions = {
  years: number[];
  quartersByYear: Record<string, number[]>;
};

const TAX_MODEL_LEGEND: Array<{
  model: ModelWarning["model"];
  title: string;
  description: string;
}> = [
  {
    model: "303",
    title: "Modelo 303",
    description: "Declaración trimestral de IVA repercutido menos IVA soportado deducible.",
  },
  {
    model: "130",
    title: "Modelo 130",
    description: "Pago fraccionado trimestral de IRPF sobre el beneficio estimado de la actividad.",
  },
  {
    model: "115",
    title: "Modelo 115",
    description: "Ingreso trimestral de retenciones practicadas por alquiler de local de negocio.",
  },
  {
    model: "111",
    title: "Modelo 111",
    description: "Ingreso trimestral de retenciones de IRPF practicadas en nóminas.",
  },
  {
    model: "190",
    title: "Modelo 190",
    description: "Resumen anual informativo de retenciones de trabajo declaradas en los 111.",
  },
];

function TaxModelHelpIcon({
  model,
  iconClassName = "text-slate-500",
}: {
  model: ModelWarning["model"];
  iconClassName?: string;
}) {
  const item = TAX_MODEL_LEGEND.find((m) => m.model === model);
  if (!item) return null;
  return (
    <details className="inline-block max-w-full align-middle">
      <summary
        className={cn(
          "inline-flex list-none cursor-pointer items-center rounded p-0.5 hover:bg-black/[0.04] [&::-webkit-details-marker]:hidden",
          iconClassName,
        )}
      >
        <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="sr-only">Explicación: {item.title}</span>
      </summary>
      <p className="mt-1.5 text-[10px] font-normal normal-case leading-snug tracking-normal text-slate-700">
        {item.description}
      </p>
    </details>
  );
}

type PayrollLegendBadge = "empresa" | "trabajador" | "informativo";

const PAYROLL_BADGE_SHORT: Record<PayrollLegendBadge, string> = {
  empresa: "Emp.",
  trabajador: "Trab.",
  informativo: "Info",
};

/** Leyenda: título + chip; una frase en el (?) */
const PAYROLL_COST_LEGEND: Array<{
  title: string;
  badge: PayrollLegendBadge;
  description: string;
  cargaNegocio?: boolean;
}> = [
  {
    title: "Bruto nómina",
    badge: "empresa",
    cargaNegocio: true,
    description: "Nóminas en bruto del trimestre. Misma cifra que el recuadro azul arriba a la izquierda.",
  },
  {
    title: "SS empresa",
    badge: "empresa",
    cargaNegocio: true,
    description: "Lo que pone el negocio a la SS. Mismo número que el recuadro violeta al lado del azul.",
  },
  {
    title: "SS del trabajador",
    badge: "trabajador",
    description: "Lo que al trabajador se le quita y va a la SS. Sale del su bruto.",
  },
  {
    title: "IRPF en nómina",
    badge: "trabajador",
    description: "Dinero retenido al empleado; luego tú lo ingresas. Lo estima el % de ajustes.",
  },
  {
    title: "Neto al trabajador",
    badge: "trabajador",
    description: "Aprox.: bruto − su SS − IRPF, trimestre. Revisa la línea «Neto nóminas…» bajo 111/190.",
  },
  {
    title: "Modelo 111",
    badge: "trabajador",
    description: "IRPF retenido que ingresas a Hacienda. La cifra es la de la caja 111 de encima, no otra suma rara.",
  },
  {
    title: "Modelo 190",
    badge: "informativo",
    description: "Solo informativo al año, no un pago de más. La cifra es la de la caja 190 de encima.",
  },
  {
    title: "Total coste negocio",
    badge: "empresa",
    cargaNegocio: true,
    description: "Suma: bruto + SS empresa. Es el recuadro verde «= Coste empresa trim.»; lo mismo que arriba a la izquierda.",
  },
];

/** Una fila compacta: título + chip (Emp./Trab./Info) + ?; el texto largo solo al abrir. */
function PayrollCostLegendItem({
  title,
  badge,
  description,
  cargaNegocio,
}: {
  title: string;
  badge: PayrollLegendBadge;
  description: string;
  cargaNegocio?: boolean;
}) {
  const chip = PAYROLL_BADGE_SHORT[badge];
  return (
    <div
      className={cn(
        "rounded-md border p-1.5",
        cargaNegocio
          ? "border-slate-400/55 bg-gradient-to-b from-slate-200/85 to-slate-100/80 shadow-inner ring-1 ring-slate-400/25"
          : "border-slate-200/70 bg-white/75",
      )}
    >
      <details className="w-full min-w-0">
        <summary
          className={cn(
            "flex w-full list-none items-center gap-1.5 rounded py-0.5 pl-0.5",
            "cursor-pointer text-left hover:bg-white/30",
            cargaNegocio && "hover:bg-slate-200/40",
            "[&::-webkit-details-marker]:hidden",
          )}
        >
          <span className="sr-only">Ampliar explicación de {title}</span>
          <span
            className={cn(
              "min-w-0 flex-1 text-left text-xs font-semibold leading-tight",
              cargaNegocio ? "text-slate-900" : "text-slate-500",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold tabular-nums leading-none tracking-wide",
              badge === "empresa" && "border-slate-500/30 bg-slate-500/15 text-slate-700",
              badge === "trabajador" && "border-slate-300/60 bg-slate-100/90 text-slate-600",
              badge === "informativo" && "border-slate-300/50 bg-slate-200/50 text-slate-600",
            )}
            title={
              badge === "empresa"
                ? "Carga o trámite a cargo del negocio (autónomo)"
                : badge === "trabajador"
                  ? "Importe a cargo o del trabajador"
                  : "Solo informativo / sin ingreso añadido en sentido nómina"
            }
          >
            {chip}
          </span>
          <span
            className={cn("shrink-0 p-0.5", cargaNegocio ? "text-slate-500" : "text-slate-400")}
            aria-hidden
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </span>
        </summary>
        <p className="mt-1.5 border-t border-slate-200/60 pt-1.5 text-[10px] font-normal normal-case leading-snug text-slate-700">
          {description}
        </p>
      </details>
    </div>
  );
}

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
  const [payrollPreview, setPayrollPreview] = useState<PayrollPreview | null>(null);
  const [modelWarnings, setModelWarnings] = useState<ModelWarning[]>([]);
  const [quarterCash, setQuarterCash] = useState<QuarterCash | null>(null);

  const [sliderPct, setSliderPct] = useState([60]);
  const [saving, setSaving] = useState(false);
  const [declaredCashInput, setDeclaredCashInput] = useState("");
  const [editingDeclaredCash, setEditingDeclaredCash] = useState(false);
  const [simView, setSimView] = useState<"elapsed" | "full">("elapsed");
  const [mainTab, setMainTab] = useState<"actual" | "historico">("actual");
  const [snapshots, setSnapshots] = useState<FiscalSnapshotRow[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsErr, setSnapshotsErr] = useState<string | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [fiscalPeriodOptions, setFiscalPeriodOptions] = useState<FiscalPeriodOptions | null>(null);

  const applySummaryPayload = useCallback((data: {
    quarter?: string;
    chart?: ChartRow[];
    simulation?: Sim;
    settings?: Settings;
    calendarYear?: number;
    currentQuarter?: number;
    fiscalPeriodOptions?: FiscalPeriodOptions;
    yearProgress?: YearProgress;
    payrollPreview?: PayrollPreview;
    modelWarnings?: ModelWarning[];
    quarterCash?: QuarterCash;
  }) => {
    setQuarter(data.quarter ?? "");
    setChart(data.chart ?? []);
    setSim(data.simulation ?? null);
    setSettings(data.settings ?? null);
    setCalendarYear(data.calendarYear ?? null);
    setCurrentQuarter(data.currentQuarter ?? null);
    if (data.fiscalPeriodOptions && data.fiscalPeriodOptions.years.length > 0) {
      setFiscalPeriodOptions(data.fiscalPeriodOptions);
    } else {
      const y = data.calendarYear ?? new Date().getFullYear();
      setFiscalPeriodOptions({
        years: [y],
        quartersByYear: { [String(y)]: [1, 2, 3, 4] },
      });
    }
    setYearProgress(data.yearProgress ?? null);
    setPayrollPreview(data.payrollPreview ?? null);
    setModelWarnings(data.modelWarnings ?? []);
    setQuarterCash(data.quarterCash ?? null);
    if (data.settings?.declareCashPercent != null) {
      setSliderPct([data.settings.declareCashPercent]);
    }
  }, []);

  const load = useCallback(async (opts?: { year?: number; quarter?: number }) => {
    setLoading(true);
    setErr(null);
    try {
      const qs =
        opts?.year != null && opts?.quarter != null
          ? `?year=${encodeURIComponent(String(opts.year))}&quarter=${encodeURIComponent(String(opts.quarter))}`
          : "";
      const res = await fetch(`/api/admin/fiscal/summary${qs}`);
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        quarter?: string;
        chart?: ChartRow[];
        simulation?: Sim;
        settings?: Settings;
        calendarYear?: number;
        currentQuarter?: number;
        fiscalPeriodOptions?: FiscalPeriodOptions;
        yearProgress?: YearProgress;
        payrollPreview?: PayrollPreview;
        modelWarnings?: ModelWarning[];
        quarterCash?: QuarterCash;
      };
      if (!res.ok || !data.ok) {
        setErr(data.message ?? "No se pudo cargar el simulador");
        return;
      }
      applySummaryPayload(data);
    } catch {
      setErr("Error de red");
    } finally {
      setLoading(false);
    }
  }, [applySummaryPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    setSnapshotsErr(null);
    try {
      const res = await fetch("/api/admin/fiscal/snapshots");
      const data = (await res.json()) as { ok?: boolean; message?: string; snapshots?: FiscalSnapshotRow[] };
      if (!res.ok || !data.ok) {
        setSnapshotsErr(data.message ?? "No se pudo cargar el histórico");
        return;
      }
      setSnapshots(data.snapshots ?? []);
    } catch {
      setSnapshotsErr("Error de red");
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab !== "historico") return;
    void loadSnapshots();
  }, [mainTab, loadSnapshots]);

  const saveQuarterSnapshot = useCallback(async () => {
    if (calendarYear == null || currentQuarter == null || !settings || !sim) {
      setSnapshotsErr("Faltan datos del trimestre para guardar.");
      return;
    }
    setSnapshotSaving(true);
    setSnapshotsErr(null);
    try {
      const payload = {
        quarterLabel: quarter,
        simulation: sim,
        settings,
        chart,
        yearProgress,
        payrollPreview,
        modelWarnings,
        quarterCash,
        savedAt: new Date().toISOString(),
      };
      const res = await fetch("/api/admin/fiscal/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarYear,
          quarter: currentQuarter,
          quarterLabel: quarter,
          declareCashPercent: settings.declareCashPercent,
          payload,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setSnapshotsErr(data.message ?? "No se pudo guardar");
        return;
      }
      await loadSnapshots();
    } catch {
      setSnapshotsErr("Error de red");
    } finally {
      setSnapshotSaving(false);
    }
  }, [
    calendarYear,
    currentQuarter,
    quarter,
    settings,
    sim,
    chart,
    yearProgress,
    payrollPreview,
    modelWarnings,
    quarterCash,
    loadSnapshots,
  ]);

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
        if (calendarYear != null && currentQuarter != null) {
          await load({ year: calendarYear, quarter: currentQuarter });
        } else {
          await load();
        }
      }
    } finally {
      setSaving(false);
    }
  }, [load, calendarYear, currentQuarter]);

  const yearOptions = fiscalPeriodOptions?.years ?? [];
  const quarterOptionsForSelect = useMemo((): number[] => {
    if (calendarYear == null) return [1, 2, 3, 4];
    return fiscalPeriodOptions?.quartersByYear[String(calendarYear)] ?? [1, 2, 3, 4];
  }, [fiscalPeriodOptions, calendarYear]);

  const quarterSelectValue = useMemo(() => {
    if (currentQuarter == null) return "";
    if (quarterOptionsForSelect.includes(currentQuarter)) return String(currentQuarter);
    return String(quarterOptionsForSelect[0] ?? 1);
  }, [currentQuarter, quarterOptionsForSelect]);

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

  const warningByModel = useMemo(() => {
    const map = new Map<ModelWarning["model"], string>();
    for (const w of modelWarnings) {
      if (!map.has(w.model)) map.set(w.model, w.message);
    }
    return map;
  }, [modelWarnings]);

  const quarterTotals = useMemo(() => {
    if (!chart.length) return { cashEuros: 0, bizumCardEuros: 0 };
    let cashEuros = 0;
    let bizumCardEuros = 0;
    const useCurrentQuarter = currentQuarter != null && calendarYear != null;
    const startMonth = useCurrentQuarter ? (currentQuarter - 1) * 3 + 1 : null;
    const endMonth = useCurrentQuarter ? startMonth! + 2 : null;

    for (const r of chart) {
      if (useCurrentQuarter) {
        const m = /^(\d{4})-(\d{2})$/.exec(r.monthKey.trim());
        if (!m) continue;
        const y = Number(m[1]);
        const mo = Number(m[2]);
        if (y !== calendarYear || mo < startMonth! || mo > endMonth!) continue;
      }
      cashEuros += r.cashEuros;
      bizumCardEuros += r.bizumEuros + r.cardEuros;
    }
    return { cashEuros, bizumCardEuros };
  }, [chart, currentQuarter, calendarYear]);

  const declaredCashEuros = useMemo(() => {
    const pct = sliderPct[0] ?? 0;
    const free = quarterCash?.freeEuros ?? quarterTotals.cashEuros;
    return (free * pct) / 100;
  }, [quarterCash?.freeEuros, quarterTotals.cashEuros, sliderPct]);

  const elapsedQuarterRatio = useMemo(() => {
    if (calendarYear == null || currentQuarter == null) return 1;
    const startMonth = (currentQuarter - 1) * 3;
    const quarterStart = new Date(calendarYear, startMonth, 1);
    const quarterEndExclusive = new Date(calendarYear, startMonth + 3, 1);
    const now = new Date();
    const effectiveNow = now < quarterStart ? quarterStart : now > quarterEndExclusive ? quarterEndExclusive : now;
    const totalMs = Math.max(1, quarterEndExclusive.getTime() - quarterStart.getTime());
    const elapsedMs = Math.max(1, effectiveNow.getTime() - quarterStart.getTime());
    return Math.max(0, Math.min(1, elapsedMs / totalMs));
  }, [calendarYear, currentQuarter]);

  const quarterRangeLabels = useMemo(() => {
    if (calendarYear == null || currentQuarter == null) {
      return { from: "—", to: "—" };
    }
    const fmt = (d: Date) =>
      d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const startMonth = (currentQuarter - 1) * 3;
    const quarterStart = new Date(calendarYear, startMonth, 1);
    const quarterEnd = new Date(calendarYear, startMonth + 3, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let endLabel = quarterEnd;
    if (today < quarterStart) endLabel = quarterStart;
    else if (today <= quarterEnd) endLabel = today;
    return { from: fmt(quarterStart), to: fmt(endLabel) };
  }, [calendarYear, currentQuarter]);

  const netBeforeForView = useMemo(() => {
    if (!sim) return 0;
    if (simView === "full") return sim.netBeforeIrpfEuros;
    const quarterPayroll = payrollPreview?.totals.quarterEmployerCostEuros ?? 0;
    const elapsedPayroll = quarterPayroll * elapsedQuarterRatio;
    return sim.netBeforeIrpfEuros + quarterPayroll - elapsedPayroll;
  }, [sim, simView, payrollPreview?.totals.quarterEmployerCostEuros, elapsedQuarterRatio]);

  useEffect(() => {
    if (editingDeclaredCash) return;
    setDeclaredCashInput(formatEuroEsTwoDecimals(declaredCashEuros).replace(" €", ""));
  }, [declaredCashEuros, editingDeclaredCash]);

  const commitDeclaredCash = useCallback(() => {
    const parsed = parseSpanishDecimalInput(declaredCashInput);
    const freeCash = quarterCash?.freeEuros ?? quarterTotals.cashEuros;
    const safe = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, freeCash)) : declaredCashEuros;
    const nextPct = freeCash > 0 ? Math.round((safe / freeCash) * 100) : 0;
    setSliderPct([nextPct]);
    setEditingDeclaredCash(false);
    void persistSlider(nextPct);
  }, [declaredCashInput, quarterCash?.freeEuros, quarterTotals.cashEuros, declaredCashEuros, persistSlider]);

  if (loading && !sim) {
    return (
      <main className="flex min-h-[min(28rem,calc(100dvh-12rem))] w-full min-w-0 items-center justify-center overflow-x-clip p-6 md:min-h-[min(32rem,calc(100dvh-10rem))] md:p-8">
        <div
          className="glass-panel-strong glass-tint-blue flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl px-8 py-10 text-center shadow-lg md:max-w-md md:px-10 md:py-12"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/50 bg-white/30 shadow-inner">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Hacienda · Simulación</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Cargando simulador</p>
            <p className="mt-1.5 text-sm text-slate-600">Unimos tickets de caja, gastos y ajustes…</p>
          </div>
        </div>
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
    <main className="w-full min-w-0 max-w-full overflow-x-clip p-6 md:p-8">
      <div className="mx-auto max-w-[1200px] min-w-0 space-y-6">
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

        <div className="w-full min-w-0">
          <div
            className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden !rounded-2xl glass-panel-strong glass-tint-blue"
          >
            <div
              className="flex w-full min-w-0 shrink-0 items-stretch overflow-x-clip border-b border-white/40 bg-gradient-to-b from-slate-900/[0.04] to-transparent px-0.5 pt-1.5"
              role="tablist"
              aria-label="Sección simulación"
            >
              {(
                [
                  { id: "actual" as const, label: "Actual" },
                  { id: "historico" as const, label: "Histórico" },
                ] as const
              ).map((tab) => {
                const active = mainTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMainTab(tab.id)}
                    className={cn(
                      "relative -mb-px min-h-[2.25rem] min-w-[5.5rem] shrink-0 select-none border px-3 py-2 text-left text-sm transition-all sm:min-w-[6.5rem] sm:px-4",
                      "rounded-t-md",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-blue-500",
                      active
                        ? "z-10 -mb-px border border-white/50 border-b-transparent bg-white/35 font-semibold text-slate-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]"
                        : "z-0 border border-transparent text-slate-500 hover:bg-white/15 hover:text-slate-800",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

        {mainTab === "historico" ? (
          <div className="grid min-h-0 min-w-0 gap-4 p-5 md:grid-cols-2 md:p-6">
            <div className="glass-inner p-4 ring-1 ring-white/55 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Trimestres guardados</p>
              <p className="mt-1 text-sm text-slate-600">
                Copias estáticas de la simulación (números y ajustes) en el momento de guardar.
              </p>
              {snapshotsErr ? <p className="mt-2 text-xs text-rose-700">{snapshotsErr}</p> : null}
              <div className="mt-3 space-y-2">
                {snapshotsLoading ? <p className="text-sm text-slate-600">Cargando…</p> : null}
                {!snapshotsLoading && snapshots.length === 0 ? (
                  <p className="text-sm text-slate-600">Aún no hay registros. Guarda desde la pestaña Actual.</p>
                ) : null}
                {snapshots.map((s) => {
                  const active = s.id === selectedSnapshotId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSnapshotId(s.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                        active
                          ? "border-blue-300 bg-blue-50/80 text-slate-900"
                          : "border-slate-200/80 bg-white/70 text-slate-800 hover:border-blue-200",
                      )}
                    >
                      <p className="font-semibold">{s.quarter_label ?? `T${s.quarter} ${s.calendar_year}`}</p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Efectivo declarado: {s.declare_cash_percent}% ·{" "}
                        {new Date(s.created_at).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="glass-inner p-4 ring-1 ring-white/55 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Detalle</p>
              {(() => {
                const sel = snapshots.find((x) => x.id === selectedSnapshotId) ?? snapshots[0] ?? null;
                if (!sel) {
                  return <p className="mt-2 text-sm text-slate-600">Selecciona un trimestre de la lista.</p>;
                }
                const snapSim = sel.payload?.simulation as Sim | undefined;
                if (!snapSim) {
                  return <p className="mt-2 text-sm text-slate-600">Este registro no tiene simulación guardada.</p>;
                }
                return (
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{sel.quarter_label ?? `T${sel.quarter} ${sel.calendar_year}`}</p>
                    <p>
                      Hacienda (estim.): <span className="font-semibold">{formatEuroEsWhole(snapSim.totalTaxesEuros)}</span>
                    </p>
                    <p>
                      Dinero limpio (cobrado − impuestos):{" "}
                      <span className="font-semibold text-emerald-700">{formatEuroEsTwoDecimals(snapSim.netAfterTaxesEuros)}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                      IVA 303: {formatEuroEsTwoDecimals(snapSim.ivaToPayEuros)} · IRPF 130:{" "}
                      {formatEuroEsTwoDecimals(snapSim.irpfEuros)} · 115: {formatEuroEsTwoDecimals(snapSim.model115Euros)}
                    </p>
                  </div>
                );
              })()}
            </div>
        </div>
        ) : (
        <div className="grid min-h-0 min-w-0 gap-4 p-5 md:grid-cols-[30fr_50fr_20fr] md:p-6">
          {sim?.liquidityAlert ? (
            <div
              role="alert"
              className="glass-inner md:col-span-3 rounded-lg border border-rose-300/60 bg-gradient-to-br from-rose-100/90 to-rose-50/70 px-5 py-4 text-sm text-rose-900 ring-1 ring-rose-200/50"
            >
              <p className="font-semibold">Atención: liquidez</p>
              <p className="mt-1">
                Los impuestos previstos superan el saldo orientativo en cuenta oficial (
                {formatEuroEsWhole(settings?.officialLiquidityEuros ?? 0)}). Falta aprox. {formatEuroEsWhole(sim.liquidityGapEuros)} para cubrir
                el pago sin entrar en descubierto, o bien reduce gastos / anticipa ingresos declarados.
              </p>
            </div>
          ) : null}
          <div className="md:col-span-3 flex flex-wrap items-center justify-start gap-x-3 gap-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Vista del trimestre</p>
            <div className="inline-flex shrink-0 rounded-lg border border-slate-200/80 bg-white/80 p-0.5">
              <button
                type="button"
                onClick={() => setSimView("elapsed")}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-semibold transition",
                  simView === "elapsed" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                Transcurrido
              </button>
              <button
                type="button"
                onClick={() => setSimView("full")}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-semibold transition",
                  simView === "full" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                Completo
              </button>
            </div>
            <p className="min-w-0 text-[11px] font-medium tabular-nums text-slate-600">
              Del {quarterRangeLabels.from} al {quarterRangeLabels.to}
            </p>
            <span className="hidden h-4 w-px bg-slate-200 sm:inline" aria-hidden />
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-500">Año</span>
              <select
                className="rounded-md border border-slate-200/80 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-800"
                value={calendarYear ?? ""}
                disabled={calendarYear == null || yearOptions.length === 0}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  if (!Number.isFinite(y) || currentQuarter == null) return;
                  const qList = fiscalPeriodOptions?.quartersByYear[String(y)] ?? [1, 2, 3, 4];
                  const nextQ = qList.includes(currentQuarter) ? currentQuarter : Math.max(...qList);
                  void load({ year: y, quarter: nextQ });
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-500">T</span>
              <select
                className="rounded-md border border-slate-200/80 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-800"
                value={quarterSelectValue}
                disabled={currentQuarter == null || calendarYear == null}
                onChange={(e) => {
                  const q = Number(e.target.value);
                  if (!Number.isFinite(q) || calendarYear == null) return;
                  void load({ year: calendarYear, quarter: q });
                }}
              >
                {quarterOptionsForSelect.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="gradient"
              size="sm"
              onClick={() => void saveQuarterSnapshot()}
              disabled={snapshotSaving || calendarYear == null || currentQuarter == null || !sim}
              className="ml-auto h-8 gap-1.5 rounded-xl px-3.5 text-[11px] font-semibold"
            >
              <Save className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {snapshotSaving ? "Guardando…" : "Guardar en histórico"}
            </Button>
          </div>
          <div className="glass-inner p-4 ring-1 ring-white/55 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">La hucha de efectivo</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">¿Qué parte del efectivo declaras?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Bizum y tarjeta se consideran ya trazables al 100% en esta simulación. Solo el efectivo se ajusta con el
              porcentaje.
            </p>
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Efectivo declarado</span>
                <div className="flex items-center gap-2">
                  {saving ? (
                    <span className="text-[10px] font-semibold text-blue-700">Guardando…</span>
                  ) : null}
                  <span className="font-mono text-lg font-bold text-blue-700">{sliderPct[0]}%</span>
                </div>
              </div>
              <Slider
                value={sliderPct}
                onValueChange={setSliderPct}
                onValueCommit={(v) => void persistSlider(v[0] ?? 60)}
                min={0}
                max={100}
                aria-label="Porcentaje de efectivo a declarar"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-violet-200/70 bg-violet-50/70 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                    Declarar del libre
                  </p>
                  <input
                    value={declaredCashInput}
                    onFocus={() => setEditingDeclaredCash(true)}
                    onChange={(e) => setDeclaredCashInput(e.target.value)}
                    onBlur={commitDeclaredCash}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      commitDeclaredCash();
                    }}
                    inputMode="decimal"
                    className="mt-1 w-full rounded-md border border-violet-200/80 bg-white/85 px-2 py-1 text-sm font-semibold text-violet-900 outline-none ring-1 ring-white/70 focus:border-violet-400"
                  />
                </div>
                <div className="rounded-lg border border-fuchsia-200/70 bg-fuchsia-50/70 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-fuchsia-800">Libre definitivo</p>
                  <p className="mt-0.5 text-lg font-bold leading-none text-fuchsia-900">
                    {formatEuroEsTwoDecimals(
                      Math.max(0, (quarterCash?.freeEuros ?? quarterTotals.cashEuros) - declaredCashEuros),
                    )}
                  </p>
                  <p className="mt-0.5 text-[10px] text-fuchsia-900/80">Libre − declarado</p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-cyan-200/70 bg-cyan-50/70 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-800">Pagos Bizum / Tarjeta</p>
                <p className="mt-1 text-lg font-bold leading-none text-cyan-900">
                  {formatEuroEsTwoDecimals(quarterTotals.bizumCardEuros)}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Pago en efectivo</p>
                <p className="mt-1 text-lg font-bold leading-none text-emerald-900">
                  {formatEuroEsTwoDecimals(quarterCash?.totalEuros ?? quarterTotals.cashEuros)}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800">Efectivo facturado</p>
                <p className="mt-1 text-lg font-bold leading-none text-blue-900">
                  {formatEuroEsTwoDecimals(quarterCash?.invoicedEuros ?? 0)}
                </p>
                <p className="mt-1 text-[10px] text-blue-900/80">Trazable por factura</p>
              </div>
              <div className="rounded-lg border border-violet-200/70 bg-violet-50/70 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">Efectivo libre</p>
                <p className="mt-0.5 text-lg font-bold leading-none text-violet-900">
                  {formatEuroEsTwoDecimals(quarterCash?.freeEuros ?? quarterTotals.cashEuros)}
                </p>
                <p className="mt-0.5 text-[10px] text-violet-900/80">Efectivo no trazable</p>
              </div>
            </div>
          </div>

          {sim ? (
            <div className="glass-inner p-4 ring-1 ring-white/55 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">La hucha fiscal</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Si declaras el {sim.declareCashPercent}% del efectivo…
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                Hacienda (estim. trim. {quarter}): {formatEuroEsWhole(sim.totalTaxesEuros)}
              </p>
              <p className="mt-2 whitespace-nowrap text-sm text-slate-700">
                Dinero limpio después de impuestos (todo lo cobrado − impuestos): <span className="font-semibold text-emerald-700">{formatEuroEsTwoDecimals(sim.netAfterTaxesEuros)}</span>
              </p>
              <div className="mt-2.5 rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2">
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <Wallet className="h-3.5 w-3.5" /> Caja
                    </span>
                    <span className="rounded-md border border-cyan-200/70 bg-cyan-50/70 px-2 py-1 font-semibold text-cyan-900">
                      {sim.realTotalEuros > 0 ? "Positiva" : "Sin cobros"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <TrendingUp className="h-3.5 w-3.5" /> Margen
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 font-semibold ${
                        netBeforeForView > 0
                          ? "border border-emerald-200/70 bg-emerald-50/70 text-emerald-900"
                          : "border border-rose-200/70 bg-rose-50/70 text-rose-900"
                      }`}
                    >
                      {netBeforeForView > 0 ? "Positivo" : "Nulo/Negativo"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <ShieldAlert className="h-3.5 w-3.5" /> Riesgo
                    </span>
                    <span
                      className={`rounded-md px-2 py-1 font-semibold ${
                        netBeforeForView > 0 &&
                        sim.realTotalEuros > 0 &&
                        sim.netAfterTaxesEuros / sim.realTotalEuros >= 0.25
                          ? "border border-emerald-200/70 bg-emerald-50/70 text-emerald-900"
                          : "border border-rose-200/70 bg-rose-50/70 text-rose-900"
                      }`}
                    >
                      {netBeforeForView > 0 &&
                      sim.realTotalEuros > 0 &&
                      sim.netAfterTaxesEuros / sim.realTotalEuros >= 0.25
                        ? "Bajo"
                        : "Alto"}
                    </span>
                  </div>
                </div>
                {simView === "elapsed" ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-600">
                    Vista transcurrida: el margen descuenta solo la parte devengada de salarios del trimestre.
                  </p>
                ) : null}
                <p className="mt-1.5 text-[10px] leading-snug text-slate-600">
                  Caja positiva no siempre implica beneficio: puede alcanzar para cubrir estructura, pero no salarios.
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-lg border border-blue-200/70 bg-blue-50/70 p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-800">
                    <span>IVA (303)</span>
                    <TaxModelHelpIcon model="303" iconClassName="text-blue-800/90" />
                  </div>
                  <p className="mt-0.5 text-[1.65rem] font-bold leading-none text-blue-900">{formatEuroEsTwoDecimals(sim.ivaToPayEuros)}</p>
                  <p className="mt-1 text-[10px] text-blue-900/80">
                    {formatEuroEsTwoDecimals(sim.ivaOutputEuros)} - {formatEuroEsTwoDecimals(sim.ivaInputEuros)}
                  </p>
                  <p className="mt-1.5 text-[10px] leading-snug text-blue-900/85">
                    Lo que cobras de IVA menos el IVA que pagas en gastos. Ejemplo: 500 € cobrados y 200 € soportados → 300
                    € a ingresar.
                  </p>
                </div>
                <div className="rounded-lg border border-violet-200/70 bg-violet-50/70 p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-800">
                    <span>IRPF (130)</span>
                    <TaxModelHelpIcon model="130" iconClassName="text-violet-800/90" />
                  </div>
                  <p className="mt-0.5 text-[1.65rem] font-bold leading-none text-violet-900">{formatEuroEsTwoDecimals(sim.irpfEuros)}</p>
                  <p className="mt-1 text-[10px] text-violet-900/80">20% sobre beneficio estimado</p>
                  <p className="mt-1.5 text-[10px] leading-snug text-violet-900/85">
                    Adelanto trimestral de IRPF: con beneficio estimado 2.000 €, aprox. 400 € en este modelo.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/70 p-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                    <span>Alquiler (115)</span>
                    <TaxModelHelpIcon model="115" iconClassName="text-amber-800/90" />
                  </div>
                  <p className="mt-0.5 text-[1.65rem] font-bold leading-none text-amber-900">{formatEuroEsTwoDecimals(sim.model115Euros)}</p>
                  <p className="mt-1 text-[10px] text-amber-900/80">Solo si el local es alquilado</p>
                  <p className="mt-1.5 text-[10px] leading-snug text-amber-900/85">
                    Retención sobre alquiler del local (típ. 19%). Sin alquiler, este importe es 0.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600">
                Efectivo no declarado en simulación:{" "}
                <span className="font-semibold">
                  {formatEuroEsTwoDecimals(
                    Math.max(0, (quarterCash?.freeEuros ?? quarterTotals.cashEuros) - declaredCashEuros),
                  )}
                </span>
              </p>
              {sim.ivaNetEuros < 0 ? (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  En este trimestre te sale IVA a compensar ({formatEuroEsTwoDecimals(sim.ivaNetEuros)}). Por eso el 303
                  mostrado queda en 0 en esta vista (solo pago, no saldo a compensar).
                </p>
              ) : null}
              <div className="mt-2 rounded-lg border border-blue-200/70 bg-blue-50/55 p-2.5">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Resumen fácil de la hucha
                  <span className="inline-flex items-center text-blue-700" aria-hidden>
                    <CircleHelp className="h-4 w-4" />
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  Lo que apartas para Hacienda en el trimestre sale de sumar 303 + 130 + 115.
                </p>
                <details className="mt-2 text-xs text-slate-700">
                  <summary className="cursor-pointer font-medium text-blue-800">Ver ejemplo paso a paso</summary>
                  <p className="mt-1 leading-snug">
                    Si el 303 son 300 €, el 130 son 400 € y el 115 son 100 €, la hucha recomendada para el trimestre
                    sería 800 €.
                  </p>
                </details>
              </div>
            </div>
          ) : null}

            <div className="glass-inner p-3 ring-1 ring-white/55 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Leyenda de impuestos</p>
            <div className="mt-2.5 grid gap-1.5">
              {TAX_MODEL_LEGEND.map((m) => {
                const warning = warningByModel.get(m.model);
                return (
                  <div key={m.model} className="rounded-lg border border-slate-200/70 bg-white/75 p-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      {m.title}
                      <TaxModelHelpIcon model={m.model} />
                      {warning ? (
                        <span
                          title={warning}
                          className="inline-flex cursor-help items-center text-amber-600"
                          aria-label={`Aviso ${m.title}`}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}
          </div>
        </div>

        {mainTab === "actual" ? (
        <>
        {payrollPreview ? (
          <section className="glass-panel glass-tint-emerald p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Nóminas (orientativo)</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Qué cuesta y qué se retiene (asalariados)</h2>
                <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                  Números del trimestre según el equipo. El verde de la izquierda entra en el cálculo de IRPF del simulador.
                </p>
              </div>
              <div className="glass-inner border border-emerald-200/60 bg-white/70 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Perfiles asalariados activos</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{payrollPreview.totals.salariedCount}</p>
              </div>
            </div>

            <div className="mt-6 grid min-h-0 min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-[30fr_30fr_40fr]">
              <div className="min-w-0 space-y-4">
                <div className="glass-inner border border-cyan-200/60 bg-cyan-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">Suma nóminas bruto</p>
                  <p className="mt-2 text-xl font-bold text-cyan-900">
                    {formatEuroEsWhole(payrollPreview.totals.quarterGrossEuros)}
                  </p>
                  <p className="mt-1 text-xs text-cyan-900/80">
                    {formatEuroEsWhole(payrollPreview.totals.annualGrossEuros)} al año ·{" "}
                    {formatEuroEsWhole(payrollPreview.totals.monthlyEquivalentEuros)} mes equivalente
                  </p>
                </div>
                <div className="glass-inner border border-violet-200/60 bg-violet-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">+ SS empresa</p>
                  <p className="mt-2 text-xl font-bold text-violet-900">
                    +{formatEuroEsWhole(payrollPreview.totals.quarterEmployerSocialSecurityEuros)}
                  </p>
                  <p className="mt-1 text-xs text-violet-900/80">
                    {payrollPreview.assumptions.employerSocialSecurityPercent}% sobre bruto
                  </p>
                </div>
                <div className="glass-inner border border-emerald-200/60 bg-emerald-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">= Coste empresa trim.</p>
                  <p className="mt-2 text-xl font-bold text-emerald-900">
                    {formatEuroEsWhole(payrollPreview.totals.quarterEmployerCostEuros)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-900/80">Se descuenta como gasto en IRPF</p>
                </div>
              </div>

              <div className="min-w-0 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="glass-inner border border-amber-200/60 bg-amber-50/70 p-5">
                    <details className="w-full min-w-0">
                      <summary
                        className={cn(
                          "flex w-full cursor-pointer list-none items-center justify-between gap-2 rounded-md py-0.5 text-left text-xs font-semibold uppercase tracking-wide text-amber-800",
                          "hover:bg-amber-100/25",
                          "[&::-webkit-details-marker]:hidden",
                        )}
                      >
                        <span className="sr-only">Más información sobre el modelo 111</span>
                        <span className="min-w-0 flex-1 pr-1">Modelo 111 (trimestral)</span>
                        <span className="shrink-0 text-amber-800/90" aria-hidden>
                          <CircleHelp className="h-3.5 w-3.5" />
                        </span>
                      </summary>
                      <p className="mt-1.5 border-b border-amber-200/50 pb-2 text-left text-[10px] font-normal normal-case leading-snug tracking-normal text-amber-950/85">
                        Lo ingresas tú; es el IRPF retenido al empleado. La cifra es la de la caja de encima, no otra.
                      </p>
                    </details>
                    <p className="mt-2 text-2xl font-bold text-amber-900">
                      {formatEuroEsWhole(payrollPreview.totals.model111QuarterEuros)}
                    </p>
                    <p className="mt-1 text-xs text-amber-900/85">
                      Retención IRPF de nómina ({payrollPreview.assumptions.employeeIrpfRetentionPercent}% estimado)
                    </p>
                  </div>
                  <div className="glass-inner border border-fuchsia-200/60 bg-fuchsia-50/70 p-5">
                    <details className="w-full min-w-0">
                      <summary
                        className={cn(
                          "flex w-full cursor-pointer list-none items-center justify-between gap-2 rounded-md py-0.5 text-left text-xs font-semibold uppercase tracking-wide text-fuchsia-800",
                          "hover:bg-fuchsia-100/30",
                          "[&::-webkit-details-marker]:hidden",
                        )}
                      >
                        <span className="sr-only">Más información sobre el modelo 190</span>
                        <span className="min-w-0 flex-1 pr-1">Modelo 190 (anual)</span>
                        <span className="shrink-0 text-fuchsia-800/90" aria-hidden>
                          <CircleHelp className="h-3.5 w-3.5" />
                        </span>
                      </summary>
                      <p className="mt-1.5 border-b border-fuchsia-200/50 pb-2 text-left text-[10px] font-normal normal-case leading-snug tracking-normal text-fuchsia-950/85">
                        Declaración informativa al año, no un cobro aparte. La cifra es la de esta caja.
                      </p>
                    </details>
                    <p className="mt-2 text-2xl font-bold text-fuchsia-900">
                      {formatEuroEsWhole(payrollPreview.totals.model190YearEuros)}
                    </p>
                    <p className="mt-1 text-xs text-fuchsia-900/85">Resumen anual de retenciones de trabajo</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <span>
                    SS trabajador estimada ({payrollPreview.assumptions.employeeSocialSecurityPercent}%):{" "}
                    <span className="font-semibold text-slate-800">
                      {formatEuroEsWhole(payrollPreview.totals.quarterEmployeeSocialSecurityEuros)}
                    </span>
                  </span>
                  <span>
                    Neto nóminas trimestre (aprox.):{" "}
                    <span className="font-semibold text-slate-800">
                      {formatEuroEsWhole(payrollPreview.totals.quarterNetPayrollEuros)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="glass-inner min-w-0 p-3 ring-1 ring-white/55 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Leyenda de costes de nómina</p>
                <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-x-2 sm:gap-y-1.5">
                  {PAYROLL_COST_LEGEND.map((row) => (
                    <PayrollCostLegendItem
                      key={row.title}
                      title={row.title}
                      badge={row.badge}
                      description={row.description}
                      cargaNegocio={row.cargaNegocio}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 w-full min-w-0 md:mt-5">
              <div className="glass-inner w-full max-w-full overflow-x-auto rounded-lg border border-slate-200/60 bg-white/55">
                <p className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold text-slate-800">
                  Perfiles asalariados (bruto de referencia)
                </p>
                <table className="w-full min-w-0 text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3 text-right">Bruto anual</th>
                      <th className="px-4 py-3 text-right">Al mes (equiv.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollPreview.salariedProfiles.map((p) => (
                      <tr key={p.name} className="text-slate-800">
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatEuroEsWhole(p.annualGrossEuros)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {formatEuroEsWhole(p.monthlyEquivalentEuros)}
                        </td>
                      </tr>
                    ))}
                    {payrollPreview.salariedProfiles.length === 0 ? (
                      <tr>
                        <td className="px-4 py-3 text-slate-500" colSpan={3}>
                          Ninguno marcado en equipo; los números de arriba salen en 0 o no aplica.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
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
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-violet-500" />
                  <span>IVA (303)</span>
                  <TaxModelHelpIcon model="303" />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-500" />
                  <span>IRPF (130)</span>
                  <TaxModelHelpIcon model="130" />
                </span>
                <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-slate-500">
                  <span>Importe debajo = total trimestre (incl.</span>
                  <span className="inline-flex items-center gap-0.5">
                    115
                    <TaxModelHelpIcon model="115" iconClassName="text-slate-500" />
                  </span>
                  <span>)</span>
                </span>
              </div>
            </div>

            <div className="glass-inner mt-6 overflow-x-auto rounded-lg border border-slate-200/60 bg-white/45">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Trimestre</th>
                    <th className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span>IVA (303)</span>
                        <TaxModelHelpIcon model="303" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span>IRPF (130)</span>
                        <TaxModelHelpIcon model="130" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span>115 alquiler</span>
                        <TaxModelHelpIcon model="115" />
                      </div>
                    </th>
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
                      employeeIrpfRetentionPercent: Number(fd.get("empIrpf")),
                      employeeSocialSecurityPercent: Number(fd.get("empSs")),
                      employerSocialSecurityPercent: Number(fd.get("companySs")),
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
            <label className="block text-sm">
              <span className="font-medium text-slate-700">IRPF nómina trabajador (%)</span>
              <input
                name="empIrpf"
                type="number"
                min={0}
                max={60}
                step="0.01"
                defaultValue={settings?.employeeIrpfRetentionPercent ?? 15}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">SS trabajador (%)</span>
              <input
                name="empSs"
                type="number"
                min={0}
                max={30}
                step="0.01"
                defaultValue={settings?.employeeSocialSecurityPercent ?? 6.35}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">SS empresa (%)</span>
              <input
                name="companySs"
                type="number"
                min={0}
                max={60}
                step="0.01"
                defaultValue={settings?.employerSocialSecurityPercent ?? 31.4}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700",
                  saving && "opacity-60",
                )}
              >
                <Save className="h-4 w-4" aria-hidden />
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
        </>
        ) : null}
      </div>
    </main>
  );
}
