/** Tipos de IVA admitidos en gastos (total factura TTC según tipo). */
export const EXPENSE_VAT_RATE_OPTIONS = [0, 4, 10, 21] as const;
export type ExpenseVatRatePercent = (typeof EXPENSE_VAT_RATE_OPTIONS)[number];

export function normalizeExpenseVatRatePercent(v: unknown): ExpenseVatRatePercent {
  const n = Math.round(Number(v));
  if (EXPENSE_VAT_RATE_OPTIONS.includes(n as ExpenseVatRatePercent)) {
    return n as ExpenseVatRatePercent;
  }
  return 21;
}

/** Parte IVA sobre total con IVA: p. ej. 21 → 21/121. */
export function expenseVatFractionFromRatePercent(ratePercent: ExpenseVatRatePercent): number {
  if (ratePercent <= 0) return 0;
  return ratePercent / (100 + ratePercent);
}
