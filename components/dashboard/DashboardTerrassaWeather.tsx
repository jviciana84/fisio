import type { TerrassaWeather } from "@/lib/weather/terrassa";
import { TERRASSA } from "@/lib/weather/terrassa";
import { WeatherWmoIcon } from "@/components/dashboard/WeatherWmoIcon";

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  });
}

export function DashboardTerrassaWeather({ weather }: { weather: TerrassaWeather | null }) {
  if (!weather) {
    return (
      <section className="glass-panel-strong glass-tint-cyan flex h-full min-h-[320px] flex-1 flex-col justify-center p-6 md:p-8 xl:min-h-0">
        <p className="text-sm text-slate-600">No se pudo cargar el tiempo. Inténtalo más tarde.</p>
      </section>
    );
  }

  return (
    <section className="glass-panel-strong glass-tint-cyan relative flex h-full min-h-[320px] flex-1 flex-col overflow-hidden p-6 md:p-8 xl:min-h-0">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/25 to-blue-600/20 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col justify-between gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700/90">Tiempo</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 md:text-xl">{TERRASSA.name}</h2>
          <p className="mt-1 text-xs text-slate-500" title={weather.fetchedAt}>
            Última actualización: {formatFetchedAt(weather.fetchedAt)} · Open-Meteo
          </p>
        </div>

        <div className="flex items-center gap-4">
          <WeatherWmoIcon code={weather.weatherCode} className="h-14 w-14 shrink-0 md:h-16 md:w-16" />
          <div>
            <p className="text-4xl font-bold tabular-nums tracking-tight text-slate-900 md:text-5xl">
              {weather.currentTemp}°
            </p>
            <p className="text-sm font-medium text-slate-600">{weather.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              Hoy · máx {weather.todayMax}° / mín {weather.todayMin}°
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">7 días</p>
          <div className="mt-3 grid grid-cols-7 gap-1.5 overflow-x-auto pb-1 sm:gap-2">
            {weather.week.slice(0, 7).map((d) => (
              <div
                key={d.dateISO}
                className="glass-inner flex min-w-[3.25rem] flex-col items-center px-1 py-2 text-center shadow-sm ring-1 ring-white/45"
              >
                <span className="text-[10px] font-medium capitalize text-slate-500">{d.weekdayShort}</span>
                <WeatherWmoIcon code={d.weatherCode} className="my-1 h-8 w-8" />
                <span className="text-[10px] font-semibold tabular-nums text-slate-800">
                  {d.maxC}° <span className="font-normal text-slate-400">/</span> {d.minC}°
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
