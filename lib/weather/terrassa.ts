/** Terrassa (Vallès Occidental) — Open-Meteo, sin API key */

export const TERRASSA = {
  name: "Terrassa",
  lat: 41.5667,
  lon: 2.0167,
} as const;

export type DayForecast = {
  dateISO: string;
  weekdayShort: string;
  dayMonth: string;
  weatherCode: number;
  label: string;
  maxC: number;
  minC: number;
};

export type TerrassaWeather = {
  fetchedAt: string;
  currentTemp: number;
  weatherCode: number;
  label: string;
  todayMax: number;
  todayMin: number;
  week: DayForecast[];
};

/** Textos alineados con WMO (Open-Meteo): 0–3 son claros → cubierto por pasos. */
export function labelForWmoCode(code: number): string {
  if (code < 0) return "Sin dato";
  if (code === 0) return "Despejado";
  if (code === 1) return "Mayormente despejado";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Niebla";
  if ([51, 53, 55].includes(code)) return "Llovizna";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "Lluvia";
  if ([71, 73, 75].includes(code)) return "Nieve";
  if ([95, 96, 99].includes(code)) return "Tormenta";
  return "Variable";
}

export async function fetchTerrassaWeather(): Promise<TerrassaWeather | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(TERRASSA.lat),
      longitude: String(TERRASSA.lon),
      current: "temperature_2m,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min",
      timezone: "Europe/Madrid",
      forecast_days: "7",
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
      };
    };

    const times = data.daily?.time ?? [];
    const codes = data.daily?.weather_code ?? [];
    const maxs = data.daily?.temperature_2m_max ?? [];
    const mins = data.daily?.temperature_2m_min ?? [];

    const week: DayForecast[] = times.map((t, i) => {
      const d = new Date(t + "T12:00:00");
      const code = codes[i] ?? 0;
      return {
        dateISO: t,
        weekdayShort: d.toLocaleDateString("es-ES", { weekday: "short" }),
        dayMonth: d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
        weatherCode: code,
        label: labelForWmoCode(code),
        maxC: Math.round(maxs[i] ?? 0),
        minC: Math.round(mins[i] ?? 0),
      };
    });

    const curCode = data.current?.weather_code ?? -1;

    return {
      fetchedAt: new Date().toISOString(),
      currentTemp: Math.round(data.current?.temperature_2m ?? 0),
      weatherCode: curCode,
      label: labelForWmoCode(curCode),
      todayMax: Math.round(maxs[0] ?? 0),
      todayMin: Math.round(mins[0] ?? 0),
      week,
    };
  } catch {
    return null;
  }
}
