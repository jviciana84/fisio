import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  deductibleQuarterTotalCents,
  eurosFromCents,
  getYearMonthKey,
  officialSalesFromBreakdown,
  quarterForDate,
  quarterMonthKeys,
  simulateQuarter,
  type ExpenseRowInput,
  type FiscalSettingsInput,
  type MonthKey,
} from "@/lib/fiscal/fiscalHelper";

export const runtime = "nodejs";

type TicketRow = {
  total_cents: number;
  payment_method: string;
  created_at: string;
};

type ExpenseDb = {
  amount_cents: number;
  recurrence: string;
  expense_date?: string;
  deductibility?: string;
  deductible_percent?: number;
};

export async function GET() {
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
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const twelveMonthsBack = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const since = new Date(
    Math.min(yearStart.getTime(), twelveMonthsBack.getTime()),
  );
  since.setHours(0, 0, 0, 0);

  const { data: tickets, error: tErr } = await supabase
    .from("cash_tickets")
    .select("total_cents, payment_method, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (tErr) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar tickets" }, { status: 500 });
  }

  const { data: expenses, error: eErr } = await supabase.from("expenses").select("*");

  if (eErr) {
    return NextResponse.json({ ok: false, message: "No se pudieron cargar gastos" }, { status: 500 });
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

  const expenseInputs: ExpenseRowInput[] = (expenses ?? []).map((e: ExpenseDb) => {
    const raw = e.expense_date?.trim() ?? "";
    const expenseMonthKey = (raw.length >= 7 ? raw.slice(0, 7) : "1970-01") as MonthKey;
    return {
      amountCents: e.amount_cents,
      recurrence: e.recurrence,
      deductibility: (e.deductibility as "full" | "partial" | "none") ?? "full",
      deductiblePercent: e.deductible_percent ?? 100,
      expenseMonthKey,
    };
  });

  const months = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

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

  const q = quarterForDate(new Date());
  let qTotals = { cashCents: 0, bizumCents: 0, cardCents: 0 };
  for (const mk of q.monthKeys) {
    const b = monthMap.get(mk);
    if (!b) continue;
    qTotals.cashCents += b.cashCents;
    qTotals.bizumCents += b.bizumCents;
    qTotals.cardCents += b.cardCents;
  }

  const deductibleQ = deductibleQuarterTotalCents(expenseInputs, q.monthKeys);

  const simulation = simulateQuarter({
    settings,
    ticketTotals: qTotals,
    deductibleExpensesQuarterTtcCents: deductibleQ,
  });

  const calendarYear = now.getFullYear();
  const currentQ = quarterForDate(now).quarter;

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
    const ded = deductibleQuarterTotalCents(expenseInputs, mks);
    const simQ = simulateQuarter({
      settings,
      ticketTotals: { cashCents, bizumCents, cardCents },
      deductibleExpensesQuarterTtcCents: ded,
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

  return NextResponse.json({
    ok: true,
    calendarYear,
    currentQuarter: currentQ,
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
    },
    quarter: q.label,
    chart,
    simulation: {
      declareCashPercent: simulation.declareCashPercent,
      realTotalEuros: eurosFromCents(simulation.realTotalCents),
      officialSalesEuros: eurosFromCents(simulation.officialSalesTtcCents),
      ivaToPayEuros: eurosFromCents(simulation.iva303ToPayCents),
      irpfEuros: eurosFromCents(simulation.irpf130Cents),
      model115Euros: eurosFromCents(simulation.model115Cents),
      totalTaxesEuros: eurosFromCents(simulation.totalTaxesCents),
      netAfterTaxesEuros: eurosFromCents(simulation.netAfterTaxesCents),
      cashPocketEuros: eurosFromCents(simulation.cashPocketCents),
      liquidityAlert: simulation.liquidityAlert,
      liquidityGapEuros: eurosFromCents(Math.max(0, simulation.liquidityGapCents)),
    },
  });
}
