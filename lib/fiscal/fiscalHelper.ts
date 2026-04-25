/**
 * Simulación fiscal orientativa para autónomos en España (IVA 303, IRPF 130, retención 115).
 * Los porcentajes son configurables: actualiza las constantes si cambia la normativa.
 */

/** IRPF pagos fraccionados (modelo 130): porcentaje sobre beneficio estimado del trimestre. */
export const IRPF_QUARTERLY_FRACTION = 0.2;

/** Retención del arrendador en locales (modelo 115): sobre la renta del local de negocio. */
export const RENT_RETENTION_FRACTION = 0.19;

/** IVA general aplicado a suministros/material con factura (parte recuperable del total facturado con IVA). */
export const DEFAULT_EXPENSE_VAT_FRACTION = 21 / 121;

export type FiscalSettingsInput = {
  declareCashPercent: number;
  rentIsLeased: boolean;
  monthlyRentCents: number;
  officialLiquidityCents: number;
  salesIncludeVat: boolean;
  salesVatRatePercent: number;
  useVatOnSales: boolean;
  expenseVatRecoverablePercent: number;
};

export type MonthKey = `${number}-${string}`;

export type TicketMonthBreakdown = {
  monthKey: MonthKey;
  cashCents: number;
  bizumCents: number;
  cardCents: number;
  totalCents: number;
};

export type ExpenseRowInput = {
  amountCents: number;
  recurrence: string;
  deductibility: "full" | "partial" | "none";
  deductiblePercent: number;
  /** Primeros 7 caracteres de expense_date (YYYY-MM). Obligatorio si recurrence === 'none'. */
  expenseMonthKey?: MonthKey;
};

/** Apunte real del extracto de gastos (no plantilla recurrente). */
export type ExpenseExtractRowInput = {
  amountCents: number;
  deductibility: "full" | "partial" | "none";
  deductiblePercent: number;
  /** Mes del apunte real (YYYY-MM). */
  expenseMonthKey: MonthKey;
};

function monthlyEquivalentCents(cents: number, recurrence: string): number {
  if (recurrence === "none") return 0;
  switch (recurrence) {
    case "weekly":
      return Math.round((cents * 52) / 12);
    case "monthly":
      return cents;
    case "bimonthly":
      return Math.round(cents / 2);
    case "quarterly":
      return Math.round(cents / 3);
    case "semiannual":
      return Math.round(cents / 6);
    case "annual":
      return Math.round(cents / 12);
    default:
      return 0;
  }
}

function applyDeductibilityToAmount(
  amountCents: number,
  deductibility: ExpenseRowInput["deductibility"],
  deductiblePercent: number,
): number {
  if (deductibility === "none") return 0;
  if (deductibility === "full") return amountCents;
  const p = Math.min(100, Math.max(0, deductiblePercent));
  return Math.round((amountCents * p) / 100);
}

/** Gasto deducible mensual medio (recurrentes) o 0 para puntuales (usar deductibleQuarterTotalCents). */
export function deductibleAmountCents(row: ExpenseRowInput): number {
  const monthly = monthlyEquivalentCents(row.amountCents, row.recurrence);
  return applyDeductibilityToAmount(monthly, row.deductibility, row.deductiblePercent);
}

/**
 * Total deducible en un trimestre: recurrentes (cuota mensual × 3) y puntuales si caen en algún mes del trimestre.
 */
export function deductibleQuarterTotalCents(
  rows: ExpenseRowInput[],
  quarterMonthKeys: MonthKey[],
): number {
  let total = 0;
  for (const e of rows) {
    if (e.recurrence === "none") {
      const mk = e.expenseMonthKey;
      if (!mk || !quarterMonthKeys.includes(mk)) continue;
      total += applyDeductibilityToAmount(e.amountCents, e.deductibility, e.deductiblePercent);
      continue;
    }
    const monthly = monthlyEquivalentCents(e.amountCents, e.recurrence);
    const d = applyDeductibilityToAmount(monthly, e.deductibility, e.deductiblePercent);
    if (e.expenseMonthKey) {
      // Solo cuenta meses del trimestre en los que el gasto ya estaba vigente.
      const activeMonthsInQuarter = quarterMonthKeys.filter((mk) => mk >= e.expenseMonthKey!).length;
      total += d * activeMonthsInQuarter;
      continue;
    }
    total += d * 3;
  }
  return total;
}

/**
 * Total deducible trimestral desde extracto real:
 * suma los apuntes cuya fecha cae dentro del trimestre, sin expandir recurrencias.
 */
export function deductibleQuarterExtractTotalCents(
  rows: ExpenseExtractRowInput[],
  quarterMonthKeys: MonthKey[],
): number {
  let total = 0;
  for (const e of rows) {
    if (!quarterMonthKeys.includes(e.expenseMonthKey)) continue;
    total += applyDeductibilityToAmount(e.amountCents, e.deductibility, e.deductiblePercent);
  }
  return total;
}

/**
 * Ventas “oficiales” simuladas: se asume que Bizum y tarjeta van íntegros a declaración;
 * solo el efectivo se ajusta con `declareCashPercent`.
 */
export function officialSalesFromBreakdown(
  b: { cashCents: number; bizumCents: number; cardCents: number },
  declareCashPercent: number,
): number {
  const p = Math.min(100, Math.max(0, declareCashPercent));
  const cashPart = Math.round((b.cashCents * p) / 100);
  return cashPart + b.bizumCents + b.cardCents;
}

/** Base imponible y cuota de IVA repercutido a partir del total cobrado (TTC). */
export function splitSalesTtc(
  ttcCents: number,
  includeVat: boolean,
  vatRatePercent: number,
): { baseCents: number; vatCents: number } {
  if (!includeVat || vatRatePercent <= 0) {
    return { baseCents: ttcCents, vatCents: 0 };
  }
  const r = vatRatePercent / 100;
  const baseCents = Math.round(ttcCents / (1 + r));
  return { baseCents, vatCents: ttcCents - baseCents };
}

/** IVA soportado estimado: parte del gasto deducible que corresponde a IVA en factura. */
export function estimatedInputVatCents(
  deductibleExpenseTtcCents: number,
  recoverableFraction: number,
): number {
  const rf = Math.min(1, Math.max(0, recoverableFraction));
  const vatPart = Math.round(deductibleExpenseTtcCents * DEFAULT_EXPENSE_VAT_FRACTION * rf);
  return vatPart;
}

export function vat303NetCents(params: {
  outputVatCents: number;
  inputVatCents: number;
}): number {
  return params.outputVatCents - params.inputVatCents;
}

export function model115RetentionCents(monthlyRentCents: number, monthsInPeriod: number): number {
  if (monthlyRentCents <= 0 || monthsInPeriod <= 0) return 0;
  return Math.round(monthlyRentCents * monthsInPeriod * RENT_RETENTION_FRACTION);
}

export function irpf130Cents(netProfitCents: number): number {
  if (netProfitCents <= 0) return 0;
  return Math.round(netProfitCents * IRPF_QUARTERLY_FRACTION);
}

export type QuarterSlice = {
  quarter: 1 | 2 | 3 | 4;
  label: string;
  monthKeys: MonthKey[];
};

export function getYearMonthKey(d: Date): MonthKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}` as MonthKey;
}

const QUARTER_MONTHS: readonly (readonly number[])[] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [10, 11, 12],
];

/** Meses (YYYY-MM) de un trimestre concreto del año. */
export function quarterMonthKeys(year: number, quarter: 1 | 2 | 3 | 4): MonthKey[] {
  const months = QUARTER_MONTHS[quarter - 1];
  return months.map((month) => `${year}-${String(month).padStart(2, "0")}` as MonthKey);
}

export function quarterForDate(d: Date): QuarterSlice {
  const m = d.getMonth();
  const y = d.getFullYear();
  let q: 1 | 2 | 3 | 4;
  if (m < 3) q = 1;
  else if (m < 6) q = 2;
  else if (m < 9) q = 3;
  else q = 4;
  const monthKeys = quarterMonthKeys(y, q);
  return {
    quarter: q,
    label: `T${q} ${y}`,
    monthKeys,
  };
}

export type FiscalSimulationResult = {
  declareCashPercent: number;
  /** Total cobrado en el periodo (real). */
  realTotalCents: number;
  /** Total simulado como declarado (oficial). */
  officialSalesTtcCents: number;
  salesBaseCents: number;
  ivaRepercutidoCents: number;
  /** Gastos deducibles mensuales medios (TTC aproximado tal como en el registro). */
  deductibleExpensesTtcCents: number;
  ivaSoportadoCents: number;
  iva303ToPayCents: number;
  /** Beneficio estimado para IRPF (base - gastos deducibles base, simplificado). */
  netBeforeIrpfCents: number;
  irpf130Cents: number;
  model115Cents: number;
  totalTaxesCents: number;
  /** Efectivo “no declarado” en la simulación (solo canal efectivo). */
  cashPocketCents: number;
  /** Dinero neto después de impuestos estimados (todo el cobrado - impuestos; orientativo). */
  netAfterTaxesCents: number;
  liquidityGapCents: number;
  liquidityAlert: boolean;
};

/**
 * Simula un trimestre concreto a partir de desglose mensual de tickets y gastos recurrentes.
 */
export function simulateQuarter(params: {
  settings: FiscalSettingsInput;
  /** Suma de breakdowns de los meses del trimestre. */
  ticketTotals: { cashCents: number; bizumCents: number; cardCents: number };
  /** Total gastos deducibles en el trimestre (importes con IVA tal como en registro). */
  deductibleExpensesQuarterTtcCents: number;
  /** Gastos deducibles trimestrales sin IVA (p.ej. nóminas + SS empresa). */
  additionalNonVatDeductibleExpensesQuarterCents?: number;
}): FiscalSimulationResult {
  const {
    settings,
    ticketTotals,
    deductibleExpensesQuarterTtcCents,
    additionalNonVatDeductibleExpensesQuarterCents = 0,
  } = params;

  const realTotalCents =
    ticketTotals.cashCents + ticketTotals.bizumCents + ticketTotals.cardCents;

  const officialSalesTtcCents = officialSalesFromBreakdown(
    ticketTotals,
    settings.declareCashPercent,
  );

  const { baseCents: salesBaseCents, vatCents: ivaRepercutidoCents } = settings.useVatOnSales
    ? splitSalesTtc(officialSalesTtcCents, settings.salesIncludeVat, settings.salesVatRatePercent)
    : { baseCents: officialSalesTtcCents, vatCents: 0 };

  const deductibleExpensesTtcCents = deductibleExpensesQuarterTtcCents;

  const recoverable =
    settings.expenseVatRecoverablePercent <= 0
      ? 0
      : settings.expenseVatRecoverablePercent / 100;

  const ivaSoportadoCents = estimatedInputVatCents(deductibleExpensesTtcCents, recoverable);

  const iva303ToPayCents = Math.max(0, vat303NetCents({ outputVatCents: ivaRepercutidoCents, inputVatCents: ivaSoportadoCents }));

  const expenseBaseForIrpfCents = Math.max(
    0,
    deductibleExpensesTtcCents - ivaSoportadoCents + additionalNonVatDeductibleExpensesQuarterCents,
  );
  const netBeforeIrpfCents = salesBaseCents - expenseBaseForIrpfCents;
  const irpfFractionCents = irpf130Cents(netBeforeIrpfCents);

  const model115Cents = settings.rentIsLeased
    ? model115RetentionCents(settings.monthlyRentCents, 3)
    : 0;

  const totalTaxesCents = iva303ToPayCents + irpfFractionCents + model115Cents;

  const undeclaredCashCents = Math.max(
    0,
    ticketTotals.cashCents -
      Math.round((ticketTotals.cashCents * settings.declareCashPercent) / 100),
  );

  const netAfterTaxesCents = realTotalCents - totalTaxesCents;

  const liquidityGapCents = totalTaxesCents - settings.officialLiquidityCents;
  const liquidityAlert = totalTaxesCents > settings.officialLiquidityCents;

  return {
    declareCashPercent: settings.declareCashPercent,
    realTotalCents,
    officialSalesTtcCents,
    salesBaseCents,
    ivaRepercutidoCents,
    deductibleExpensesTtcCents,
    ivaSoportadoCents,
    iva303ToPayCents,
    netBeforeIrpfCents,
    irpf130Cents: irpfFractionCents,
    model115Cents,
    totalTaxesCents,
    cashPocketCents: undeclaredCashCents,
    netAfterTaxesCents,
    liquidityGapCents,
    liquidityAlert,
  };
}

export function eurosFromCents(cents: number): number {
  return Math.round(cents) / 100;
}
