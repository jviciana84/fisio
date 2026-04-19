/**
 * Concepto canónico para agrupar cargos recurrentes (ignora sufijos tipo " · Nov 25" del seed).
 */
export function canonicalConceptForFixedKey(concept: string): string {
  const t = concept.trim();
  const idx = t.lastIndexOf(" · ");
  if (idx <= 0) return t;
  const suffix = t.slice(idx + 3).trim();
  if (/^[A-Za-zÀ-ÿ]{3,12}\.?\s+\d{2}$/.test(suffix)) {
    return t.slice(0, idx).trim();
  }
  return t;
}

export function expenseRecurringGroupKey(row: {
  concept: string;
  category: string | null;
  recurrence: string;
}): string {
  return `${canonicalConceptForFixedKey(row.concept).toLowerCase()}|${(row.category ?? "").trim().toLowerCase()}|${row.recurrence}`;
}
