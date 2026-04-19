import { AltaUsuarioForm } from "@/components/dashboard/AltaUsuarioForm";

export default function AltaUsuariosPage() {
  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-7xl overflow-hidden p-6 md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Configuración
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Alta de usuarios
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Accesos con PIN. Admin: opción de QR Authenticator al primer login. Foto web
              opcional (si no, avatar por defecto).
            </p>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <div
              className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)] md:p-6 lg:p-7"
              role="region"
              aria-labelledby="alta-form-title"
            >
              <h2
                id="alta-form-title"
                className="border-b border-slate-100 pb-2 text-base font-semibold text-slate-900"
              >
                Nuevo acceso
              </h2>
              <p className="mt-1 text-xs text-slate-500">Datos y crear.</p>

              <AltaUsuarioForm layout="wide" className="mt-5" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
