import { PendingLeadAlarmSettingsForm } from "@/components/dashboard/PendingLeadAlarmSettingsForm";

export default function ConfiguracionAlarmaLeadsPage() {
  return (
    <main className="p-6 md:p-8">
      <div className="glass-panel mx-auto max-w-3xl overflow-hidden p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Configuración</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Alarma — leads pendientes</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Cuando hay interesados en bono pendientes de llamada, el panel puede mostrar un aviso global y reproducir un
          breve tono. Aquí ajustas repeticiones, pausas, volumen, tonos o silencias la alarma.
        </p>

        <div
          className="mt-8 rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.12)] md:p-6"
          role="region"
          aria-labelledby="alarm-form-title"
        >
          <h2 id="alarm-form-title" className="border-b border-slate-100 pb-2 text-base font-semibold text-slate-900">
            Perfil de sonido (n.º 1)
          </h2>
          <p className="mt-1 text-xs text-slate-500">Un solo perfil; ampliable en el futuro si hace falta.</p>
          <div className="mt-6">
            <PendingLeadAlarmSettingsForm />
          </div>
        </div>
      </div>
    </main>
  );
}
