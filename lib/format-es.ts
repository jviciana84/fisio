/**
 * Formato numérico fijo para la intranet: miles con punto (.) y decimales con coma (,).
 * Usa locale es-ES de Intl.
 */

export const LOCALE_ES = "es-ES" as const;

/** El valor por defecto `auto` en motores recientes puede omitir el separador de miles en importes (p. ej. «3397 €»). */
const GROUPING_ALWAYS = "always" as const;

export function formatDecimalEs(
  value: number,
  minFractionDigits = 0,
  maxFractionDigits = minFractionDigits,
): string {
  return new Intl.NumberFormat(LOCALE_ES, {
    useGrouping: GROUPING_ALWAYS,
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/** Enteros con separador de miles (p. ej. usuarios activos, unidades). */
export function formatIntegerEs(value: number): string {
  return formatDecimalEs(Math.round(value), 0, 0);
}

export function formatEuroEs(
  amount: number,
  opts?: { minFractionDigits?: number; maxFractionDigits?: number },
) {
  const max = opts?.maxFractionDigits ?? 2;
  const min = opts?.minFractionDigits ?? max;
  return new Intl.NumberFormat(LOCALE_ES, {
    style: "currency",
    currency: "EUR",
    useGrouping: GROUPING_ALWAYS,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(amount);
}

export function formatEuroEsWhole(amount: number) {
  return formatEuroEs(amount, { minFractionDigits: 0, maxFractionDigits: 0 });
}

export function formatEuroEsTwoDecimals(amount: number) {
  return formatEuroEs(amount, { minFractionDigits: 2, maxFractionDigits: 2 });
}

export function formatEuroFromCents(
  cents: number,
  opts?: { minFractionDigits?: number; maxFractionDigits?: number },
) {
  const max = opts?.maxFractionDigits ?? 2;
  const min = opts?.minFractionDigits ?? max;
  return formatEuroEs(cents / 100, { minFractionDigits: min, maxFractionDigits: max });
}

/** Horas con un decimal (p. ej. «12,5 h»). */
export function formatHoursEs(value: number): string {
  return `${formatDecimalEs(value, 1, 1)} h`;
}

/**
 * Importe en € para campos de texto (sin símbolo), con 2 decimales y miles.
 */
export function formatEurosFieldFromNumber(euros: number): string {
  return formatDecimalEs(euros, 2, 2);
}

/**
 * Interpreta texto con formato español (miles . y decimales ,) o entrada simple con punto decimal inglés.
 */
export function parseSpanishDecimalInput(raw: string): number {
  const t = raw.trim().replace(/\s/g, "").replace(/\u00a0/g, "");
  if (!t) return NaN;
  if (t.includes(",")) {
    const withoutThousands = t.replace(/\./g, "");
    const normalized = withoutThousands.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }
  const dotIdx = t.indexOf(".");
  if (dotIdx === -1) {
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }
  if (t.indexOf(".", dotIdx + 1) !== -1) {
    const n = Number(t.replace(/\./g, ""));
    return Number.isFinite(n) ? n : NaN;
  }
  const before = t.slice(0, dotIdx);
  const after = t.slice(dotIdx + 1);
  if (after.length === 3 && /^\d+$/.test(before) && /^\d{3}$/.test(after)) {
    const n = Number(before + after);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
