/** Retribución: nómina fija vs tarifas por hora (autónomo). */
export type StaffCompensationType = "salaried" | "self_employed";

export function normalizeCompensationType(raw: unknown): StaffCompensationType {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "salaried" || s === "asalariado") return "salaried";
  return "self_employed";
}

/** Convierte texto con coma o punto en céntimos (salario mensual en €). */
export function parseEuroStringToCents(s: string): number | null {
  const raw = s.replace(",", ".").trim();
  if (raw === "") return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Límite razonable salario mensual (céntimos), ~999.999,99 €. */
export const MAX_MONTHLY_SALARY_CENTS = 99_999_999;
