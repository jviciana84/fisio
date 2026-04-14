export default function DashboardPage() {
  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.15em] text-blue-600">
          Gestion de fisioterapia
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          Panel de personal
        </h1>
        <p className="mt-2 text-slate-600">
          Acceso correcto. El siguiente paso es conectar modulos de pacientes,
          citas, tratamientos y caja con permisos por rol.
        </p>
      </div>
    </main>
  );
}
