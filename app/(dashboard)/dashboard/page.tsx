import Link from "next/link";
import { getStaffSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { CashRegisterCard } from "@/components/dashboard/CashRegisterCard";
import { QuarterHealthCard } from "@/components/fiscal/QuarterHealthCard";
import { DashboardWelcomeCard } from "@/components/dashboard/DashboardWelcomeCard";
import { DashboardTerrassaWeather } from "@/components/dashboard/DashboardTerrassaWeather";
import { DashboardIncomeCards } from "@/components/dashboard/DashboardIncomeCards";
import { DashboardTrendChart } from "@/components/dashboard/DashboardTrendChart";
import { fetchTerrassaWeather } from "@/lib/weather/terrassa";

export const dynamic = "force-dynamic";

type ExpenseRow = {
  amount_cents: number;
  recurrence: "none" | "weekly" | "monthly" | "quarterly" | "semiannual" | "annual";
  expense_date: string;
};

type TicketRow = {
  total_cents: number;
  payment_method: "cash" | "bizum" | "card";
  created_at: string;
};

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
    fetchTerrassaWeather(),
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

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Fila 1: bienvenida + tiempo Terrassa */}
        <div className="grid gap-5 xl:col-span-12 xl:grid-cols-12 xl:min-h-[420px] xl:items-stretch">
          <div className="flex min-h-0 flex-col xl:col-span-7">
            <DashboardWelcomeCard
              userName={userName}
              isAdmin={session?.role === "admin"}
              activeStaffCount={activeUsers}
              gastosFijosMensualesEuros={gastosFijosMensuales}
            />
          </div>
          <div className="flex min-h-0 flex-col xl:col-span-5">
            <DashboardTerrassaWeather weather={weather} />
          </div>
        </div>

        {/* Ingresos + impuestos (misma fila en xl) */}
        {session?.role === "admin" ? (
          <div className="grid gap-5 xl:col-span-12 xl:grid-cols-12 xl:items-stretch">
            <div className="flex min-h-0 flex-col xl:col-span-7">
              <DashboardIncomeCards tickets={tickets} />
            </div>
            <div className="flex min-h-0 flex-col xl:col-span-5">
              <QuarterHealthCard />
            </div>
          </div>
        ) : (
          <div className="xl:col-span-12">
            <DashboardIncomeCards tickets={tickets} />
          </div>
        )}

        <DashboardTrendChart tickets={tickets} expenses={expenses} />

        <CashRegisterCard />

        <section className="glass-panel glass-tint-emerald xl:col-span-12 rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Accesos</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Gestión rápida</h2>
          <p className="mt-2 text-xs text-slate-600">
            Enlaces al catálogo, usuarios y gastos. El detalle de impuestos está en Impuestos (admin).
          </p>
          <div className="mt-4 space-y-2">
            <Link
              href="/dashboard/configuracion/usuarios"
              className="glass-inner block rounded-xl px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white/25"
            >
              Usuarios
            </Link>
            <Link
              href="/dashboard/configuracion/productos"
              className="glass-inner block rounded-xl px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white/25"
            >
              Productos / precios
            </Link>
            <Link
              href="/dashboard/configuracion/gastos"
              className="glass-inner block rounded-xl px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-white/25"
            >
              Gastos fijos
            </Link>
            {session?.role === "admin" ? (
              <Link
                href="/dashboard/fiscal"
                className="block rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500/15 to-teal-500/10 px-4 py-3 text-sm font-medium text-cyan-950 backdrop-blur-sm transition hover:from-cyan-500/25 hover:to-teal-500/15"
              >
                Simulador fiscal
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
