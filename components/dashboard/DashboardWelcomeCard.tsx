import Link from "next/link";

export function DashboardWelcomeCard({
  userName,
  isAdmin,
  activeStaffCount,
  gastosFijosMensualesEuros,
}: {
  userName: string;
  isAdmin: boolean;
  activeStaffCount: number;
  gastosFijosMensualesEuros: number;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <section className="glass-panel-strong glass-tint-blue flex h-full min-h-[320px] flex-1 flex-col justify-between rounded-2xl p-6 md:p-8 xl:min-h-0">
      <div className="glass-inner rounded-2xl p-5 md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600/90">Panel</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Bienvenido, {userName}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
          {isAdmin ? (
            <>
              Aquí tienes el pulso del día: equipo, gastos recurrentes y enlaces rápidos. Los ingresos por mes y método
              de pago están en la zona inferior.
            </>
          ) : (
            <>
              Registra cobros y genera el bono desde <span className="font-medium text-slate-800">Caja</span> más abajo.
              Si necesitas consultar ingresos o gastos, pide acceso al administrador.
            </>
          )}
        </p>
      </div>

      {isAdmin ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="glass-inner rounded-2xl px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Equipo activo</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{activeStaffCount}</p>
          </div>
          <div className="glass-inner rounded-2xl px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Gasto fijo mensual (est.)</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{fmt(gastosFijosMensualesEuros)}</p>
          </div>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/configuracion/usuarios"
            className="rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1.5 text-xs font-medium text-blue-800 transition hover:bg-blue-100/90"
          >
            Usuarios
          </Link>
          <Link
            href="/dashboard/configuracion/gastos"
            className="rounded-full border border-slate-200/80 bg-white/60 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white/90"
          >
            Gastos
          </Link>
          <Link
            href="/dashboard/fiscal"
            className="rounded-full border border-cyan-200/80 bg-cyan-50/80 px-3 py-1.5 text-xs font-medium text-cyan-900 transition hover:bg-cyan-100/90"
          >
            Impuestos
          </Link>
        </div>
      ) : null}
    </section>
  );
}
