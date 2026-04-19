/**
 * Datos para el gráfico de tendencia del dashboard (caja + gastos por fecha).
 * Las series se devuelven acumuladas (suma corrida hora a hora o día a día en el periodo).
 */

export type ChartRange = "day" | "week" | "month" | "quarter" | "semester" | "years";

export type TrendPoint = {
  label: string;
  gastos: number;
  ingresos: number;
  bizum: number;
  efectivo: number;
  tarjeta: number;
};

export type ExpenseRow = {
  amount_cents: number;
  recurrence: "none" | "weekly" | "monthly" | "quarterly" | "semiannual" | "annual";
  expense_date: string;
};

export type TicketRow = {
  total_cents: number;
  payment_method: "cash" | "bizum" | "card";
  created_at: string;
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lunes 00:00 (hora local) de la semana que contiene `d` (ISO: semana empieza en lunes). */
function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const dow = x.getDay(); // 0 = domingo … 6 = sábado
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  return addDays(x, -daysFromMonday);
}

/** Primer día del trimestre natural (Ene–Mar, Abr–Jun, etc.). */
function startOfQuarterCal(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

/** Primer día del semestre natural: 1 ene o 1 jul. */
function startOfSemesterCal(d: Date): Date {
  return d.getMonth() < 6 ? new Date(d.getFullYear(), 0, 1) : new Date(d.getFullYear(), 6, 1);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Convierte valores por bucket (hora o día) en totales acumulados desde el inicio del periodo.
 * Así se comparan pendientes (gastos vs ingresos) y la evolución de efectivo vs Bizum.
 */
export function cumulateTrendPoints(points: TrendPoint[]): TrendPoint[] {
  let gastos = 0;
  let ingresos = 0;
  let bizum = 0;
  let efectivo = 0;
  let tarjeta = 0;
  return points.map((p) => {
    gastos += p.gastos;
    ingresos += p.ingresos;
    bizum += p.bizum;
    efectivo += p.efectivo;
    tarjeta += p.tarjeta;
    return {
      ...p,
      gastos,
      ingresos,
      bizum,
      efectivo,
      tarjeta,
    };
  });
}

/** Escala máxima “bonita” para el eje Y (evita líneas pegadas al borde). */
export function niceCeiling(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 100;
  const exp = Math.floor(Math.log10(n));
  const pow = 10 ** exp;
  const m = n / pow;
  let nice: number;
  if (m <= 1) nice = 1;
  else if (m <= 2) nice = 2;
  else if (m <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}

export function buildTrendSeries(
  range: ChartRange,
  tickets: TicketRow[],
  expenses: ExpenseRow[],
  nowInput?: Date,
): TrendPoint[] {
  const now = nowInput ? new Date(nowInput) : new Date();

  const empty = (): TrendPoint => ({
    label: "",
    gastos: 0,
    ingresos: 0,
    bizum: 0,
    efectivo: 0,
    tarjeta: 0,
  });

  const addTicket = (p: TrendPoint, t: TicketRow) => {
    const eur = t.total_cents / 100;
    p.ingresos += eur;
    if (t.payment_method === "bizum") p.bizum += eur;
    else if (t.payment_method === "cash") p.efectivo += eur;
    else if (t.payment_method === "card") p.tarjeta += eur;
  };

  const addExpense = (p: TrendPoint, cents: number) => {
    p.gastos += cents / 100;
  };

  if (range === "day") {
    const points: TrendPoint[] = [];
    for (let h = 23; h >= 0; h--) {
      const slot = new Date(now);
      slot.setMinutes(0, 0, 0);
      slot.setHours(slot.getHours() - h);
      const start = new Date(slot);
      const end = new Date(slot);
      end.setHours(end.getHours() + 1);
      const p = empty();
      p.label = `${pad2(start.getHours())}:00`;
      for (const t of tickets) {
        const c = new Date(t.created_at);
        if (c >= start && c < end) addTicket(p, t);
      }
      const dayStart = startOfDay(start);
      const dayEnd = addDays(dayStart, 1);
      for (const e of expenses) {
        const ed = new Date(e.expense_date);
        if (!Number.isNaN(ed.getTime()) && ed >= dayStart && ed < dayEnd) {
          addExpense(p, e.amount_cents);
        }
      }
      points.push(p);
    }
    return cumulateTrendPoints(points);
  }

  if (range === "week") {
    const points: TrendPoint[] = [];
    const monday = startOfWeekMonday(now);
    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i);
      const next = addDays(day, 1);
      const p = empty();
      p.label = day.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
      for (const t of tickets) {
        const c = new Date(t.created_at);
        if (c >= day && c < next) addTicket(p, t);
      }
      for (const e of expenses) {
        const ed = new Date(e.expense_date);
        if (!Number.isNaN(ed.getTime()) && ed >= day && ed < next) addExpense(p, e.amount_cents);
      }
      points.push(p);
    }
    return cumulateTrendPoints(points);
  }

  /* Mes / trimestre / semestre / año: desde inicio del periodo natural hasta hoy (un punto por día). */
  if (range === "month" || range === "quarter" || range === "semester" || range === "years") {
    const rangeStart =
      range === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : range === "quarter"
          ? startOfQuarterCal(now)
          : range === "semester"
            ? startOfSemesterCal(now)
            : new Date(now.getFullYear(), 0, 1);

    const points: TrendPoint[] = [];
    const endDay = startOfDay(now);
    for (let day = startOfDay(rangeStart); day.getTime() <= endDay.getTime(); day = addDays(day, 1)) {
      const next = addDays(day, 1);
      const p = empty();
      p.label = day.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      for (const t of tickets) {
        const c = new Date(t.created_at);
        if (c >= day && c < next) addTicket(p, t);
      }
      for (const e of expenses) {
        const ed = new Date(e.expense_date);
        if (!Number.isNaN(ed.getTime()) && ed >= day && ed < next) addExpense(p, e.amount_cents);
      }
      points.push(p);
    }
    return cumulateTrendPoints(points);
  }

  const _exhaustive: never = range;
  return _exhaustive;
}

export function maxTrendValue(points: TrendPoint[]): number {
  let m = 0;
  for (const p of points) {
    m = Math.max(m, p.gastos, p.ingresos, p.bizum, p.efectivo, p.tarjeta);
  }
  return niceCeiling(Math.max(m, 1));
}

export const RANGE_LABELS: Record<ChartRange, string> = {
  day: "1 día",
  week: "1 semana",
  month: "1 mes",
  quarter: "1 trimestre",
  semester: "1 semestre",
  years: "Años",
};

/** Etiquetas cortas (botones compactos) */
export const RANGE_SHORT: Record<ChartRange, string> = {
  day: "Día",
  week: "Sem.",
  month: "Mes",
  quarter: "Trim.",
  semester: "Sem.",
  years: "Años",
};

export const RANGE_ORDER: ChartRange[] = ["day", "week", "month", "quarter", "semester", "years"];

/**
 * Límites orientativos (p. ej. depuración). El filtrado real está en `ticketInRange`.
 * Mes/trimestre/semestre/año: desde inicio natural hasta `now` inclusive.
 */
export function getRangeTimeBounds(range: ChartRange, nowInput?: Date): { start: Date; end: Date } {
  const now = nowInput ? new Date(nowInput) : new Date();
  if (range === "week") {
    const monday = startOfWeekMonday(now);
    return { start: monday, end: addDays(monday, 7) };
  }
  if (range === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (range === "quarter") {
    return { start: startOfQuarterCal(now), end: now };
  }
  if (range === "semester") {
    return { start: startOfSemesterCal(now), end: now };
  }
  if (range === "years") {
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
  return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: new Date(now.getTime() + 1) };
}

/** Normaliza `expense_date` (YYYY-MM-DD) a clave local YYYY-MM-DD. */
export function localDayKeyFromExpenseDate(expenseDateYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expenseDateYmd.trim());
  if (!m) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Misma ventana temporal que `ticketInRange`, usando la fecha del gasto (solo día, sin hora). */
export function expenseDateInRange(expenseDateYmd: string, range: ChartRange, nowInput?: Date): boolean {
  const [y, mo, d] = expenseDateYmd.split("-").map(Number);
  if (!y || !mo || !d) return false;
  const atNoon = new Date(y, mo - 1, d, 12, 0, 0, 0);
  return ticketInRange(atNoon.toISOString(), range, nowInput);
}

export function ticketInRange(createdAt: string, range: ChartRange, nowInput?: Date): boolean {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return false;
  const now = nowInput ? new Date(nowInput) : new Date();
  if (range === "day") {
    return d.getTime() >= now.getTime() - 24 * 60 * 60 * 1000 && d.getTime() <= now.getTime();
  }
  if (range === "week") {
    const monday = startOfWeekMonday(now);
    const end = addDays(monday, 7);
    return d >= monday && d < end;
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return d >= start && d <= now;
  }
  if (range === "quarter") {
    const start = startOfQuarterCal(now);
    return d >= start && d <= now;
  }
  if (range === "semester") {
    const start = startOfSemesterCal(now);
    return d >= start && d <= now;
  }
  if (range === "years") {
    const start = new Date(now.getFullYear(), 0, 1);
    return d >= start && d <= now;
  }
  return false;
}

function fmtDateEs(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateTimeEs(d: Date): string {
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Texto "del … al …" alineado con `ticketInRange`.
 * Semana: lunes–domingo calendario. Mes/trimestre/semestre/año: inicio natural hasta hoy.
 * En "Día" incluye hora por ser ventana móvil de 24 h.
 */
export function formatIncomeRangeLabel(range: ChartRange, nowInput?: Date): string {
  const now = nowInput ? new Date(nowInput) : new Date();
  if (range === "day") {
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return `del ${fmtDateTimeEs(from)} al ${fmtDateTimeEs(now)}`;
  }
  if (range === "week") {
    const monday = startOfWeekMonday(now);
    const sunday = addDays(monday, 6);
    return `del ${fmtDateEs(monday)} al ${fmtDateEs(sunday)}`;
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return `del ${fmtDateEs(start)} al ${fmtDateEs(startOfDay(now))}`;
  }
  if (range === "quarter") {
    const start = startOfQuarterCal(now);
    return `del ${fmtDateEs(start)} al ${fmtDateEs(startOfDay(now))}`;
  }
  if (range === "semester") {
    const start = startOfSemesterCal(now);
    return `del ${fmtDateEs(start)} al ${fmtDateEs(startOfDay(now))}`;
  }
  if (range === "years") {
    const start = new Date(now.getFullYear(), 0, 1);
    return `del ${fmtDateEs(start)} al ${fmtDateEs(startOfDay(now))}`;
  }
  return "";
}
