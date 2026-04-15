import Link from "next/link";
import { getStaffSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { CashRegisterCard } from "@/components/dashboard/CashRegisterCard";

type ExpenseRow = {
  amount_cents: number;
  recurrence: "none" | "weekly" | "monthly" | "quarterly" | "semiannual" | "annual";
  expense_date: string;
};

type ChartPoint = {
  label: string;
  gastos: number;
  ingresos: number;
  bizum: number;
  efectivo: number;
};

type TicketRow = {
  total_cents: number;
  payment_method: "cash" | "bizum";
  created_at: string;
};

function euros(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonthLabelsLast6(): { key: string; label: string }[] {
  const now = new Date();
  const labels: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-ES", { month: "short" }),
    });
  }
  return labels;
}

function monthlyEquivalent(cents: number, recurrence: ExpenseRow["recurrence"]) {
  const eurosValue = cents / 100;
  switch (recurrence) {
    case "weekly":
      return eurosValue * (52 / 12);
    case "monthly":
      return eurosValue;
    case "quarterly":
      return eurosValue / 3;
    case "semiannual":
      return eurosValue / 6;
    case "annual":
      return eurosValue / 12;
    case "none":
    default:
      return 0;
  }
}

async function fetchWeather() {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=41.3851&longitude=2.1734&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid&forecast_days=3";
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weathercode?: number };
      daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
    };
    return {
      currentTemp: Math.round(data.current?.temperature_2m ?? 0),
      max: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      min: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      weatherCode: data.current?.weathercode ?? -1,
    };
  } catch {
    return null;
  }
}

function weatherLabel(code: number): string {
  if (code === 0) return "Despejado";
  if ([1, 2, 3].includes(code)) return "Parcialmente nublado";
  if ([45, 48].includes(code)) return "Niebla";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Lluvia";
  if ([71, 73, 75].includes(code)) return "Nieve";
  if ([95, 96, 99].includes(code)) return "Tormenta";
  return "Variable";
}

function buildLinePath(values: number[], maxValue: number, width: number, height: number): string {
  if (values.length === 0) return "";
  const stepX = width / (values.length - 1 || 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - (v / (maxValue || 1)) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default async function DashboardPage() {
  const session = await getStaffSession();
  const supabase = createSupabaseAdminClient();

  const [staffRes, meRes, expensesRes, weather] = await Promise.all([
    supabase.from("staff_access").select("id", { count: "exact", head: true }).eq("is_active", true),
    session
      ? supabase.from("staff_access").select("full_name").eq("id", session.userId).maybeSingle()
      : Promise.resolve({ data: null } as { data: { full_name?: string } | null }),
    supabase
      .from("expenses")
      .select("amount_cents, recurrence, expense_date")
      .order("expense_date", { ascending: false }),
    fetchWeather(),
  ]);
  const ticketsRes = await supabase
    .from("cash_tickets")
    .select("total_cents, payment_method, created_at")
    .order("created_at", { ascending: false });

  const userName = meRes.data?.full_name?.trim() || "equipo";
  const activeUsers = staffRes.count ?? 0;
  const expenses = (expensesRes.data ?? []) as ExpenseRow[];
  const tickets = (ticketsRes.data ?? []) as TicketRow[];

  const gastosFijosMensuales = expenses.reduce(
    (acc, e) => acc + monthlyEquivalent(e.amount_cents, e.recurrence),
    0,
  );

  const monthMap = new Map<string, number>();
  const ticketMap = new Map<string, { total: number; bizum: number; efectivo: number }>();
  for (const expense of expenses) {
    const d = new Date(expense.expense_date);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + expense.amount_cents / 100);
  }
  for (const ticket of tickets) {
    const d = new Date(ticket.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const current = ticketMap.get(key) ?? { total: 0, bizum: 0, efectivo: 0 };
    current.total += ticket.total_cents / 100;
    if (ticket.payment_method === "bizum") current.bizum += ticket.total_cents / 100;
    if (ticket.payment_method === "cash") current.efectivo += ticket.total_cents / 100;
    ticketMap.set(key, current);
  }

  const months = getMonthLabelsLast6();
  const chartData: ChartPoint[] = months.map((m) => {
    const gastos = Math.round(monthMap.get(m.key) ?? 0);
    const t = ticketMap.get(m.key) ?? { total: 0, bizum: 0, efectivo: 0 };
    const ingresos = Math.round(t.total);
    const bizum = Math.round(t.bizum);
    const efectivo = Math.round(t.efectivo);
    return { label: m.label, gastos, ingresos, bizum, efectivo };
  });

  const maxChartValue = Math.max(
    1,
    ...chartData.flatMap((p) => [p.gastos, p.ingresos, p.bizum, p.efectivo]),
  );

  const width = 560;
  const height = 210;
  const gastosPath = buildLinePath(
    chartData.map((p) => p.gastos),
    maxChartValue,
    width,
    height,
  );
  const ingresosPath = buildLinePath(
    chartData.map((p) => p.ingresos),
    maxChartValue,
    width,
    height,
  );
  const bizumPath = buildLinePath(
    chartData.map((p) => p.bizum),
    maxChartValue,
    width,
    height,
  );
  const efectivoPath = buildLinePath(
    chartData.map((p) => p.efectivo),
    maxChartValue,
    width,
    height,
  );

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 xl:grid-cols-12">
        <CashRegisterCard />

        <section className="glass-panel-strong xl:col-span-7 xl:row-span-2 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Inicio admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Bienvenido, {userName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-[15px]">
            Vista rápida del negocio con métricas operativas, gastos fijos y evolución mensual.
            Cada widget te lleva a su sección para gestionar con más detalle.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/configuracion/usuarios"
              className="rounded-2xl border border-white/60 bg-white/65 p-5 shadow-sm transition hover:bg-white/80"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">Usuarios activos</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{activeUsers}</p>
              <p className="mt-1 text-xs text-slate-500">
                Horas facturadas: <span className="font-semibold text-slate-700">0 h</span> (pendiente
                módulo de citas/cobros)
              </p>
            </Link>

            <Link
              href="/dashboard/configuracion/gastos"
              className="rounded-2xl border border-white/60 bg-white/65 p-5 shadow-sm transition hover:bg-white/80"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">Gasto fijo mensual</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {euros(gastosFijosMensuales)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Basado en recurrencias ({expenses.length} cargos registrados)
              </p>
            </Link>
          </div>
        </section>

        <section className="glass-panel xl:col-span-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                Pronóstico
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Tiempo en clínica</h2>
            </div>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
              Barcelona
            </span>
          </div>

          {weather ? (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/70 p-4">
                <p className="text-3xl font-bold text-slate-900">{weather.currentTemp}°</p>
                <p className="text-xs text-slate-600">{weatherLabel(weather.weatherCode)}</p>
              </div>
              <div className="rounded-xl bg-white/70 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Hoy</p>
                <p className="mt-1 text-sm text-slate-700">
                  Máx {weather.max}° / Mín {weather.min}°
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-white/70 p-4 text-sm text-slate-600">
              No se pudo cargar el tiempo ahora mismo.
            </p>
          )}
        </section>

        <section className="glass-panel xl:col-span-8 p-6 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                Evolución
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Gastos, ingresos y métodos de pago
              </h2>
            </div>
            <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
              Datos reales desde tickets de caja
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-[220px] min-w-[560px] w-full rounded-xl bg-white/70 p-3"
              role="img"
              aria-label="Gráfica de líneas de gastos, ingresos, bizum y efectivo"
            >
              <path d={ingresosPath} fill="none" stroke="#2563eb" strokeWidth="2.5" />
              <path d={gastosPath} fill="none" stroke="#ef4444" strokeWidth="2.5" />
              <path d={bizumPath} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
              <path d={efectivoPath} fill="none" stroke="#16a34a" strokeWidth="2.5" />
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">Gastos</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
              Ingresos
            </span>
            <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-700">
              Pagos Bizum
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
              Pagos efectivo
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
            {chartData.map((m) => (
              <div key={m.label} className="rounded-lg bg-white/55 px-2 py-1">
                {m.label}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel xl:col-span-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Accesos rápidos
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Widgets de gestión</h2>
          <div className="mt-4 space-y-3">
            <Link
              href="/dashboard/configuracion/usuarios"
              className="block rounded-xl border border-white/60 bg-white/65 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white/80"
            >
              Gestión de usuarios
            </Link>
            <Link
              href="/dashboard/configuracion/productos"
              className="block rounded-xl border border-white/60 bg-white/65 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white/80"
            >
              Catálogo de productos
            </Link>
            <Link
              href="/dashboard/configuracion/gastos"
              className="block rounded-xl border border-white/60 bg-white/65 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white/80"
            >
              Gastos fijos y recurrencias
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
