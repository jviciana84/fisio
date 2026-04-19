import { AltaUsuarioForm } from "@/components/dashboard/AltaUsuarioForm";

export default function AltaUsuariosPage() {
  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-5xl overflow-hidden p-6 md:p-8 lg:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-0">
          <div className="min-w-0 flex-1 lg:max-w-md lg:pr-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Configuración
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Alta de usuarios
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-[15px]">
              Crea accesos con PIN. Si el rol es administrador y activas el
              autenticador en el primer acceso, al iniciar sesión verá el QR de
              Google Authenticator antes de entrar al panel. Puedes subir una foto
              para la web; si no, se usará un avatar ilustrado automático.
            </p>
          </div>

          <div
            className="hidden shrink-0 lg:block lg:w-px lg:self-stretch lg:bg-gradient-to-b lg:from-transparent lg:via-slate-300 lg:to-transparent"
            aria-hidden
          />
          <hr className="border-slate-200 lg:hidden" />

          <div className="min-w-0 flex-1 lg:min-w-[min(100%,28rem)] lg:pl-10 xl:min-w-[34rem]">
            <div
              className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06)] md:p-6"
              role="region"
              aria-labelledby="alta-form-title"
            >
              <h2
                id="alta-form-title"
                className="border-b border-slate-100 pb-2 text-base font-semibold text-slate-900"
              >
                Nuevo acceso
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Completa los datos y pulsa crear usuario.
              </p>

              <AltaUsuarioForm className="mt-5 space-y-4" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
