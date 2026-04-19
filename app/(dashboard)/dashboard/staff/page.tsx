import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { StaffAltaUsuarioModal } from "@/components/dashboard/StaffAltaUsuarioModal";

export const dynamic = "force-dynamic";

type StaffRow = {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

type TicketRow = {
  total_cents: number;
  payment_method: "cash" | "bizum" | "card";
  created_by_staff_id: string | null;
};

type WorkLogRow = {
  staff_id: string;
  worked_minutes: number;
};

type StaffMetric = {
  id: string;
  name: string;
  role: string;
  salesCount: number;
  totalSalesEuros: number;
  bizumEuros: number;
  cashEuros: number;
  workedHours: number;
};

function euro(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function hours(value: number): string {
  return `${value.toFixed(1)} h`;
}

export default async function StaffDashboardPage() {
  const supabase = createSupabaseAdminClient();
  const [staffRes, ticketsRes, logsRes] = await Promise.all([
    supabase
      .from("staff_access")
      .select("id, full_name, role, is_active")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase.from("cash_tickets").select("total_cents, payment_method, created_by_staff_id"),
    supabase.from("staff_work_logs").select("staff_id, worked_minutes"),
  ]);

  const staff = (staffRes.data ?? []) as StaffRow[];
  const tickets = (ticketsRes.data ?? []) as TicketRow[];
  const logs = (logsRes.data ?? []) as WorkLogRow[];

  const metrics = new Map<string, StaffMetric>();
  for (const s of staff) {
    metrics.set(s.id, {
      id: s.id,
      name: s.full_name,
      role: s.role,
      salesCount: 0,
      totalSalesEuros: 0,
      bizumEuros: 0,
      cashEuros: 0,
      workedHours: 0,
    });
  }

  for (const t of tickets) {
    if (!t.created_by_staff_id) continue;
    const metric = metrics.get(t.created_by_staff_id);
    if (!metric) continue;
    const euros = t.total_cents / 100;
    metric.salesCount += 1;
    metric.totalSalesEuros += euros;
    if (t.payment_method === "bizum") metric.bizumEuros += euros;
    if (t.payment_method === "cash") metric.cashEuros += euros;
  }

  for (const log of logs) {
    const metric = metrics.get(log.staff_id);
    if (!metric) continue;
    metric.workedHours += log.worked_minutes / 60;
  }

  const rows = [...metrics.values()];
  const rankingSales = [...rows].sort((a, b) => b.totalSalesEuros - a.totalSalesEuros);
  const rankingHours = [...rows].sort((a, b) => b.workedHours - a.workedHours);
  const rankingCash = [...rows].sort((a, b) => b.cashEuros - a.cashEuros);

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto grid max-w-[1300px] grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="glass-panel xl:col-span-8 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Staff</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Ventas, horas y cobros por persona
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Vista de rendimiento individual: número de ventas, importe total, cobro por Bizum/Efectivo y horas trabajadas. Cada tarjeta corresponde a un usuario activo en base de datos; las cifras se calculan con los tickets y el registro de horas.
              </p>
            </div>
            <StaffAltaUsuarioModal />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {s.role}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-blue-50 px-2 py-2">
                    <p className="text-slate-500">Ventas</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{s.salesCount}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-2 py-2">
                    <p className="text-slate-500">Horas</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{hours(s.workedHours)}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 px-2 py-2">
                    <p className="text-slate-500">Bizum</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{euro(s.bizumEuros)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-2 py-2">
                    <p className="text-slate-500">Efectivo</p>
                    <p className="mt-0.5 font-semibold text-slate-900">{euro(s.cashEuros)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">
                  Total vendido: {euro(s.totalSalesEuros)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <aside className="glass-panel xl:col-span-4 p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Ranking Staff</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Top rendimiento</h2>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Más venden</p>
              <ol className="mt-2 space-y-1 text-sm">
                {rankingSales.slice(0, 5).map((s, i) => (
                  <li key={`sales-${s.id}`} className="flex items-center justify-between gap-2">
                    <span className="text-slate-700">{i + 1}. {s.name}</span>
                    <span className="font-semibold text-slate-900">{euro(s.totalSalesEuros)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Más horas</p>
              <ol className="mt-2 space-y-1 text-sm">
                {rankingHours.slice(0, 5).map((s, i) => (
                  <li key={`hours-${s.id}`} className="flex items-center justify-between gap-2">
                    <span className="text-slate-700">{i + 1}. {s.name}</span>
                    <span className="font-semibold text-slate-900">{hours(s.workedHours)}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Más cobra en efectivo
              </p>
              <ol className="mt-2 space-y-1 text-sm">
                {rankingCash.slice(0, 5).map((s, i) => (
                  <li key={`cash-${s.id}`} className="flex items-center justify-between gap-2">
                    <span className="text-slate-700">{i + 1}. {s.name}</span>
                    <span className="font-semibold text-slate-900">{euro(s.cashEuros)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
