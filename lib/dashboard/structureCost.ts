/**
 * Coste de estructura (overhead): estimación mensual/diaria a partir de cargos recurrentes.
 * Clasificación por categoría: "fijo predecible" sin margen vs resto con +10 % (luz, agua, otros).
 */

export type StructureLineKind = "strict" | "variable";

/** Fijo predecible: importe aplicado tal cual (p. ej. alquiler — equivalente mensual según periodicidad, sin colchón). */
const STRICT_RE =
  /alquiler|seguro|aut[oó]nom|gestor|software|licencia|amort|sueldo|n[oó]mina|cuota|asesor|contabil|mutua|ibi|basuras/i;
const VARIABLE_RE =
  /luz|electricidad|agua|gas|tel[eé]fono|internet|limpieza|comunidad|mantenimiento|reparaci|suministro|telefon/i;

export function monthlyEquivalentEurFromCents(
  amountCents: number,
  recurrence: string,
): number {
  const euros = amountCents / 100;
  switch (recurrence) {
    case "weekly":
      return euros * (52 / 12);
    case "monthly":
      return euros;
    case "bimonthly":
      return euros / 2;
    case "quarterly":
      return euros / 3;
    case "semiannual":
      return euros / 6;
    case "annual":
      return euros / 12;
    case "none":
    default:
      return 0;
  }
}

function classifyCategory(category: string): StructureLineKind {
  const c = category.trim();
  if (!c) return "variable";
  if (STRICT_RE.test(c)) return "strict";
  if (VARIABLE_RE.test(c)) return "variable";
  return "variable";
}

const VARIABLE_MARGIN = 1.1;

export type StructureLine = {
  id: string;
  conceptLabel: string;
  category: string;
  recurrence: string;
  monthlyEur: number;
  kind: StructureLineKind;
  weightedMonthlyEur: number;
};

function lineKindFromRow(
  category: string,
  structureMode: string | null | undefined,
): StructureLineKind {
  if (structureMode === "strict") return "strict";
  if (structureMode === "variable") return "variable";
  return classifyCategory(category);
}

export function computeStructureFromRecurringRows(
  rows: {
    id: string;
    concept: string;
    category: string | null;
    recurrence: string;
    amount_cents: number;
    structure_mode?: string | null;
  }[],
): {
  lines: StructureLine[];
  strictMonthlyEur: number;
  variableBaseMonthlyEur: number;
  variableWeightedMonthlyEur: number;
  totalMonthlyEur: number;
  dailyEur: number;
} {
  const lines: StructureLine[] = [];
  let strictMonthlyEur = 0;
  let variableBaseMonthlyEur = 0;
  let variableWeightedMonthlyEur = 0;

  for (const r of rows) {
    if (r.recurrence === "none") continue;
    const cat = (r.category ?? "").trim() || "General";
    const monthlyEur = monthlyEquivalentEurFromCents(r.amount_cents, r.recurrence);
    if (monthlyEur <= 0) continue;
    const kind = lineKindFromRow(cat, r.structure_mode);
    const weightedMonthlyEur = kind === "strict" ? monthlyEur : monthlyEur * VARIABLE_MARGIN;
    lines.push({
      id: r.id,
      conceptLabel: r.concept.trim(),
      category: cat,
      recurrence: r.recurrence,
      monthlyEur,
      kind,
      weightedMonthlyEur,
    });
    if (kind === "strict") {
      strictMonthlyEur += monthlyEur;
    } else {
      variableBaseMonthlyEur += monthlyEur;
      variableWeightedMonthlyEur += monthlyEur * VARIABLE_MARGIN;
    }
  }

  lines.sort((a, b) => a.category.localeCompare(b.category, "es") || a.conceptLabel.localeCompare(b.conceptLabel, "es"));

  const totalMonthlyEur = strictMonthlyEur + variableWeightedMonthlyEur;
  const dailyEur = totalMonthlyEur / 30.4375;

  return {
    lines,
    strictMonthlyEur,
    variableBaseMonthlyEur,
    variableWeightedMonthlyEur,
    totalMonthlyEur,
    dailyEur,
  };
}
