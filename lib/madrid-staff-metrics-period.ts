import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const TZ = "Europe/Madrid";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Rango de instantes UTC para tickets: [start, endExclusive) según calendario en Europe/Madrid.
 */
export function madridCurrentMonthTicketInstantRange(now = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const y = Number(formatInTimeZone(now, TZ, "yyyy"));
  const m = Number(formatInTimeZone(now, TZ, "MM"));
  const startLocal = `${y}-${pad2(m)}-01T00:00:00`;
  const start = fromZonedTime(startLocal, TZ);

  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const endExclusiveLocal = `${nextY}-${pad2(nextM)}-01T00:00:00`;
  const endExclusive = fromZonedTime(endExclusiveLocal, TZ);

  return { start, endExclusive };
}

/**
 * Primera y última fecha (YYYY-MM-DD) del mes en curso en Madrid — para `staff_work_logs.work_date`.
 */
export function madridCurrentMonthWorkDateBounds(now = new Date()): { start: string; end: string } {
  const y = Number(formatInTimeZone(now, TZ, "yyyy"));
  const m = Number(formatInTimeZone(now, TZ, "MM"));
  const start = `${y}-${pad2(m)}-01`;
  const lastD = new Date(y, m, 0).getDate();
  const end = `${y}-${pad2(m)}-${pad2(lastD)}`;
  return { start, end };
}

/** Etiqueta legible del mes en curso (Madrid), p. ej. «abril de 2026». */
export function formatMadridMonthYearLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(now);
}
