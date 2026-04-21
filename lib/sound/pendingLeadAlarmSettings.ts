export const PENDING_LEAD_ALARM_STORAGE_KEY = "fisio_pending_lead_alarm_v1";

export type PendingLeadAlarmSettings = {
  /** Si true, no se reproduce nada al mostrar el aviso global. */
  muted: boolean;
  /** Veces que suena el par de pitidos (1–6). */
  repetitions: number;
  /** Segundos de silencio entre cada repetición del par (0–5). */
  pauseBetweenSeconds: number;
  /** Volumen percibido 0–100. */
  volumePercent: number;
  /** Frecuencia del primer tono (Hz). */
  tone1Hz: number;
  /** Frecuencia del segundo tono (Hz). */
  tone2Hz: number;
};

export const DEFAULT_PENDING_LEAD_ALARM: PendingLeadAlarmSettings = {
  muted: false,
  repetitions: 2,
  pauseBetweenSeconds: 0.35,
  volumePercent: 45,
  tone1Hz: 880,
  tone2Hz: 700,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function numOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function coerce(raw: unknown): PendingLeadAlarmSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PENDING_LEAD_ALARM };
  const o = raw as Record<string, unknown>;
  const d = DEFAULT_PENDING_LEAD_ALARM;
  return {
    muted: Boolean(o.muted),
    repetitions: clamp(Math.round(numOr(o.repetitions, d.repetitions)), 1, 6),
    pauseBetweenSeconds: clamp(numOr(o.pauseBetweenSeconds, d.pauseBetweenSeconds), 0, 5),
    volumePercent: clamp(Math.round(numOr(o.volumePercent, d.volumePercent)), 0, 100),
    tone1Hz: clamp(Math.round(numOr(o.tone1Hz, d.tone1Hz)), 300, 1400),
    tone2Hz: clamp(Math.round(numOr(o.tone2Hz, d.tone2Hz)), 300, 1400),
  };
}

export function loadPendingLeadAlarmSettings(): PendingLeadAlarmSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PENDING_LEAD_ALARM };
  try {
    const raw = window.localStorage.getItem(PENDING_LEAD_ALARM_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PENDING_LEAD_ALARM };
    return coerce(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_PENDING_LEAD_ALARM };
  }
}

export function savePendingLeadAlarmSettings(s: PendingLeadAlarmSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_LEAD_ALARM_STORAGE_KEY, JSON.stringify(coerce(s)));
  } catch {
    /* quota / privado */
  }
}
