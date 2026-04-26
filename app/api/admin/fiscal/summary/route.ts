import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  buildFiscalTicketDataIndex,
  defaultFiscalPeriodWithData,
  resolveActiveFiscalPeriod,
  deductibleQuarterExtractTotalCents,
  eurosFromCents,
  getYearMonthKey,
  officialSalesFromBreakdown,
  quarterForDate,
  quarterMonthKeys,
  simulateQuarter,
  type ExpenseExtractRowInput,
  type FiscalSettingsInput,
  type MonthKey,
} from "@/lib/fiscal/fiscalHelper";

export const runtime = "nodejs";

type TicketRow = {
  id: string;
  total_cents: number;
  payment_method: string;
  created_at: string;
};

type ExpenseDb = {
  amount_cents: number;
  expense_date?: string;
  deductibility?: string;
  deductible_percent?: number;
};

type StaffCompensationRow = {
  full_name: string | null;
  is_active: boolean | null;
  compensation_type: string | null;
  monthly_salary_cents: number | null;
};

type ModelWarning = {
  model: "303" | "130" | "115" | "111" | "190";
  message: string;
};

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();

  const { data: settingsRow, error: settingsError } = await supabase
    .from("fiscal_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron cargar ajustes fiscales" },
      { status: 500 },
    );
  }

  if (!settingsRow) {
    await supabase.from("fiscal_settings").insert({ id: 1 });
  }

  const settingsData = settingsRow ?? {
    declare_cash_percent: 60,
    rent_is_leased: false,
    monthly_rent_cents: 0,
    official_liquidity_cents: 0,
    sales_include_vat: true,
    sales_vat_rate_percent: 21,
    use_vat_on_sales: false,
    expense_vat_recoverable_percent: 100,
    employee_irpf_retention_percent: 15,
    employee_social_security_percent: 6.35,
    employer_social_security_percent: 31.4,
  };

  const settings: FiscalSettingsInput = {
    declareCashPercent: settingsData.declare_cash_percent ?? 60,
    rentIsLeased: settingsData.rent_is_leased ?? false,
    monthlyRentCents: Number(settingsData.monthly_rent_cents ?? 0),
    officialLiquidityCents: Number(settingsData.official_liquidity_cents ?? 0),
    salesIncludeVat: settingsData.sales_include_vat ?? true,
    salesVatRatePercent: settingsData.sales_vat_rate_percent ?? 21,
    useVatOnSales: settingsData.use_vat_on_sales ?? false,
    expenseVatRecoverablePercent: settingsData.expense_vat_recoverable_percent ?? 100,
  };

  const now = new Date();
  const url = new URL(request.url);
  const qYearRaw = url.searchParams.get("year");
  const qQuarterRaw = url.searchParams.get("quarter");
  const targetYear = Math.round(Number(qYearRaw));
  const targetQuarter = Math.round(Number(qQuarterRaw));
  const hasTargetQuarter =
    Number.isFinite(targetYear) &&
    targetYear >= 2000 &&
    targetYear <= 2100 &&
    Number.isFinite(targetQuarter) &&
    targetQuarter >= 1 &&
    targetQuarter <= 4;

  const { data: allDateRows, error: allDatesError } = await supabase
    .from("cash_tickets")
    .select("created_at");
  if (allDatesError) {
    return NextResponse.json(
      { ok: false, message: "No se pudieron leer fechas de tickets para el simulador" },
      { status: 500 },
    );
  }
  const ticketDataIndex = buildFiscalTicketDataIndex(
    (allDateRows ?? []).map((r) => String((r as { created_at: string }).created_at)),
  );
  const hasTicketData = ticketDataIndex.years.length > 0;

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const twelveMonthsBack = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const sinceDefault = new Date(Math.min(yearStart.getTime(), twelveMonthsBack.getTime()));
  sinceDefault.setHours(0, 0, 0, 0);

  const pickDefault = defaultFiscalPeriodWithData(ticketDataIndex, now);
  // Nunca declarar const sin = y rellenar luego con if: inválido en JS y rompe Turbopack. Usar siempre resolveActiveFiscalPeriod.
  const { activeY, activeQ } = resolveActiveFiscalPeriod({
    hasTargetQuarter,
    targetYear,
    targetQuarter,
    pickDefault,
    now,
  });

  const since = (() => {
    if (hasTargetQuarter) {
      const d = new Date(targetYear, 0, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (hasTicketData) {
      const d = new Date(activeY, 0, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return sinceDefault;
  })();

  const { data: tickets, error: tErr } = await supabase
    .from("cash_tickets")
    .select("id, total_cents, payment_method, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (tErr) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar tickets" }, { status: 500 });
  }

  const { data: invoiceLinks, error: invErr } = await supabase
    .from("invoices")
    .select("ticket_id")
    .not("ticket_id", "is", null);

  if (invErr) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar facturas vinculadas a tickets" }, { status: 500 });
  }

  const invoicedTicketIds = new Set(
    (invoiceLinks ?? [])
      .map((r) => String((r as { ticket_id?: string | null }).ticket_id ?? "").trim())
      .filter(Boolean),
  );

  const { data: expenses, error: eErr } = await supabase.from("expenses").select("*");

  if (eErr) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar gastos" }, { status: 500 });
  }

  const { data: staffRows, error: staffErr } = await supabase
    .from("staff_access")
    .select("full_name, is_active, compensation_type, monthly_salary_cents");

  if (staffErr) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar perfiles de personal" }, { status: 500 });
  }

  const monthMap = new Map<
    MonthKey,
    { cashCents: number; bizumCents: number; cardCents: number }
  >();

  for (const row of (tickets ?? []) as TicketRow[]) {
    const d = new Date(row.created_at);
    const key = getYearMonthKey(d);
    const cur = monthMap.get(key) ?? { cashCents: 0, bizumCents: 0, cardCents: 0 };
    const cents = row.total_cents ?? 0;
    if (row.payment_method === "cash") cur.cashCents += cents;
    else if (row.payment_method === "bizum") cur.bizumCents += cents;
    else if (row.payment_method === "card") cur.cardCents += cents;
    monthMap.set(key, cur);
  }

  const expenseExtractRows: ExpenseExtractRowInput[] = (expenses ?? []).map((e: ExpenseDb) => {
    const raw = e.expense_date?.trim() ?? "";
    const expenseMonthKey = (raw.length >= 7 ? raw.slice(0, 7) : "1970-01") as MonthKey;
    return {
      amountCents: e.amount_cents,
      deductibility: (e.deductibility as "full" | "partial" | "none") ?? "full",
      deductiblePercent: e.deductible_percent ?? 100,
      expenseMonthKey,
    };
  });

  const months = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const allSalariedProfiles = ((staffRows ?? []) as StaffCompensationRow[]).filter(
    (row) => row.is_active !== false && row.compensation_type === "salaried",
  );
  const salariedProfiles = allSalariedProfiles.filter(
    (row) => Number(row.monthly_salary_cents ?? 0) > 0,
  );
  const salariedWithoutSalary = allSalariedProfiles.filter(
    (row) => Number(row.monthly_salary_cents ?? 0) <= 0,
  );

  const salariedAnnualGrossCents = salariedProfiles.reduce(
    (acc, row) => acc + Number(row.monthly_salary_cents ?? 0),
    0,
  );

  const PAYROLL = {
    employeeIrpfRetentionPercent: Number(settingsData.employee_irpf_retention_percent ?? 15),
    employeeSocialSecurityPercent: Number(settingsData.employee_social_security_percent ?? 6.35),
    employerSocialSecurityPercent: Number(settingsData.employer_social_security_percent ?? 31.4),
  };

  const employeeIrpfRetentionQuarterCents = Math.round(
    ((salariedAnnualGrossCents / 4) * PAYROLL.employeeIrpfRetentionPercent) / 100,
  );
  const employeeSocialSecurityQuarterCents = Math.round(
    ((salariedAnnualGrossCents / 4) * PAYROLL.employeeSocialSecurityPercent) / 100,
  );
  const employerSocialSecurityQuarterCents = Math.round(
    ((salariedAnnualGrossCents / 4) * PAYROLL.employerSocialSecurityPercent) / 100,
  );
  const grossPayrollQuarterCents = Math.round(salariedAnnualGrossCents / 4);
  const netPayrollQuarterCents =
    grossPayrollQuarterCents - employeeIrpfRetentionQuarterCents - employeeSocialSecurityQuarterCents;
  const employerPayrollCostQuarterCents = grossPayrollQuarterCents + employerSocialSecurityQuarterCents;

  const chart = months.map(([monthKey, b]) => {
    const total = b.cashCents + b.bizumCents + b.cardCents;
    const official = officialSalesFromBreakdown(b, settings.declareCashPercent);
    return {
      monthKey,
      realEuros: eurosFromCents(total),
      officialEuros: eurosFromCents(official),
      cashEuros: eurosFromCents(b.cashCents),
      bizumEuros: eurosFromCents(b.bizumCents),
      cardEuros: eurosFromCents(b.cardCents),
    };
  });

  const q = {
    quarter: activeQ,
    label: `T${activeQ} ${activeY}`,
    monthKeys: quarterMonthKeys(activeY, activeQ),
  };

  const referenceDate = (() => {
    if (!hasTicketData) return now;
    const lastMonthIndex = (activeQ - 1) * 3 + 2;
    const endOfQuarter = new Date(activeY, lastMonthIndex + 1, 0, 23, 59, 59, 999);
    return now.getTime() < endOfQuarter.getTime() ? now : endOfQuarter;
  })();

  const qTotals = { cashCents: 0, bizumCents: 0, cardCents: 0 };
  for (const mk of q.monthKeys) {
    const b = monthMap.get(mk);
    if (!b) continue;
    qTotals.cashCents += b.cashCents;
    qTotals.bizumCents += b.bizumCents;
    qTotals.cardCents += b.cardCents;
  }

  const deductibleQ = deductibleQuarterExtractTotalCents(expenseExtractRows, q.monthKeys);
  const modelWarnings: ModelWarning[] = [];
  if (qTotals.cashCents + qTotals.bizumCents + qTotals.cardCents <= 0) {
    modelWarnings.push({
      model: "303",
      message: "Faltan tickets del trimestre para calcular IVA repercutido (modelo 303).",
    });
    modelWarnings.push({
      model: "130",
      message: "Faltan ingresos del trimestre para calcular el pago fraccionado de IRPF (modelo 130).",
    });
  }
  if (settings.rentIsLeased && settings.monthlyRentCents <= 0) {
    modelWarnings.push({
      model: "115",
      message: "El local está marcado como alquilado, pero falta importe de alquiler mensual para calcular el modelo 115.",
    });
  }
  if (allSalariedProfiles.length === 0) {
    modelWarnings.push({
      model: "111",
      message: "No hay perfiles activos marcados como asalariados para calcular retenciones de nómina (modelo 111).",
    });
    modelWarnings.push({
      model: "190",
      message: "No hay perfiles activos marcados como asalariados para calcular el resumen anual de retenciones (modelo 190).",
    });
  } else if (salariedWithoutSalary.length > 0) {
    modelWarnings.push({
      model: "111",
      message: `Hay ${salariedWithoutSalary.length} perfil(es) asalariado(s) sin salario bruto anual válido; se excluyen del cálculo del modelo 111.`,
    });
    modelWarnings.push({
      model: "190",
      message: `Hay ${salariedWithoutSalary.length} perfil(es) asalariado(s) sin salario bruto anual válido; se excluyen del cálculo del modelo 190.`,
    });
  }

  const simulation = simulateQuarter({
    settings,
    ticketTotals: qTotals,
    deductibleExpensesQuarterTtcCents: deductibleQ,
    additionalNonVatDeductibleExpensesQuarterCents: employerPayrollCostQuarterCents,
  });

  let quarterCashTotalCents = 0;
  let quarterCashInvoicedCents = 0;
  for (const row of (tickets ?? []) as TicketRow[]) {
    if (row.payment_method !== "cash") continue;
    const mk = getYearMonthKey(new Date(row.created_at));
    if (!q.monthKeys.includes(mk)) continue;
    const cents = Number(row.total_cents ?? 0);
    quarterCashTotalCents += cents;
    if (invoicedTicketIds.has(String(row.id))) {
      quarterCashInvoicedCents += cents;
    }
  }
  const quarterCashFreeCents = Math.max(0, quarterCashTotalCents - quarterCashInvoicedCents);

  const calendarYear = activeY;
  const currentQ = quarterForDate(referenceDate).quarter;

  const quarterlyYear = ([1, 2, 3, 4] as const).map((qi) => {
    const mks = quarterMonthKeys(calendarYear, qi);
    let cashCents = 0;
    let bizumCents = 0;
    let cardCents = 0;
    for (const mk of mks) {
      const b = monthMap.get(mk);
      if (!b) continue;
      cashCents += b.cashCents;
      bizumCents += b.bizumCents;
      cardCents += b.cardCents;
    }
    const ded = deductibleQuarterExtractTotalCents(expenseExtractRows, mks);
    const simQ = simulateQuarter({
      settings,
      ticketTotals: { cashCents, bizumCents, cardCents },
      deductibleExpensesQuarterTtcCents: ded,
      additionalNonVatDeductibleExpensesQuarterCents: employerPayrollCostQuarterCents,
    });
    return {
      quarter: qi,
      label: `T${qi} ${calendarYear}`,
      ivaEuros: eurosFromCents(simQ.iva303ToPayCents),
      irpfEuros: eurosFromCents(simQ.irpf130Cents),
      model115Euros: eurosFromCents(simQ.model115Cents),
      totalTaxesEuros: eurosFromCents(simQ.totalTaxesCents),
    };
  });

  let ytdIva = 0;
  let ytdIrpf = 0;
  let ytd115 = 0;
  let ytdTotal = 0;
  for (const row of quarterlyYear) {
    if (row.quarter > currentQ) break;
    ytdIva += row.ivaEuros;
    ytdIrpf += row.irpfEuros;
    ytd115 += row.model115Euros;
    ytdTotal += row.totalTaxesEuros;
  }

  let annualIva = 0;
  let annualIrpf = 0;
  let annual115 = 0;
  let annualTotal = 0;
  for (const row of quarterlyYear) {
    annualIva += row.ivaEuros;
    annualIrpf += row.irpfEuros;
    annual115 += row.model115Euros;
    annualTotal += row.totalTaxesEuros;
  }

  const yearOptions = new Set(ticketDataIndex.years);
  if (hasTargetQuarter) yearOptions.add(targetYear);
  const fiscalYears = [...yearOptions].sort((a, b) => b - a);
  const fiscalQuartersByYear: Record<string, number[]> = {};
  for (const y of fiscalYears) {
    const s = new Set(ticketDataIndex.quartersByYear.get(y) ?? []);
    if (y === activeY) s.add(activeQ);
    if (hasTargetQuarter && y === targetYear) s.add(targetQuarter as 1 | 2 | 3 | 4);
    fiscalQuartersByYear[String(y)] = [...s].sort((a, b) => a - b);
  }
  const fiscalPeriodOptions =
    fiscalYears.length > 0
      ? { years: fiscalYears, quartersByYear: fiscalQuartersByYear }
      : { years: [now.getFullYear()], quartersByYear: { [String(now.getFullYear())]: [1, 2, 3, 4] } };

  return NextResponse.json({
    ok: true,
    calendarYear,
    currentQuarter: currentQ,
    fiscalPeriodOptions,
    yearProgress: {
      quarterly: quarterlyYear,
      yearToDate: {
        ivaEuros: ytdIva,
        irpfEuros: ytdIrpf,
        model115Euros: ytd115,
        totalTaxesEuros: ytdTotal,
        throughQuarter: currentQ,
      },
      annualEstimate: {
        ivaEuros: annualIva,
        irpfEuros: annualIrpf,
        model115Euros: annual115,
        totalTaxesEuros: annualTotal,
      },
    },
    settings: {
      declareCashPercent: settings.declareCashPercent,
      rentIsLeased: settings.rentIsLeased,
      monthlyRentEuros: settings.monthlyRentCents / 100,
      officialLiquidityEuros: settings.officialLiquidityCents / 100,
      salesIncludeVat: settings.salesIncludeVat,
      salesVatRatePercent: settings.salesVatRatePercent,
      useVatOnSales: settings.useVatOnSales,
      expenseVatRecoverablePercent: settings.expenseVatRecoverablePercent,
      employeeIrpfRetentionPercent: PAYROLL.employeeIrpfRetentionPercent,
      employeeSocialSecurityPercent: PAYROLL.employeeSocialSecurityPercent,
      employerSocialSecurityPercent: PAYROLL.employerSocialSecurityPercent,
    },
    quarter: q.label,
    chart,
    simulation: {
      declareCashPercent: simulation.declareCashPercent,
      realTotalEuros: eurosFromCents(simulation.realTotalCents),
      officialSalesEuros: eurosFromCents(simulation.officialSalesTtcCents),
      netBeforeIrpfEuros: eurosFromCents(simulation.netBeforeIrpfCents),
      ivaToPayEuros: eurosFromCents(simulation.iva303ToPayCents),
      ivaOutputEuros: eurosFromCents(simulation.ivaRepercutidoCents),
      ivaInputEuros: eurosFromCents(simulation.ivaSoportadoCents),
      ivaNetEuros: eurosFromCents(simulation.ivaRepercutidoCents - simulation.ivaSoportadoCents),
      irpfEuros: eurosFromCents(simulation.irpf130Cents),
      model115Euros: eurosFromCents(simulation.model115Cents),
      totalTaxesEuros: eurosFromCents(simulation.totalTaxesCents),
      netAfterTaxesEuros: eurosFromCents(simulation.netAfterTaxesCents),
      cashPocketEuros: eurosFromCents(simulation.cashPocketCents),
      liquidityAlert: simulation.liquidityAlert,
      liquidityGapEuros: eurosFromCents(Math.max(0, simulation.liquidityGapCents)),
    },
    quarterCash: {
      totalEuros: eurosFromCents(quarterCashTotalCents),
      invoicedEuros: eurosFromCents(quarterCashInvoicedCents),
      freeEuros: eurosFromCents(quarterCashFreeCents),
    },
    payrollPreview: {
      assumptions: {
        employeeIrpfRetentionPercent: PAYROLL.employeeIrpfRetentionPercent,
        employeeSocialSecurityPercent: PAYROLL.employeeSocialSecurityPercent,
        employerSocialSecurityPercent: PAYROLL.employerSocialSecurityPercent,
      },
      salariedProfiles: salariedProfiles.map((p) => ({
        name: p.full_name ?? "Sin nombre",
        annualGrossEuros: eurosFromCents(Number(p.monthly_salary_cents ?? 0)),
        monthlyEquivalentEuros: eurosFromCents(Math.round(Number(p.monthly_salary_cents ?? 0) / 12)),
      })),
      totals: {
        salariedCount: salariedProfiles.length,
        annualGrossEuros: eurosFromCents(salariedAnnualGrossCents),
        monthlyEquivalentEuros: eurosFromCents(Math.round(salariedAnnualGrossCents / 12)),
        quarterGrossEuros: eurosFromCents(grossPayrollQuarterCents),
        quarterNetPayrollEuros: eurosFromCents(netPayrollQuarterCents),
        quarterEmployerCostEuros: eurosFromCents(employerPayrollCostQuarterCents),
        quarterEmployeeIrpfRetentionEuros: eurosFromCents(employeeIrpfRetentionQuarterCents),
        quarterEmployeeSocialSecurityEuros: eurosFromCents(employeeSocialSecurityQuarterCents),
        quarterEmployerSocialSecurityEuros: eurosFromCents(employerSocialSecurityQuarterCents),
        model111QuarterEuros: eurosFromCents(employeeIrpfRetentionQuarterCents),
        model190YearEuros: eurosFromCents(
          Math.round((salariedAnnualGrossCents * PAYROLL.employeeIrpfRetentionPercent) / 100),
        ),
      },
    },
    modelWarnings,
  });
}
