import { parseSpanishDecimalInput } from "@/lib/format-es";

/** Retribución: nómina fija vs tarifas por hora (autónomo). */
export type StaffCompensationType = "salaried" | "self_employed";

export function normalizeCompensationType(raw: unknown): StaffCompensationType {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "salaried" || s === "asalariado") return "salaried";
  return "self_employed";
}

/** Convierte texto con formato español (miles . y decimales ,) en céntimos (salario mensual en €). */
export function parseEuroStringToCents(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "") return null;
  const n = parseSpanishDecimalInput(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Límite razonable salario mensual (céntimos), ~999.999,99 €. */
export const MAX_MONTHLY_SALARY_CENTS = 99_999_999;
