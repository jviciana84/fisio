import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export function parseHm(hm: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, mo! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}

/** Genera instantes de inicio de cada hueco (UTC internamente vía fromZonedTime). */
export function generateSlotStartsForDay(
  ymd: string,
  dayStartHm: string,
  dayEndHm: string,
  slotMinutes: number,
  timeZone: string,
): Date[] {
  const s = parseHm(dayStartHm);
  const e = parseHm(dayEndHm);
  if (!s || !e) return [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const startLocal = `${ymd}T${pad(s.h)}:${pad(s.m)}:00`;
  const endLocal = `${ymd}T${pad(e.h)}:${pad(e.m)}:00`;
  const startUtc = fromZonedTime(startLocal, timeZone);
  const endUtc = fromZonedTime(endLocal, timeZone);

  const out: Date[] = [];
  let cur = startUtc;
  while (addMinutes(cur, slotMinutes) <= endUtc) {
    out.push(cur);
    cur = addMinutes(cur, slotMinutes);
  }
  return out;
}

export function eachBookingDateYmd(fromYmd: string, days: number): string[] {
  const list: string[] = [];
  let cur = fromYmd;
  for (let i = 0; i < days; i++) {
    list.push(cur);
    cur = addDaysYmd(cur, 1);
  }
  return list;
}

export function overlapsRange(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}
